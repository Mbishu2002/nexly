"""Functional coverage of every endpoint the app calls."""

from datetime import timedelta

from tests.conftest import NOW

FR = {"Accept-Language": "fr"}
EN = {"Accept-Language": "en"}


# --------------------------------------------------------------------------
# Public
# --------------------------------------------------------------------------


def test_onboarding_is_public_and_bilingual(client):
    fr = client.get("/v1/onboarding", headers=FR).json()
    en = client.get("/v1/onboarding", headers=EN).json()

    assert [x["slug"] for x in fr["languages"]] == [x["slug"] for x in en["languages"]]
    assert fr["levels"][0]["label"] != en["levels"][0]["label"]
    assert any(x["popular"] for x in fr["languages"])


def test_teacher_list_hides_unpublished(client, seed):
    ids = [t["id"] for t in client.get("/v1/teachers", headers=EN).json()]
    assert "henriette-mbassi" in ids
    assert "hidden-teacher" not in ids


def test_teacher_search_and_filter(client, seed):
    assert len(client.get("/v1/teachers?q=henriette", headers=EN).json()) == 1
    assert client.get("/v1/teachers?q=nobodyhere", headers=EN).json() == []
    assert len(client.get("/v1/teachers?filter=top", headers=EN).json()) == 1


def test_filters_use_stable_ids_across_locales(client):
    fr = client.get("/v1/teachers/filters", headers=FR).json()
    en = client.get("/v1/teachers/filters", headers=EN).json()
    assert [f["id"] for f in fr] == [f["id"] for f in en]
    assert [f["label"] for f in fr] != [f["label"] for f in en]


def test_teacher_detail_and_reviews(client, seed):
    body = client.get("/v1/teachers/henriette-mbassi", headers=FR).json()
    assert body["headline"] == "Spécialiste en linguistique Douala & Ewondo"
    assert client.get("/v1/teachers/henriette-mbassi", headers=EN).json()["headline"] == (
        "Specialist in Douala & Ewondo linguistics"
    )
    assert client.get("/v1/teachers/nope", headers=EN).status_code == 404
    assert len(client.get("/v1/teachers/henriette-mbassi/reviews", headers=EN).json()) == 1


def test_teacher_payload_never_contains_a_price(client, seed):
    body = client.get("/v1/teachers/henriette-mbassi", headers=EN).json()
    assert not {"rate", "price", "amount", "cost"} & set(body)


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------


def test_register_login_and_me(client):
    created = client.post(
        "/v1/auth/register",
        json={"email": "New@Example.com", "password": "a-long-password", "name": "New User"},
    )
    assert created.status_code == 201
    token = created.json()["access_token"]

    assert client.post(
        "/v1/auth/register",
        json={"email": "new@example.com", "password": "a-long-password", "name": "Dup"},
    ).status_code == 409

    ok = client.post(
        "/v1/auth/login", json={"email": "new@example.com", "password": "a-long-password"}
    )
    assert ok.status_code == 200

    bad = client.post(
        "/v1/auth/login", json={"email": "new@example.com", "password": "wrong"}
    )
    assert bad.status_code == 401
    # Unknown address must look identical to a wrong password.
    ghost = client.post(
        "/v1/auth/login", json={"email": "ghost@example.com", "password": "wrong"}
    )
    assert ghost.status_code == bad.status_code

    me = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["name"] == "New User"


def test_oauth_rejects_a_forged_token(client):
    """An unverified JWT is attacker-supplied JSON; it must not sign anyone in."""
    for provider in ("google", "apple"):
        res = client.post(f"/v1/auth/{provider}", json={"idToken": "not.a.real.token"})
        assert res.status_code == 401


def test_protected_routes_require_a_token(client):
    for path in (
        "/v1/me/student",
        "/v1/me/courses",
        "/v1/me/lessons",
        "/v1/me/threads",
        "/v1/me/application",
        "/v1/me/teacher",
    ):
        assert client.get(path).status_code == 401, path


# --------------------------------------------------------------------------
# Learner
# --------------------------------------------------------------------------


