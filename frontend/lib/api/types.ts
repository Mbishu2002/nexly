/* Domain types returned by the API.
 *
 * Every string here is ALREADY RESOLVED to the requested locale — screens never
 * see a `Localized` object. The mock adapter resolves fixtures; a real backend
 * resolves via `Accept-Language`. Both honour the same contract, so swapping
 * adapters requires no screen changes. */

import type { IconName } from "@/components/ui";

export type Locale = "en" | "fr";

/** A string that exists in both locales. Fixtures use this; DTOs never do. */
export type Localized = { en: string; fr: string };

export type RequestOptions = { locale: Locale };

/* ---------- Catalogue ---------- */

export type Language = {
  slug: string;
  name: string;
  region: string;
  tutors: number;
  blurb: string;
  icon: IconName;
  popular: boolean;
};

export type Skill = { label: string; level: string };

export type Teacher = {
  id: string;
  name: string;
  /** Portrait URL. Optional: the UI falls back to initials. */
  avatar?: string;
  headline: string;
  city: string;
  badge: string;
  badgeIcon: IconName;
  rating: number;
  reviews: number;
  skills: Skill[];
  tags: string[];
  availability: { label: string; value: string; note: string; icon: IconName };
  trial: string;
  sampleLabel: string;
  sampleIcon: IconName;
  languages: string[];
  credential: string;
};

export type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  when: string;
};

export type DiscoveryFilter = { id: string; label: string };

/* ---------- Learner ---------- */

export type Onboarding = {
  languages: Language[];
  motivations: { id: string; label: string }[];
  levels: { code: string; label: string; hint: string }[];
};

export type Course = {
  id: string;
  title: string;
  teacher: string;
  lessons: number;
  completed: number;
  minutes: number;
  level: string;
};

export type Lesson = {
  id: string;
  teacher: string;
  teacherId: string;
  avatar?: string;
  topic: string;
  date: string;
  time: string;
  tz: string;
  duration: number;
};

export type LessonStatus = "confirmed" | "pending" | "completed";

export type LessonMaterial = {
  id: string;
  label: string;
  meta: string;
  icon: IconName;
};

/** The full lesson record behind a row in the upcoming list. */
export type LessonDetail = {
  id: string;
  topic: string;
  /** 16:9 cover art. Optional -- the header falls back to a flat surface. */
  cover?: string;
  teacher: string;
  teacherId: string;
  avatar?: string;
  teacherHeadline: string;
  date: string;
  time: string;
  endTime: string;
  tz: string;
  duration: number;
  status: LessonStatus;
  statusLabel: string;
  language: string;
  level: string;
  lessonType: string;
  /** True once the classroom is open; drives Join vs a countdown. */
  joinable: boolean;
  countdown: string;
  objectives: string[];
  materials: LessonMaterial[];
  teacherNote: string;
  policy: string;
};

export type Message = { from: "me" | "them"; text: string; time: string };

export type Thread = {
  id: string;
  teacherId: string;
  name: string;
  avatar?: string;
  preview: string;
  time: string;
  unread: number;
  messages: Message[];
};

export type Student = {
  name: string;
  level: string;
  streak: number;
  minutesLearned: number;
  lessonsTaken: number;
  languages: string[];
  passCredits: number;
};

export type DaySlots = { day: string; date: string; slots: string[] };

export type LessonType = { id: string; label: string; duration: number; note: string };

/* ---------- Teacher ---------- */

export type TeacherProfile = {
  name: string;
  firstName: string;
  badge: string;
  status: string;
  rating: number;
  reviews: number;
  hoursThisMonth: number;
  sessionsToday: number;
  sessionsDone: number;
  sessionsUpcoming: number;
  learners: number;
};

export type NextSession = {
  inMinutes: number;
  at: string;
  latency: string;
  student: string;
  level: string;
  topic: string;
  progress: string;
};

export type SlotState = "done" | "next" | "open" | "blocked";

export type Slot = {
  id: string;
  start: string;
  end: string;
  state: SlotState;
  student?: string;
  studentMeta?: string;
  title: string;
  note?: string;
  noteIcon?: IconName;
  statusLabel: string;
};

export type WeekDay = { day: string; date: string; today: boolean };

export type RosterStatus = "active" | "pending" | "new" | "inactive";

export type Learner = {
  id: string;
  name: string;
  flag: string;
  course: string;
  status: RosterStatus;
  statusLabel: string;
  progressLabel: string;
  progress?: number;
  when: string;
  whenIcon: IconName;
  note?: string;
  noteKind?: "text" | "audio" | "goal" | "info";
  attachment?: { label: string; duration: string };
};

export type RosterFilter = { id: string; label: string; count: number };

export type Resource = { id: string; icon: IconName; title: string; hint: string };

export type Wallet = {
  available: number;
  escrow: number;
  monthTotal: number;
  sessionsCompleted: number;
  nextAutoPayout: string;
  monthLabel: string;
  trend: string;
};

export type PayoutAccount = {
  id: string;
  initial: string;
  name: string;
  tag: string;
  masked: string;
  verified: boolean;
};

export type RevenuePoint = { label: string; value: number };

export type RevenueSource = { id: string; label: string; share: number; amount: number };

export type Movement = {
  id: string;
  icon: IconName;
  title: string;
  meta: string;
  amount: number;
  state: string;
};

export type Earnings = {
  wallet: Wallet;
  accounts: PayoutAccount[];
  weekly: RevenuePoint[];
  sources: RevenueSource[];
  movements: Movement[];
};

/* ---------- Application ---------- */

export type ApplicationStep = { label: string; done: boolean; current: boolean };

