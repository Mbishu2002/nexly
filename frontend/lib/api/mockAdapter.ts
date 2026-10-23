/* Mock adapter: resolves fixture `Localized` fields to the requested locale and
 * returns the same DTOs the HTTP adapter will. Adds a little latency so screens
 * exercise their real loading states instead of rendering synchronously. */

import * as f from "./fixtures";
import type {
  Application,
  ClassroomSession,
  Course,
  DaySlots,
  DiscoveryFilter,
  Earnings,
  Language,
  Learner,
  Lesson,
  LessonDetail,
  LessonType,
  Locale,
  Localized,
  NexlyApi,
  NextSession,
  Onboarding,
  Question,
  Quiz,
  ReportContext,
  RequestOptions,
  Resource,
  Review,
  RosterFilter,
  SessionSummary,
  Slot,
  Student,
  Teacher,
  TeacherProfile,
  Thread,
  WeekDay,
} from "./types";

const LATENCY_MS = 180;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

/** Resolve one localized field. Plain strings pass through untouched, which
 *  lets fixtures leave locale-invariant values (names, refs) as bare strings. */
function s(value: Localized | string, locale: Locale): string {
  return typeof value === "string" ? value : value[locale];
}

/* ---------- Mutable session state ----------
 * Stands in for server-side state so optimistic writes survive a re-render.
 * A real adapter drops this entirely — the server owns it. */
let threadState = f.threads.map((t) => ({
  ...t,
  messages: t.messages.map((m) => ({ ...m })),
}));

/* ---------- Mappers ---------- */

const mapLanguage = (l: (typeof f.languages)[number], locale: Locale): Language => ({
  slug: l.slug,
  name: s(l.name, locale),
  region: s(l.region, locale),
  tutors: l.tutors,
  blurb: s(l.blurb, locale),
  icon: l.icon,
  popular: l.popular,
});

const mapTeacher = (t: (typeof f.teachers)[number], locale: Locale): Teacher => ({
  id: t.id,
  name: t.name,
  avatar: t.avatar,
  headline: s(t.headline, locale),
  city: t.city,
  credential: s(t.credential, locale),
  badge: s(t.badge, locale),
  badgeIcon: t.badgeIcon,
  rating: t.rating,
  reviews: t.reviews,
  skills: t.skills.map((k) => ({ label: s(k.label, locale), level: s(k.level, locale) })),
  tags: t.tags.map((g) => s(g, locale)),
  availability: {
    label: s(t.availability.label, locale),
    value: s(t.availability.value, locale),
    note: s(t.availability.note, locale),
    icon: t.availability.icon,
  },
  trial: s(t.trial, locale),
  sampleLabel: s(t.sampleLabel, locale),
  sampleIcon: t.sampleIcon,
  languages: t.languages,
});

const mapThread = (t: (typeof threadState)[number], locale: Locale): Thread => {
  const messages = t.messages.map((m) => ({
    from: m.from,
    text: s(m.text, locale),
    time: s(m.time, locale),
  }));
  return {
    id: t.id,
    teacherId: t.teacherId,
    name: t.name,
    avatar: t.avatar,
    preview: messages.length ? messages[messages.length - 1].text : "",
    time: s(t.time, locale),
    unread: t.unread,
    messages,
  };
};

const mapQuestion = (q: (typeof f.quiz.questions)[number], locale: Locale): Question => ({
  id: q.id,
  prompt: s(q.prompt, locale),
  instruction: s(q.instruction, locale),
  speaker: { name: q.speaker.name, credential: s(q.speaker.credential, locale) },
  toneHint: { high: s(q.toneHint.high, locale), low: s(q.toneHint.low, locale) },
  clipLength: q.clipLength,
  options: q.options.map((o) => ({
    key: o.key,
    word: o.word,
    tone: s(o.tone, locale),
    meaning: s(o.meaning, locale),
  })),
  correct: q.correct,
  xp: q.xp,
  successLabel: s(q.successLabel, locale),
  successHint: s(q.successHint, locale),
  fact: { title: s(q.fact.title, locale), body: s(q.fact.body, locale) },
});

/* ---------- Adapter ---------- */