def test_student_profile_and_courses(client, as_student):
    me = client.get("/v1/me/student", headers={**as_student, **EN}).json()
    assert me["passCredits"] == 3
    assert me["streak"] == 5

    courses = client.get("/v1/me/courses", headers={**as_student, **FR}).json()
    assert courses[0]["title"] == "Douala — fondations"
    assert courses[0]["completed"] == 11


def test_upcoming_lessons_exclude_the_past(client, as_student):
    rows = client.get("/v1/me/lessons", headers={**as_student, **EN}).json()
    ids = [r["id"] for r in rows]
    assert "lesson-soon" in ids and "lesson-later" in ids
    assert "lesson-past" not in ids
    # Soonest first.
    assert ids[0] == "lesson-soon"


def test_lesson_detail_localised_and_joinable_window(client, as_student):
    soon = client.get("/v1/me/lessons/lesson-soon", headers={**as_student, **FR}).json()
    assert soon["topic"] == "Douala — salutations"
    assert soon["joinable"] is True
    assert soon["materials"][0]["label"] == "Fiche"
    assert soon["policy"].startswith("Annulation")

    later = client.get("/v1/me/lessons/lesson-later", headers={**as_student, **EN}).json()
    assert later["joinable"] is False


def test_lesson_detail_is_scoped_to_its_owner(client, as_outsider):
    assert client.get(
        "/v1/me/lessons/lesson-soon", headers={**as_outsider, **EN}
    ).status_code == 404


def test_reschedule_marks_pending(client, as_student):
    res = client.post(
        "/v1/me/lessons/reschedule",
        json={"lessonId": "lesson-later"},
        headers={**as_student, **EN},
    )
    assert res.status_code == 200
    assert res.json()["ref"].startswith("RS-")
    after = client.get("/v1/me/lessons/lesson-later", headers={**as_student, **EN}).json()
    assert after["status"] == "pending"


# --------------------------------------------------------------------------
# Messaging
# --------------------------------------------------------------------------


def test_threads_list_detail_and_send(client, as_student):
    threads = client.get("/v1/me/threads", headers={**as_student, **EN}).json()
    assert threads[0]["name"] == "Dr. Henriette Mbassi"
    assert threads[0]["unread"] == 1

    opened = client.get("/v1/me/threads/thread-1", headers={**as_student, **EN}).json()
    # Opening marks the other side read.
    assert opened["unread"] == 0
    assert [m["from"] for m in opened["messages"]] == ["them", "me"]

    sent = client.post(
        "/v1/me/threads/thread-1/messages",
        json={"text": "Merci !"},
        headers={**as_student, **EN},
    )
    assert sent.status_code == 201
    assert sent.json()["messages"][-1] == {
        **sent.json()["messages"][-1],
        "from": "me",
        "text": "Merci !",
    }


def test_thread_is_scoped_to_its_owner(client, as_outsider):
    assert client.get(
        "/v1/me/threads/thread-1", headers={**as_outsider, **EN}
    ).status_code == 404


def test_blocking_stops_delivery(client, db, seed, as_student):
    from app.models import Block

    db.add(Block(id="b-1", blocker_id=seed["student"].id,
                 blocked_id=seed["teacher_user"].id))
    db.commit()

    res = client.post(
        "/v1/me/threads/thread-1/messages",
        json={"text": "hello?"},
        headers={**as_student, **EN},
    )
    assert res.status_code == 403


# --------------------------------------------------------------------------
# Booking
# --------------------------------------------------------------------------


def test_lesson_types_are_localised(client):
    fr = client.get("/v1/lesson-types", headers=FR).json()
    en = client.get("/v1/lesson-types", headers=EN).json()
    assert [x["id"] for x in fr] == [x["id"] for x in en]
    assert fr[0]["label"] == "Séance d'essai"
    assert en[0]["label"] == "Trial session"


def test_availability_lists_only_free_slots(client, seed):
    days = client.get(
        "/v1/teachers/henriette-mbassi/availability", headers=EN
    ).json()
    assert len(days) == 1
    # 18:00 is held, so it must not be offered.
    assert days[0]["slots"] == ["16:00", "17:00"]