export type Application = {
  steps: ApplicationStep[];
  video: { duration: string; quality: string; audio: string; file: string; size: string };
  guidance: string[];
  docs: { id: string; icon: IconName; title: string; hint: string; verified: boolean }[];
  languages: { name: string; level: string }[];
  basins: string[];
};

/* ---------- Live session ---------- */

export type VocabItem = { word: string; gloss: string };

export type SessionNote = { from: "teacher" | "me"; author: string; text: string };

export type ClassroomSession = {
  id: string;
  teacher: string;
  student: string;
  elapsedSeconds: number;
  lengthSeconds: number;
  latency: string;
  boardTitle: string;
  vocab: VocabItem[];
  phoneticGuide: { target: string; ipa: string; hint: string };
  notes: SessionNote[];
};

/* ---------- Review ---------- */

export type SessionSummary = {
  id: string;
  teacher: string;
  teacherId: string;
  credential: string;
  duration: number;
  subject: string;
  when: string;
  highlights: { id: string; label: string }[];
  remainingSessions: number;
};

/* ---------- Quiz ---------- */

export type QuizOption = { key: "A" | "B" | "C"; word: string; tone: string; meaning: string };

export type Question = {
  id: string;
  prompt: string;
  instruction: string;
  speaker: { name: string; credential: string };
  toneHint: { high: string; low: string };
  clipLength: string;
  options: QuizOption[];
  correct: "A" | "B" | "C";
  xp: number;
  successLabel: string;
  successHint: string;
  fact: { title: string; body: string };
};

export type Quiz = {
  id: string;
  title: string;
  hearts: number;
  startingXp: number;
  /** Index the drill opens on, so deep links can resume mid-exercise. */
  startIndex: number;
  questions: Question[];
};

/* ---------- Safety ---------- */

export type ReportReason = { id: string; label: string; detail: string };

export type Protection = {
  id: string;
  icon: IconName;
  label: string;
  detail: string;
  defaultOn: boolean;
};

export type ReportContext = {
  promise: { headline: string; body: string; sla: string; compliance: string };
  target: {
    kind: string;
    person: string;
    role: string;
    subject: string;
    ref: string;
    when: string;
    rtcRoom: string;
  };
  reasons: ReportReason[];
  protections: Protection[];
  minDetailChars: number;
  attachment: { name: string; size: string };
};

/* ---------- The contract ---------- */

/** Implemented by the mock adapter today and by the HTTP adapter later.
 *  Everything is async so swapping in real network calls changes nothing. */
export type NexlyApi = {
  getOnboarding(o: RequestOptions): Promise<Onboarding>;

  listTeachers(o: RequestOptions & { query?: string; filter?: string }): Promise<Teacher[]>;
  getTeacher(id: string, o: RequestOptions): Promise<Teacher | null>;
  listReviews(teacherId: string, o: RequestOptions): Promise<Review[]>;
  listDiscoveryFilters(o: RequestOptions): Promise<DiscoveryFilter[]>;

  getStudent(o: RequestOptions): Promise<Student>;
  listCourses(o: RequestOptions): Promise<Course[]>;
  listUpcomingLessons(o: RequestOptions): Promise<Lesson[]>;
  getLesson(id: string, o: RequestOptions): Promise<LessonDetail | null>;
  requestReschedule(input: { lessonId: string }, o: RequestOptions): Promise<{ ref: string; message: string }>;
  listThreads(o: RequestOptions): Promise<Thread[]>;
  getThread(id: string, o: RequestOptions): Promise<Thread | null>;
  /** Returns the updated thread, not the whole list: the only caller is the
   *  open conversation, and resending every thread per message is wasteful. */
  sendMessage(threadId: string, text: string, o: RequestOptions): Promise<Thread>;

  getAvailability(teacherId: string, o: RequestOptions): Promise<DaySlots[]>;
  listLessonTypes(o: RequestOptions): Promise<LessonType[]>;
  createBooking(input: {
    teacherId: string;
    type: string;
    date: string;
    slot: string;
  }): Promise<{ id: string }>;

  getTeacherProfile(o: RequestOptions): Promise<TeacherProfile>;
  getNextSession(o: RequestOptions): Promise<NextSession>;
  getWeek(o: RequestOptions): Promise<WeekDay[]>;
  listSlots(date: string, o: RequestOptions): Promise<Slot[]>;
  listLearners(o: RequestOptions & { status?: string; query?: string }): Promise<Learner[]>;
  listRosterFilters(o: RequestOptions): Promise<RosterFilter[]>;
  listTeacherResources(o: RequestOptions): Promise<Resource[]>;
  getEarnings(o: RequestOptions): Promise<Earnings>;
  requestPayout(input: { accountId: string; amount: number }): Promise<{ ref: string }>;

  getApplication(o: RequestOptions): Promise<Application>;
  submitApplication(): Promise<{ status: "pending" }>;

  getClassroomSession(id: string, o: RequestOptions): Promise<ClassroomSession>;
  getSessionSummary(id: string, o: RequestOptions): Promise<SessionSummary>;
  submitReview(input: {
    sessionId: string;
    rating: number;
    highlights: string[];
    comment: string;
    showProfile: boolean;
  }): Promise<{ id: string }>;

  getQuiz(id: string, o: RequestOptions): Promise<Quiz>;
  submitQuizResult(input: { quizId: string; xp: number; hearts: number }): Promise<{ xp: number }>;

  getReportContext(sessionId: string, o: RequestOptions): Promise<ReportContext>;
  submitReport(input: {
    sessionId: string;
    reason: string;
    details: string;
    protections: string[];
    attachment: boolean;
  }): Promise<{ ref: string }>;
};