export const mockAdapter: NexlyApi = {
  getOnboarding: ({ locale }): Promise<Onboarding> =>
    delay({
      languages: f.languages.map((l) => mapLanguage(l, locale)),
      motivations: f.motivations.map((m) => ({ id: m.id, label: s(m.label, locale) })),
      levels: f.levels.map((l) => ({
        code: l.code,
        label: s(l.label, locale),
        hint: s(l.hint, locale),
      })),
    }),

  listTeachers: ({ locale, query, filter }): Promise<Teacher[]> => {
    const q = (query ?? "").trim().toLowerCase();
    const list = f.teachers
      .map((t) => mapTeacher(t, locale))
      .filter((t) => {
        const matchesQuery =
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.headline.toLowerCase().includes(q) ||
          t.skills.some((k) => k.label.toLowerCase().includes(q)) ||
          t.tags.some((g) => g.toLowerCase().includes(q));

        // Filters are matched on stable ids, never on translated labels.
        const matchesFilter =
          !filter ||
          filter === "all" ||
          (filter === "cameroonian" && t.languages.some((l) => ["douala", "ewondo"].includes(l))) ||
          (filter === "bilingual" && t.skills.length >= 3) ||
          (filter === "exam" && f.teachers.find((x) => x.id === t.id)!.tags.some((g) => g.en === "Exam prep")) ||
          (filter === "top" && t.rating >= 4.95);

        return matchesQuery && matchesFilter;
      });
    return delay(list);
  },

  getTeacher: (id, { locale }): Promise<Teacher | null> => {
    const found = f.teachers.find((t) => t.id === id);
    return delay(found ? mapTeacher(found, locale) : null);
  },

  listReviews: (teacherId, { locale }): Promise<Review[]> =>
    delay(
      (f.reviews[teacherId] ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        text: s(r.text, locale),
        when: s(r.when, locale),
      })),
    ),

  listDiscoveryFilters: ({ locale }): Promise<DiscoveryFilter[]> =>
    delay(f.discoveryFilters.map((d) => ({ id: d.id, label: s(d.label, locale) }))),

  getStudent: ({ locale }): Promise<Student> =>
    delay({
      ...f.student,
      languages: f.student.languages.map((l) => s(l, locale)),
    }),

  listCourses: ({ locale }): Promise<Course[]> =>
    delay(f.courses.map((c) => ({ ...c, title: s(c.title, locale) }))),

  listUpcomingLessons: ({ locale }): Promise<Lesson[]> =>
    delay(
      f.upcomingLessons.map((l) => ({
        ...l,
        topic: s(l.topic, locale),
        date: s(l.date, locale),
      })),
    ),

  getLesson: (id, { locale }): Promise<LessonDetail | null> => {
    const l = f.lessonDetails.find((x) => x.id === id);
    if (!l) return delay(null);
    return delay({
      id: l.id,
      topic: s(l.topic, locale),
      cover: l.cover,
      teacher: l.teacher,
      teacherId: l.teacherId,
      avatar: l.avatar,
      teacherHeadline: s(l.teacherHeadline, locale),
      date: s(l.date, locale),
      time: l.time,
      endTime: l.endTime,
      tz: l.tz,
      duration: l.duration,
      status: l.status,
      statusLabel: s(l.statusLabel, locale),
      language: s(l.language, locale),
      level: s(l.level, locale),
      lessonType: s(l.lessonType, locale),
      joinable: l.joinable,
      countdown: s(l.countdown, locale),
      objectives: l.objectives.map((o) => s(o, locale)),
      materials: l.materials.map((m) => ({
        id: m.id,
        label: s(m.label, locale),
        meta: s(m.meta, locale),
        icon: m.icon,
      })),
      teacherNote: s(l.teacherNote, locale),
      policy: s(l.policy, locale),
    });
  },

  requestReschedule: ({ lessonId }, { locale }) =>
    delay({
      ref: `RS-${lessonId.toUpperCase()}`,
      message: s(
        {
          fr: "Demande envoyée. L'enseignant proposera de nouveaux créneaux.",
          en: "Request sent. Your teacher will propose new slots.",
        },
        locale,
      ),
    }),

  listThreads: ({ locale }): Promise<Thread[]> =>
    delay(threadState.map((t) => mapThread(t, locale))),

  getThread: (id, { locale }): Promise<Thread | null> => {
    const found = threadState.find((t) => t.id === id);
    return delay(found ? mapThread(found, locale) : null);
  },

  sendMessage: (threadId, text, { locale }): Promise<Thread> => {
    threadState = threadState.map((t) =>
      t.id === threadId
        ? {
            ...t,
            // A locale-invariant echo: the learner typed it in one language.
            messages: [...t.messages, { from: "me" as const, text: { fr: text, en: text }, time: { fr: "Maintenant", en: "Now" } }],
            time: { fr: "Maintenant", en: "Now" },
          }
        : t,
    );
    const updated = threadState.find((t) => t.id === threadId);
    if (!updated) throw new Error(`No such thread: ${threadId}`);
    return delay(mapThread(updated, locale));
  },

  getAvailability: (_teacherId, { locale }): Promise<DaySlots[]> =>
    delay(
      f.availability.default.map((d) => ({
        day: s(d.day, locale),
        date: d.date,
        slots: d.slots,
      })),
    ),

  listLessonTypes: ({ locale }): Promise<LessonType[]> =>
    delay(
      f.lessonTypes.map((t) => ({
        id: t.id,
        label: s(t.label, locale),
        duration: t.duration,
        note: s(t.note, locale),
      })),
    ),

  createBooking: (input) => delay({ id: `BK-${input.teacherId}-${input.date}-${input.slot}` }),

  getTeacherProfile: ({ locale }): Promise<TeacherProfile> =>
    delay({
      ...f.teacherProfile,
      badge: s(f.teacherProfile.badge, locale),
      status: s(f.teacherProfile.status, locale),
    }),

  getNextSession: ({ locale }): Promise<NextSession> =>
    delay({
      ...f.nextSession,
      latency: s(f.nextSession.latency, locale),
      topic: s(f.nextSession.topic, locale),
      progress: s(f.nextSession.progress, locale),
    }),

  getWeek: ({ locale }): Promise<WeekDay[]> =>
    delay(f.week.map((d) => ({ day: s(d.day, locale), date: d.date, today: d.today }))),

  listSlots: (date, { locale }): Promise<Slot[]> =>
    delay(
      (f.slots[date] ?? []).map((sl) => ({
        id: sl.id,
        start: sl.start,
        end: sl.end,
        state: sl.state,
        student: sl.student,
        studentMeta: sl.studentMeta ? s(sl.studentMeta, locale) : undefined,
        title: s(sl.title, locale),
        note: sl.note ? s(sl.note, locale) : undefined,
        noteIcon: sl.noteIcon,
        statusLabel: s(sl.statusLabel, locale),
      })),
    ),

  listLearners: ({ locale, status, query }): Promise<Learner[]> => {
    const q = (query ?? "").trim().toLowerCase();
    const list = f.learners
      .filter((l) => !status || status === "all" || l.status === status)
      .map((l) => ({
        id: l.id,
        name: l.name,
        flag: l.flag,
        course: s(l.course, locale),
        status: l.status,
        statusLabel: s(l.statusLabel, locale),
        progressLabel: s(l.progressLabel, locale),
        progress: l.progress,
        when: s(l.when, locale),
        whenIcon: l.whenIcon,
        note: l.note ? s(l.note, locale) : undefined,
        noteKind: l.noteKind,
        attachment: l.attachment,
      }))
      .filter((l) => !q || l.name.toLowerCase().includes(q) || l.course.toLowerCase().includes(q));
    return delay(list);
  },

  listRosterFilters: ({ locale }): Promise<RosterFilter[]> =>
    delay(f.rosterFilters.map((r) => ({ id: r.id, label: s(r.label, locale), count: r.count }))),

  listTeacherResources: ({ locale }): Promise<Resource[]> =>
    delay(
      f.teacherResources.map((r) => ({
        id: r.id,
        icon: r.icon,
        title: s(r.title, locale),
        hint: s(r.hint, locale),
      })),
    ),

  getEarnings: ({ locale }): Promise<Earnings> =>
    delay({
      wallet: {
        ...f.earnings.wallet,
        nextAutoPayout: s(f.earnings.wallet.nextAutoPayout, locale),
        monthLabel: s(f.earnings.wallet.monthLabel, locale),
        trend: s(f.earnings.wallet.trend, locale),
      },
      accounts: f.earnings.accounts.map((a) => ({ ...a, tag: s(a.tag, locale) })),
      weekly: f.earnings.weekly,
      sources: f.earnings.sources.map((src) => ({ ...src, label: s(src.label, locale) })),
      movements: f.earnings.movements.map((m) => ({
        ...m,
        title: s(m.title, locale),
        meta: s(m.meta, locale),
        state: s(m.state, locale),
      })),
    }),

  requestPayout: (input) => delay({ ref: `WD-${Math.floor(input.amount / 100)}` }),

  getApplication: ({ locale }): Promise<Application> =>
    delay({
      steps: f.application.steps.map((st) => ({ ...st, label: s(st.label, locale) })),
      video: {
        duration: s(f.application.video.duration, locale),
        quality: f.application.video.quality,
        audio: s(f.application.video.audio, locale),
        file: f.application.video.file,
        size: s(f.application.video.size, locale),
      },
      guidance: f.application.guidance.map((g) => s(g, locale)),
      docs: f.application.docs.map((d) => ({
        id: d.id,
        icon: d.icon,
        title: s(d.title, locale),
        hint: s(d.hint, locale),
        verified: d.verified,
      })),
      languages: f.application.languages.map((l) => ({
        name: s(l.name, locale),
        level: s(l.level, locale),
      })),
      basins: f.application.basins.map((b) => s(b, locale)),
    }),

  submitApplication: () => delay({ status: "pending" as const }),

  getClassroomSession: (id, { locale }): Promise<ClassroomSession> =>
    delay({
      ...f.classroomSession,
      id,
      latency: s(f.classroomSession.latency, locale),
      boardTitle: s(f.classroomSession.boardTitle, locale),
      vocab: f.classroomSession.vocab.map((v) => ({ word: v.word, gloss: s(v.gloss, locale) })),
      phoneticGuide: {
        ...f.classroomSession.phoneticGuide,
        hint: s(f.classroomSession.phoneticGuide.hint, locale),
      },
      notes: f.classroomSession.notes.map((n) => ({
        from: n.from,
        author: s(n.author, locale),
        text: s(n.text, locale),
      })),
    }),

  getSessionSummary: (id, { locale }): Promise<SessionSummary> =>
    delay({
      ...f.sessionSummary,
      id,
      credential: s(f.sessionSummary.credential, locale),
      subject: s(f.sessionSummary.subject, locale),
      when: s(f.sessionSummary.when, locale),
      highlights: f.sessionSummary.highlights.map((h) => ({ id: h.id, label: s(h.label, locale) })),
    }),

  submitReview: (input) => delay({ id: `RV-${input.sessionId}` }),

  getQuiz: (id, { locale }): Promise<Quiz> =>
    delay({
      id,
      title: s(f.quiz.title, locale),
      hearts: f.quiz.hearts,
      startingXp: f.quiz.startingXp,
      startIndex: f.quiz.startIndex,
      questions: f.quiz.questions.map((q) => mapQuestion(q, locale)),
    }),

  submitQuizResult: (input) => delay({ xp: input.xp }),

  getReportContext: (sessionId, { locale }): Promise<ReportContext> =>
    delay({
      promise: {
        headline: s(f.reportContext.promise.headline, locale),
        body: s(f.reportContext.promise.body, locale),
        sla: s(f.reportContext.promise.sla, locale),
        compliance: s(f.reportContext.promise.compliance, locale),
      },
      target: {
        kind: s(f.reportContext.target.kind, locale),
        person: f.reportContext.target.person,
        role: s(f.reportContext.target.role, locale),
        subject: s(f.reportContext.target.subject, locale),
        ref: sessionId.startsWith("#") ? sessionId : `#${sessionId}`,
        when: s(f.reportContext.target.when, locale),
        rtcRoom: f.reportContext.target.rtcRoom,
      },
      reasons: f.reportContext.reasons.map((r) => ({
        id: r.id,
        label: s(r.label, locale),
        detail: s(r.detail, locale),
      })),
      protections: f.reportContext.protections.map((p) => ({
        id: p.id,
        icon: p.icon,
        label: s(p.label, locale),
        detail: s(p.detail, locale),
        defaultOn: p.defaultOn,
      })),
      minDetailChars: f.reportContext.minDetailChars,
      attachment: f.reportContext.attachment,
    }),

  submitReport: (input) => delay({ ref: `${input.sessionId}` }),
};