def test_booking_spends_a_credit_and_claims_the_slot(client, db, seed, as_student):
    day = (NOW + timedelta(days=1)).date().isoformat()
    res = client.post(
        "/v1/bookings",
        json={"teacherId": "henriette-mbassi", "type": "single",
              "date": day, "slot": "16:00"},
        headers={**as_student, **EN},
    )
    assert res.status_code == 201

    db.expire_all()
    assert client.get("/v1/me/student", headers={**as_student, **EN}).json()["passCredits"] == 2

    # The slot is gone from availability...
    left = client.get("/v1/teachers/henriette-mbassi/availability", headers=EN).json()
    assert left[0]["slots"] == ["17:00"]
    # ...and booking it again is a conflict, not a double sale.
    again = client.post(
        "/v1/bookings",
        json={"teacherId": "henriette-mbassi", "type": "single",
              "date": day, "slot": "16:00"},
        headers={**as_student, **EN},
    )
    assert again.status_code == 409


def test_booking_rejects_unknown_inputs(client, seed, as_student):
    day = (NOW + timedelta(days=1)).date().isoformat()
    assert client.post(
        "/v1/bookings",
        json={"teacherId": "nope", "type": "single", "date": day, "slot": "16:00"},
        headers={**as_student, **EN},
    ).status_code == 404
    assert client.post(
        "/v1/bookings",
        json={"teacherId": "henriette-mbassi", "type": "wat",
              "date": day, "slot": "16:00"},
        headers={**as_student, **EN},
    ).status_code == 400


def test_booking_without_credits_is_refused(client, db, seed, as_student):
    seed["student"].pass_credits = 0
    db.commit()
    day = (NOW + timedelta(days=1)).date().isoformat()
    res = client.post(
        "/v1/bookings",
        json={"teacherId": "henriette-mbassi", "type": "single",
              "date": day, "slot": "16:00"},
        headers={**as_student, **EN},
    )
    assert res.status_code == 402
    # The message must not offer a way to buy, per the no-checkout rule.
    assert "buy" not in res.json()["detail"].lower()
    assert "fcfa" not in res.json()["detail"].lower()


# --------------------------------------------------------------------------
# Live session
# --------------------------------------------------------------------------


def test_classroom_state(client, as_student):
    body = client.get(
        "/v1/sessions/lesson-soon/classroom", headers={**as_student, **FR}
    ).json()
    assert body["boardTitle"] == "Salutations"
    assert body["vocab"][0]["gloss"] == "Bonjour"
    assert body["phoneticGuide"]["hint"] == "ton bas"
    assert body["notes"][0]["from"] == "teacher"
    assert body["lengthSeconds"] == 3000


def test_classroom_is_closed_to_non_participants(client, as_outsider):
    assert client.get(
        "/v1/sessions/lesson-soon/classroom", headers={**as_outsider, **EN}
    ).status_code == 403


def test_livekit_token_requires_configuration(client, as_student):
    """Unconfigured LiveKit must fail loudly, not hand out an unsigned token."""
    res = client.post("/v1/sessions/lesson-soon/token", headers=as_student)
    assert res.status_code == 503


def test_livekit_token_is_signed_and_scoped(client, as_student, monkeypatch):
    from jose import jwt

    from app.core import config
    from app.services import livekit

    monkeypatch.setattr(config.settings, "livekit_api_key", "devkey")
    monkeypatch.setattr(config.settings, "livekit_api_secret", "devsecret-devsecret")
    monkeypatch.setattr(livekit.settings, "livekit_api_key", "devkey")
    monkeypatch.setattr(livekit.settings, "livekit_api_secret", "devsecret-devsecret")

    res = client.post("/v1/sessions/lesson-soon/token", headers=as_student)
    assert res.status_code == 200
    body = res.json()
    assert body["room"] == "lesson-lesson-soon"

    claims = jwt.decode(body["token"], "devsecret-devsecret", algorithms=["HS256"])
    assert claims["iss"] == "devkey"
    assert claims["sub"] == "u-student"
    # The grant must name this room only.
    assert claims["video"]["room"] == "lesson-lesson-soon"
    assert claims["video"]["roomJoin"] is True


