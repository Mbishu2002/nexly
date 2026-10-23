/* HTTP adapter — the real-backend implementation.
 *
 * Not wired up yet: there is no backend. It exists so the swap is a one-line
 * change in `index.ts` rather than a refactor, and so the wire format is
 * written down while the fixtures are still the source of truth.
 *
 * The server is expected to resolve copy from `Accept-Language`, exactly as the
 * mock adapter resolves it from `locale`. That is the whole contract: screens
 * receive plain, already-translated strings either way. */

import type { NexlyApi, RequestOptions } from "./types";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  { locale }: RequestOptions,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, path, "EXPO_PUBLIC_API_URL is not set — still on the mock adapter.");
  }

  const url = new URL(path, API_BASE_URL);
  for (const [k, v] of Object.entries(init?.query ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      "Accept-Language": locale,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, path, `${res.status} ${res.statusText} on ${path}`);
  }
  return (await res.json()) as T;
}

// `o` is optional because most mutations return locale-free data ({ ref },
// { xp }, ...). Pass it when the response contains user-facing copy.
const post = <T>(path: string, body: unknown, o: RequestOptions = { locale: "fr" }): Promise<T> =>
  request<T>(path, o, { method: "POST", body: JSON.stringify(body) });

export const httpAdapter: NexlyApi = {
  getOnboarding: (o) => request("/v1/onboarding", o),

  listTeachers: (o) =>
    request("/v1/teachers", o, { query: { q: o.query, filter: o.filter } }),
  getTeacher: (id, o) => request(`/v1/teachers/${id}`, o),
  listReviews: (id, o) => request(`/v1/teachers/${id}/reviews`, o),
  listDiscoveryFilters: (o) => request("/v1/teachers/filters", o),

  getStudent: (o) => request("/v1/me/student", o),
  listCourses: (o) => request("/v1/me/courses", o),
  listUpcomingLessons: (o) => request("/v1/me/lessons?status=upcoming", o),
  getLesson: (id, o) => request(`/v1/me/lessons/${id}`, o),
  requestReschedule: (input, o) => post("/v1/me/lessons/reschedule", input, o),
  listThreads: (o) => request("/v1/me/threads", o),
  getThread: (id, o) => request(`/v1/me/threads/${id}`, o),
  sendMessage: (threadId, text, o) =>
    request(`/v1/me/threads/${threadId}/messages`, o, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  getAvailability: (id, o) => request(`/v1/teachers/${id}/availability`, o),
  listLessonTypes: (o) => request("/v1/lesson-types", o),
  createBooking: (input) => post("/v1/bookings", input),

  getTeacherProfile: (o) => request("/v1/me/teacher", o),
  getNextSession: (o) => request("/v1/me/teacher/next-session", o),
  getWeek: (o) => request("/v1/me/teacher/week", o),
  listSlots: (date, o) => request("/v1/me/teacher/slots", o, { query: { date } }),
  listLearners: (o) =>
    request("/v1/me/teacher/learners", o, { query: { status: o.status, q: o.query } }),
  listRosterFilters: (o) => request("/v1/me/teacher/learners/filters", o),
  listTeacherResources: (o) => request("/v1/me/teacher/resources", o),
  getEarnings: (o) => request("/v1/me/teacher/earnings", o),
  requestPayout: (input) => post("/v1/me/teacher/payouts", input),

  getApplication: (o) => request("/v1/me/application", o),
  submitApplication: () => post("/v1/me/application/submit", {}),

  getClassroomSession: (id, o) => request(`/v1/sessions/${id}/classroom`, o),
  getSessionSummary: (id, o) => request(`/v1/sessions/${id}/summary`, o),
  submitReview: (input) => post(`/v1/sessions/${input.sessionId}/review`, input),

  getQuiz: (id, o) => request(`/v1/quizzes/${id}`, o),
  submitQuizResult: (input) => post(`/v1/quizzes/${input.quizId}/results`, input),

  getReportContext: (id, o) => request(`/v1/sessions/${id}/report-context`, o),
  submitReport: (input) => post(`/v1/sessions/${input.sessionId}/reports`, input),
};
