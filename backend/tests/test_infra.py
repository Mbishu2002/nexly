"""Moderation, media, notifications, analytics, groups and the worker jobs."""

from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import settings
from app.models import (
    DeviceToken,
    LedgerEntry,
    Lesson,
    LessonParticipant,
    MediaAsset,
    ModerationFlag,
    NotificationLog,
)
from app.services import analytics, moderation, notify, storage

EN = {"Accept-Language": "en"}


# --------------------------------------------------------------------------
# Moderation
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "pay me directly on momo",
        "envoie sur orange money directement",
    ],
)
def test_off_platform_payment_is_blocked(text):
    verdict = moderation.classify_text(text)
    assert verdict.category == "off_platform_payment"
    assert verdict.blocked


@pytest.mark.parametrize(
    "text",
    [
        "my number is 677 12 34 56",
        "+237 699887766",
        "add me on WhatsApp",
    ],
)
def test_contact_exchange_is_flagged_but_not_blocked(text):
    verdict = moderation.classify_text(text)
    assert verdict.flagged, text
    # Sharing a number is worth a look, not an automatic block.
    assert not verdict.blocked, text


@pytest.mark.parametrize(
    "text",
    [
        "Bonjour ! Prêt pour la leçon de demain ?",
        "I practised the tones for 20 minutes today.",
        "Merci beaucoup, à jeudi.",
        "",
        "   ",
    ],
)
def test_ordinary_messages_are_untouched(text):
    verdict = moderation.classify_text(text)
    assert not verdict.flagged
    assert not verdict.blocked


def test_flag_is_recorded_for_a_human(db, seed):
    verdict = moderation.classify_text("pay me directly on momo")
    moderation.record_flag(
        db, subject_type="message", subject_id="x", user_id="u-student", verdict=verdict
    )
    db.commit()

    flag = db.query(ModerationFlag).one()
    assert flag.status == "open"           # nothing is auto-actioned
    assert flag.source == "heuristic"
    assert 0 < float(flag.score) <= 1


@pytest.mark.asyncio
async def test_remote_classifier_falls_back_to_heuristic(monkeypatch):
    """An outage must not mean 'everything is fine'."""
    monkeypatch.setattr(settings, "moderation_api_url", "https://moderation.invalid/x")
    verdict = await moderation.classify_text_remote("pay me directly on momo")
    assert verdict.blocked
    assert verdict.source == "heuristic"


# --------------------------------------------------------------------------
# Storage
# --------------------------------------------------------------------------


def test_upload_validation():
    storage.validate_upload("homework_audio", "audio/mpeg", 1024)

    with pytest.raises(ValueError):
        storage.validate_upload("homework_audio", "application/x-msdownload", 1024)
    with pytest.raises(ValueError):
        storage.validate_upload("nonsense", "audio/mpeg", 1024)
    with pytest.raises(ValueError):
        storage.validate_upload("course_lesson", "video/mp4", settings.max_upload_bytes + 1)
    with pytest.raises(ValueError):
        storage.validate_upload("course_lesson", "video/mp4", 0)


def test_storage_key_ignores_the_uploaders_filename():
    """The filename is attacker-controlled; it must not become the key."""
    key = storage.build_key("course_lesson", "u-1", "../../etc/passwd")
    assert key.startswith("course_lesson/u-1/")
    assert ".." not in key
    assert "passwd" not in key

    # Two uploads of the same name never collide.
    a = storage.build_key("course_lesson", "u-1", "lesson.mp4")
    b = storage.build_key("course_lesson", "u-1", "lesson.mp4")
    assert a != b
    assert a.endswith(".mp4") and b.endswith(".mp4")


def test_upload_route_requires_configuration(client, as_student):
    """Unconfigured R2 must 503, not hand back a broken URL."""
    res = client.post(
        "/v1/media/uploads",
        json={"kind": "homework_audio", "filename": "a.m4a",
              "contentType": "audio/mp4", "sizeBytes": 2048},
        headers={**as_student, **EN},
    )
    assert res.status_code == 503


def test_upload_route_rejects_bad_input_before_touching_storage(client, as_student):
    res = client.post(
        "/v1/media/uploads",
        json={"kind": "homework_audio", "filename": "x.exe",
              "contentType": "application/x-msdownload", "sizeBytes": 10},
        headers={**as_student, **EN},
    )
    assert res.status_code == 400


def test_playback_is_scoped_to_the_owner(client, db, seed, as_outsider):
    db.add(
        MediaAsset(id="asset-1", owner_id="u-student", kind="homework_audio",
                   storage_key="homework_audio/u-student/abc.m4a",
                   content_type="audio/mp4", size_bytes=2048, status="ready")
    )
    db.commit()

    assert client.get("/v1/media/asset-1", headers={**as_outsider, **EN}).status_code == 403