def test_classroom_not_open_until_the_window(client, as_student, monkeypatch):
    from app.core import config
    from app.services import livekit

    monkeypatch.setattr(config.settings, "livekit_api_key", "devkey")
    monkeypatch.setattr(config.settings, "livekit_api_secret", "devsecret-devsecret")
    monkeypatch.setattr(livekit.settings, "livekit_api_key", "devkey")
    monkeypatch.setattr(livekit.settings, "livekit_api_secret", "devsecret-devsecret")

    res = client.post("/v1/sessions/lesson-later/token", headers=as_student)
    assert res.status_code == 425


def test_join_returns_token_and_state_together(client, as_student, monkeypatch):
    from app.core import config
    from app.services import livekit

    monkeypatch.setattr(config.settings, "livekit_api_key", "devkey")
    monkeypatch.setattr(config.settings, "livekit_api_secret", "devsecret-devsecret")
    monkeypatch.setattr(livekit.settings, "livekit_api_key", "devkey")
    monkeypatch.setattr(livekit.settings, "livekit_api_secret", "devsecret-devsecret")

    body = client.post(
        "/v1/sessions/lesson-soon/join", headers={**as_student, **EN}
    ).json()
    assert body["token"] and body["session"]["id"] == "lesson-soon"


def test_livekit_webhook_completes_lesson_and_releases_escrow(client, db, seed):
    res = client.post(
        "/v1/sessions/livekit/webhook",
        json={"event": "room_finished", "room": "lesson-lesson-soon"},
    )
    assert res.status_code == 200

    db.expire_all()
    from app.models import LedgerEntry, Lesson

    assert db.get(Lesson, "lesson-soon").status == "completed"
    entry = db.get(LedgerEntry, "led-2")
    assert entry.state == "payable"


def test_livekit_webhook_ignores_other_events(client):
    body = client.post(
        "/v1/sessions/livekit/webhook",
        json={"event": "participant_joined", "room": "lesson-lesson-soon"},
    ).json()
    assert body["status"] == "ignored"


# --------------------------------------------------------------------------
# Wrap-up and moderation
# --------------------------------------------------------------------------


def test_summary_then_review_updates_rating(client, db, seed, as_student):
    summary = client.get(
        "/v1/sessions/lesson-past/summary", headers={**as_student, **FR}
    ).json()
    assert summary["teacherId"] == "henriette-mbassi"
    assert summary["remainingSessions"] == 3
    assert summary["highlights"][0]["label"] == "Explications claires"

    res = client.post(
        "/v1/sessions/lesson-past/review",
        json={"sessionId": "lesson-past", "rating": 5,
              "highlights": ["clarity"], "comment": "Super", "showProfile": True},
        headers={**as_student, **EN},
    )
    assert res.status_code == 201

    db.expire_all()
    assert seed["teacher"].reviews_count == 125
    # Reviewing twice must not stack.
    assert client.post(
        "/v1/sessions/lesson-past/review",
        json={"sessionId": "lesson-past", "rating": 1,
              "highlights": [], "comment": "", "showProfile": True},
        headers={**as_student, **EN},
    ).status_code == 409


def test_private_review_is_not_published(client, db, seed, as_student):
    from app.models import Review

    before = db.query(Review).count()
    client.post(
        "/v1/sessions/lesson-past/review",
        json={"sessionId": "lesson-past", "rating": 2,
              "highlights": [], "comment": "Private note", "showProfile": False},
        headers={**as_student, **EN},
    )
    assert db.query(Review).count() == before


def test_teacher_cannot_review_their_own_session(client, as_teacher):
    assert client.post(
        "/v1/sessions/lesson-past/review",
        json={"sessionId": "lesson-past", "rating": 5,
              "highlights": [], "comment": "", "showProfile": True},
        headers={**as_teacher, **EN},
    ).status_code == 403