def test_playback_refuses_unfinished_uploads(client, db, seed, as_student):
    db.add(
        MediaAsset(id="asset-2", owner_id="u-student", kind="homework_audio",
                   storage_key="homework_audio/u-student/pending.m4a",
                   content_type="audio/mp4", size_bytes=0, status="pending")
    )
    db.commit()

    assert client.get("/v1/media/asset-2", headers={**as_student, **EN}).status_code == 409


# --------------------------------------------------------------------------
# Device registration
# --------------------------------------------------------------------------


def test_device_registration_and_reassignment(client, db, seed, as_student, as_teacher):
    assert client.post(
        "/v1/me/devices",
        json={"token": "fcm-token-abc", "platform": "android"},
        headers={**as_student, **EN},
    ).status_code == 204

    row = db.query(DeviceToken).filter(DeviceToken.token == "fcm-token-abc").one()
    assert row.user_id == "u-student"

    # Same handset, different account: reassign rather than duplicate, or the
    # previous owner keeps getting the new owner's notifications.
    client.post(
        "/v1/me/devices",
        json={"token": "fcm-token-abc", "platform": "android"},
        headers={**as_teacher, **EN},
    )
    db.expire_all()
    assert db.query(DeviceToken).filter(DeviceToken.token == "fcm-token-abc").count() == 1
    assert db.query(DeviceToken).filter(DeviceToken.token == "fcm-token-abc").one().user_id == (
        "u-teacher"
    )


def test_unregister_deactivates(client, db, seed, as_student):
    client.post(
        "/v1/me/devices",
        json={"token": "fcm-token-xyz", "platform": "ios"},
        headers={**as_student, **EN},
    )
    assert client.delete(
        "/v1/me/devices/fcm-token-xyz", headers={**as_student, **EN}
    ).status_code == 204

    db.expire_all()
    assert db.query(DeviceToken).filter(DeviceToken.token == "fcm-token-xyz").one().is_active is (
        False
    )


# --------------------------------------------------------------------------
# Notifications
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_senders_are_safe_when_unconfigured(db, seed):
    """A missing key must skip, not raise into the caller."""
    email = await notify.send_email(to="x@example.com", subject="hi", html="<p>hi</p>")
    assert email.skipped and not email.ok

    push = await notify.send_push(db, user_id="u-student", title="hi", body="there")
    assert not push.ok  # no devices registered


def test_dedupe_log(db, seed):
    assert not notify.already_sent(
        db, user_id="u-student", kind="lesson_reminder", dedupe_key="lesson-soon"
    )
    notify.record(
        db, user_id="u-student", kind="lesson_reminder", dedupe_key="lesson-soon",
        channel="push", status="sent",
    )
    db.commit()
    assert notify.already_sent(
        db, user_id="u-student", kind="lesson_reminder", dedupe_key="lesson-soon"
    )


# --------------------------------------------------------------------------
# Analytics
# --------------------------------------------------------------------------


def test_analytics_strips_content_fields():
    cleaned = analytics._clean(
        {
            "lessonId": "l-1",
            "count": 3,
            "text": "a private message",
            "email": "someone@example.com",
            "phone": "677123456",
            "comment": "a review body",
        }
    )
    assert cleaned == {"lessonId": "l-1", "count": 3}


@pytest.mark.asyncio
async def test_capture_is_a_noop_without_a_key():
    assert await analytics.capture("u-1", "lesson_booked", {"lessonId": "l-1"}) is False


# --------------------------------------------------------------------------
# Group sessions
# --------------------------------------------------------------------------


@pytest.fixture(name="group")
def group_fixture(db, seed):
    lesson = Lesson(
        id="group-1",
        teacher_id="henriette-mbassi",
        student_id="u-teacher",   # placeholder owner; the roster is what counts
        topic_fr="Atelier Douala", topic_en="Douala workshop",
        starts_at=datetime.now(UTC) + timedelta(days=1),
        duration_minutes=60,
        status="confirmed",
        capacity=2,
    )
    db.add(lesson)
    db.commit()
    return lesson


def test_group_listing_and_join(client, db, seed, group, as_student):
    rows = client.get("/v1/group-sessions", headers={**as_student, **EN}).json()
    assert rows[0]["id"] == "group-1"
    assert rows[0]["seatsLeft"] == 2 and rows[0]["joined"] is False

    res = client.post("/v1/group-sessions/group-1/join", headers={**as_student, **EN})
    assert res.status_code == 201
    assert res.json()["seatsLeft"] == 1

    db.expire_all()
    assert client.get("/v1/me/student", headers={**as_student, **EN}).json()["passCredits"] == 2

    rows = client.get("/v1/group-sessions", headers={**as_student, **EN}).json()
    assert rows[0]["joined"] is True

    # Joining twice must not take a second credit.
    again = client.post("/v1/group-sessions/group-1/join", headers={**as_student, **EN})
    assert again.status_code == 409