def test_report_context_is_localised(client, as_student):
    fr = client.get(
        "/v1/sessions/lesson-past/report-context", headers={**as_student, **FR}
    ).json()
    en = client.get(
        "/v1/sessions/lesson-past/report-context", headers={**as_student, **EN}
    ).json()

    assert [r["id"] for r in fr["reasons"]] == [r["id"] for r in en["reasons"]]
    assert fr["promise"]["sla"] == "Réponse sous 24 heures"
    assert fr["target"]["person"] == "Dr. Henriette Mbassi"
    assert fr["minDetailChars"] > 0


def test_report_requires_a_real_reason_and_enough_detail(client, as_student):
    assert client.post(
        "/v1/sessions/lesson-past/reports",
        json={"sessionId": "lesson-past", "reason": "made-up", "details": "x" * 80},
        headers={**as_student, **EN},
    ).status_code == 400

    assert client.post(
        "/v1/sessions/lesson-past/reports",
        json={"sessionId": "lesson-past", "reason": "harassment", "details": "too short"},
        headers={**as_student, **EN},
    ).status_code == 422


def test_report_blocks_immediately_when_asked(client, db, seed, as_student):
    from app.models import Block

    res = client.post(
        "/v1/sessions/lesson-past/reports",
        json={
            "sessionId": "lesson-past",
            "reason": "harassment",
            "details": "They repeatedly made me uncomfortable during the session.",
            "protections": ["block"],
        },
        headers={**as_student, **EN},
    )
    assert res.status_code == 201
    assert res.json()["ref"].startswith("NK-")

    blocked = (
        db.query(Block)
        .filter(Block.blocker_id == seed["student"].id,
                Block.blocked_id == seed["teacher_user"].id)
        .one_or_none()
    )
    assert blocked is not None, "a requested block must take effect before triage"


# --------------------------------------------------------------------------
# Quizzes
# --------------------------------------------------------------------------


def test_quiz_is_localised(client, as_student):
    fr = client.get("/v1/quizzes/douala-foundations", headers={**as_student, **FR}).json()
    en = client.get("/v1/quizzes/douala-foundations", headers={**as_student, **EN}).json()

    assert fr["questions"][0]["prompt"] == "Quel mot entendez-vous ?"
    assert en["questions"][0]["prompt"] == "Which word do you hear?"
    assert fr["questions"][0]["options"][0]["meaning"] == "bonjour"
    assert fr["questions"][0]["correct"] == "A"


def test_quiz_xp_is_clamped_server_side(client, as_student):
    """The client is a UI; an unchecked xp field would be editable."""
    res = client.post(
        "/v1/quizzes/douala-foundations/results",
        json={"quizId": "douala-foundations", "xp": 999_999, "hearts": 3},
        headers={**as_student, **EN},
    )
    assert res.status_code == 200
    assert res.json()["xp"] == 10  # the quiz is worth 10, not 999,999


def test_unknown_quiz_is_404(client, as_student):
    assert client.get(
        "/v1/quizzes/nope", headers={**as_student, **EN}
    ).status_code == 404


# --------------------------------------------------------------------------
# Teacher portal
# --------------------------------------------------------------------------


def test_teacher_routes_reject_learners(client, as_student):
    for path in ("/v1/me/teacher", "/v1/me/teacher/earnings", "/v1/me/teacher/slots"):
        assert client.get(path, headers={**as_student, **EN}).status_code == 403, path


def test_teacher_profile_and_next_session(client, as_teacher):
    profile = client.get("/v1/me/teacher", headers={**as_teacher, **EN}).json()
    assert profile["firstName"] == "Henriette"
    assert profile["sessionsDone"] == 1
    assert profile["sessionsUpcoming"] == 2
    assert profile["learners"] == 1

    nxt = client.get("/v1/me/teacher/next-session", headers={**as_teacher, **EN}).json()
    assert nxt["student"] == "Franck Bishu"
    assert nxt["inMinutes"] <= 5


def test_week_marks_today_once(client, as_teacher):
    week = client.get("/v1/me/teacher/week", headers={**as_teacher, **EN}).json()
    assert len(week) == 7
    assert sum(1 for d in week if d["today"]) == 1