def test_group_respects_capacity(client, db, seed, group, as_student):
    # Fill both seats with other people.
    db.add_all([
        LessonParticipant(lesson_id="group-1", user_id="u-outsider", state="booked"),
        LessonParticipant(lesson_id="group-1", user_id="u-teacher", state="booked"),
    ])
    db.commit()

    res = client.post("/v1/group-sessions/group-1/join", headers={**as_student, **EN})
    assert res.status_code == 409
    assert "full" in res.json()["detail"].lower()


def test_group_leave_refunds_before_the_start(client, db, seed, group, as_student):
    client.post("/v1/group-sessions/group-1/join", headers={**as_student, **EN})
    db.expire_all()

    res = client.post("/v1/group-sessions/group-1/leave", headers={**as_student, **EN})
    assert res.status_code == 200
    assert res.json()["seatsLeft"] == 2

    db.expire_all()
    assert client.get("/v1/me/student", headers={**as_student, **EN}).json()["passCredits"] == 3


def test_group_above_the_cap_is_refused(client, db, seed, group, as_student):
    group.capacity = settings.max_group_size + 1
    db.commit()
    res = client.post("/v1/group-sessions/group-1/join", headers={**as_student, **EN})
    assert res.status_code == 409
    assert "cap" in res.json()["detail"].lower()


def test_one_to_one_lessons_are_not_group_sessions(client, seed, as_student):
    rows = client.get("/v1/group-sessions", headers={**as_student, **EN}).json()
    assert "lesson-soon" not in [r["id"] for r in rows]
    assert client.post(
        "/v1/group-sessions/lesson-soon/join", headers={**as_student, **EN}
    ).status_code == 404


# --------------------------------------------------------------------------
# Worker jobs
# --------------------------------------------------------------------------


@pytest.fixture(name="worker_db")
def worker_db_fixture(engine, monkeypatch):
    """Point the worker's own SessionLocal at the test database."""
    from sqlalchemy.orm import sessionmaker

    import app.worker as worker

    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr(worker, "SessionLocal", TestSession)
    return TestSession


@pytest.mark.asyncio
async def test_reminders_are_sent_once(worker_db, db, seed):
    import app.worker as worker

    first = await worker.send_booking_reminders({})
    assert "reminder" in first

    logged = db.query(NotificationLog).filter(
        NotificationLog.kind == "lesson_reminder"
    ).count()
    assert logged > 0

    # A re-run must be a no-op, not a second buzz at 6am.
    await worker.send_booking_reminders({})
    db.expire_all()
    assert db.query(NotificationLog).filter(
        NotificationLog.kind == "lesson_reminder"
    ).count() == logged


@pytest.mark.asyncio
async def test_settle_ledger_only_releases_completed_lessons(worker_db, db, seed):
    import app.worker as worker

    held = db.get(LedgerEntry, "led-2")           # attached to lesson-soon
    lesson = db.get(Lesson, "lesson-soon")
    assert held.state == "held"

    # Not completed yet: nothing should move, however old it is.
    lesson.starts_at = datetime.now(UTC) - timedelta(days=10)
    db.commit()
    await worker.settle_ledger({})
    db.expire_all()
    assert db.get(LedgerEntry, "led-2").state == "held"

    # Completed and past the hold window: now it is payable.
    db.get(Lesson, "lesson-soon").status = "completed"
    db.commit()
    await worker.settle_ledger({})
    db.expire_all()
    assert db.get(LedgerEntry, "led-2").state == "payable"


@pytest.mark.asyncio
async def test_payout_batch_reports_without_moving_money(worker_db, db, seed):
    """Disbursement APIs are an open decision; the batch must not guess."""
    import app.worker as worker

    before = db.get(LedgerEntry, "led-1").state
    summary = await worker.run_payout_batch({})

    assert "5525" in summary
    db.expire_all()
    assert db.get(LedgerEntry, "led-1").state == before


@pytest.mark.asyncio
async def test_reap_abandoned_uploads(worker_db, db, seed):
    import app.worker as worker

    db.add_all([
        MediaAsset(id="stale", owner_id="u-student", kind="homework_audio",
                   storage_key="k/stale", status="pending",
                   created_at=datetime.now(UTC) - timedelta(hours=3)),
        MediaAsset(id="fresh", owner_id="u-student", kind="homework_audio",
                   storage_key="k/fresh", status="pending"),
        MediaAsset(id="done", owner_id="u-student", kind="homework_audio",
                   storage_key="k/done", status="ready",
                   created_at=datetime.now(UTC) - timedelta(days=5)),
    ])
    db.commit()

    assert await worker.reap_abandoned_uploads({}) == "reaped 1"
    db.expire_all()
    assert db.get(MediaAsset, "stale") is None
    assert db.get(MediaAsset, "fresh") is not None
    assert db.get(MediaAsset, "done") is not None


def test_worker_registers_its_jobs_and_crons():
    from app.worker import WorkerSettings

    names = {fn.__name__ for fn in WorkerSettings.functions}
    assert {"send_message_push", "send_booking_confirmation", "transcode_media"} <= names
    assert len(WorkerSettings.cron_jobs) == 4