def test_slots_and_roster(client, as_teacher):
    day = (NOW + timedelta(days=1)).date().isoformat()
    slots = client.get(
        f"/v1/me/teacher/slots?day={day}", headers={**as_teacher, **EN}
    ).json()
    assert len(slots) == 3
    assert {s["state"] for s in slots} <= {"done", "next", "open", "blocked"}

    learners = client.get("/v1/me/teacher/learners", headers={**as_teacher, **EN}).json()
    assert learners[0]["name"] == "Franck Bishu"

    filters = client.get(
        "/v1/me/teacher/learners/filters", headers={**as_teacher, **EN}
    ).json()
    assert {f["id"] for f in filters} >= {"all", "active"}
    assert next(f for f in filters if f["id"] == "all")["count"] == 1


def test_resources_are_localised(client, as_teacher):
    fr = client.get("/v1/me/teacher/resources", headers={**as_teacher, **FR}).json()
    en = client.get("/v1/me/teacher/resources", headers={**as_teacher, **EN}).json()
    assert [r["id"] for r in fr] == [r["id"] for r in en]
    assert fr[0]["title"] == "Plans de leçon"


def test_earnings_come_from_the_ledger(client, as_teacher):
    body = client.get("/v1/me/teacher/earnings", headers={**as_teacher, **EN}).json()
    assert body["wallet"]["available"] == 5525   # the one payable entry
    assert body["wallet"]["escrow"] == 5525      # the one held entry
    assert len(body["weekly"]) == 7
    assert len(body["accounts"]) == 2


def test_payout_moves_entries_and_validates(client, db, as_teacher):
    # Unverified destination is refused.
    assert client.post(
        "/v1/me/teacher/payouts",
        json={"accountId": "acct-2", "amount": 1000},
        headers={**as_teacher, **EN},
    ).status_code == 409

    # More than the balance is refused.
    assert client.post(
        "/v1/me/teacher/payouts",
        json={"accountId": "acct-1", "amount": 999_999},
        headers={**as_teacher, **EN},
    ).status_code == 409

    ok = client.post(
        "/v1/me/teacher/payouts",
        json={"accountId": "acct-1", "amount": 5525},
        headers={**as_teacher, **EN},
    )
    assert ok.status_code == 201
    assert ok.json()["ref"].startswith("WD-")

    db.expire_all()
    after = client.get("/v1/me/teacher/earnings", headers={**as_teacher, **EN}).json()
    assert after["wallet"]["available"] == 0
    # Escrow is untouched: held money is not withdrawable.
    assert after["wallet"]["escrow"] == 5525


# --------------------------------------------------------------------------
# Teacher application
# --------------------------------------------------------------------------


def test_application_starts_as_a_draft_and_submits(client, as_outsider):
    body = client.get("/v1/me/application", headers={**as_outsider, **EN}).json()
    assert len(body["steps"]) == 4
    assert body["steps"][0]["current"] is True
    assert body["guidance"]

    res = client.post("/v1/me/application/submit", headers={**as_outsider, **EN})
    assert res.status_code == 202
    assert res.json()["status"] == "pending"

    after = client.get("/v1/me/application", headers={**as_outsider, **EN}).json()
    assert after["steps"][-1]["current"] is True


def test_submitting_an_application_does_not_publish_a_teacher(client, db, as_outsider):
    client.post("/v1/me/application/submit", headers={**as_outsider, **EN})
    ids = [t["id"] for t in client.get("/v1/teachers", headers=EN).json()]
    assert "hidden-teacher" not in ids


def test_livekit_webhook_accepts_the_real_payload_shape(client, db, seed):
    """LiveKit sends `room` as an object, not a bare name."""
    res = client.post(
        "/v1/sessions/livekit/webhook",
        json={"event": "room_finished",
              "room": {"sid": "RM_abc", "name": "lesson-lesson-later"}},
    )
    assert res.json()["status"] == "ok"

    db.expire_all()
    from app.models import Lesson

    assert db.get(Lesson, "lesson-later").status == "completed"


def test_livekit_webhook_ignores_unknown_rooms(client):
    body = client.post(
        "/v1/sessions/livekit/webhook",
        json={"event": "room_finished", "room": {"name": "lesson-does-not-exist"}},
    ).json()
    assert body["status"] == "ignored"
