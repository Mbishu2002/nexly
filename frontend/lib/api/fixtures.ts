/* THE ONLY PLACE MOCK CONTENT LIVES.
 *
 * Nothing here is imported by a screen. The mock adapter reads these, resolves
 * `Localized` fields to the requested locale, and returns plain DTOs. Deleting
 * this file and pointing `lib/api/index.ts` at the HTTP adapter is the whole
 * migration to a real backend.
 *
 * Content is transcribed from the Stitch designs in design/stitch/html. French
 * is the source language for learner-facing copy (the designs are French-first);
 * English is the translation. */

import type { IconName } from "@/components/ui";
import type { Localized, RosterStatus, SlotState } from "./types";

const L = (fr: string, en: string): Localized => ({ fr, en });

/* Portraits from Unsplash (Unsplash License: free for commercial use, no
 * attribution required). Hot-linked through their CDN with sizing params, so a
 * 256px face-cropped avatar costs ~15KB instead of a multi-megabyte original.
 * Every id below was verified to return HTTP 200. Swap these for uploaded
 * teacher photos when the backend lands -- the DTO field is already `avatar`. */
const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces&w=256&h=256&q=80`;

export const portraits = {
  "henriette-mbassi": photo("1573496799515-eebbb63814f2"),
  "marc-aurel-tchouente": photo("1614023342667-6f060e9d1e04"),
  "nadine-bella": photo("1573497019418-b400bb3ab074"),
} as const;

/* Wide classroom shots, used as lesson cover art (16:9 rather than square). */
const cover = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&h=506&q=80`;

export const lessonCovers = {
  "douala-foundations": cover("1632215861513-130b66fe97f4"),
  "ewondo-proverbs": cover("1698827623362-f10eadf55a18"),
  "camfranglais-street": cover("1744809482817-9a9d4fc280af"),
} as const;

/* ---------- Catalogue ---------- */

export const languages = [
  {
    slug: "douala",
    name: L("Douala", "Douala"),
    region: L("Sawa / Littoral", "Sawa / Littoral"),
    tutors: 38,
    blurb: L(
      "Idéal pour le commerce, la musique et les liens familiaux à Douala & diaspora.",
      "Ideal for trade, music and family ties in Douala and the diaspora.",
    ),
    icon: "headphones" as IconName,
    popular: true,
  },
  {
    slug: "ewondo",
    name: L("Ewondo", "Ewondo"),
    region: L("Fang-Beti / Centre", "Fang-Beti / Centre"),
    tutors: 24,
    blurb: L(
      "Parlé à Yaoundé et dans la région du Centre. Langue historique de communication intercommunautaire.",
      "Spoken in Yaoundé and the Centre region. Historically the language of cross-community trade.",
    ),
    icon: "auto-stories" as IconName,
    popular: false,
  },
  {
    slug: "medumba",
    name: L("Bamiléké / Medumba", "Bamileke / Medumba"),
    region: L("Ouest", "West"),
    tutors: 19,
    blurb: L(
      "Traditions royales, chefferies de l'Ouest et dialectes de transmission générationnelle.",
      "Royal traditions, the western chiefdoms, and dialects passed down through generations.",
    ),
    icon: "diversity-3" as IconName,
    popular: false,
  },
  {
    slug: "bassa",
    name: L("Bassa", "Bassa"),
    region: L("Littoral & Centre", "Littoral & Centre"),
    tutors: 14,
    blurb: L(
      "Histoire culturelle profonde, proverbes ancestraux et liens communautaires forts.",
      "Deep cultural history, ancestral proverbs and strong community ties.",
    ),
    icon: "history-edu" as IconName,
    popular: false,
  },
  {
    slug: "camfranglais",
    name: L("Camfranglais", "Camfranglais"),
    region: L("Urbain", "Urban"),
    tutors: 9,
    blurb: L(
      "Pratique informelle, humour et immersion dans la culture pop citadine camerounaise.",
      "Informal practice, humour and immersion in Cameroonian urban pop culture.",
    ),
    icon: "forum" as IconName,
    popular: false,
  },
];

export const motivations = [
  { id: "roots", label: L("Reconnexion aux origines familiales 👨‍👩‍👦", "Reconnecting with family roots 👨‍👩‍👦") },
  { id: "grandparents", label: L("Conversation fluide avec les grands-parents 🗣️", "Speaking fluently with grandparents 🗣️") },
  { id: "travel", label: L("Voyages & séjours au Cameroun ✈️", "Travel and stays in Cameroon ✈️") },
  { id: "ceremony", label: L("Préparation de dot & cérémonies traditionnelles 💍", "Preparing dowry and traditional ceremonies 💍") },
  { id: "culture", label: L("Apprentissage culturel & chant / musique 🎵", "Cultural learning, song and music 🎵") },
];

export const levels = [
  {
    code: "A0",
    label: L("Débutant complet", "Complete beginner"),
    hint: L("Ne parle pas encore la langue", "Does not speak the language yet"),
  },
  {
    code: "A1",
    label: L("Quelques mots", "A few words"),
    hint: L("Salutations et expressions de base", "Greetings and basic expressions"),
  },
  {
    code: "A2",
    label: L("Conversation simple", "Simple conversation"),
    hint: L("Échanges courts du quotidien", "Short everyday exchanges"),
  },
  {
    code: "B1",
    label: L("Intermédiaire", "Intermediate"),
    hint: L("Discussions suivies sur des sujets connus", "Sustained talk on familiar topics"),
  },
];

export const teachers = [
  {
    id: "henriette-mbassi",
    avatar: portraits["henriette-mbassi"],
    name: "Dr. Henriette Mbassi",
    headline: L(
      "Spécialiste en linguistique Douala & Ewondo",
      "Specialist in Douala & Ewondo linguistics",
    ),
    city: "Yaoundé",
    credential: L("Univ. de Yaoundé I • Linguistique bantoue", "Univ. of Yaoundé I • Bantu linguistics"),
    badge: L("🇨🇲 Locutrice native", "🇨🇲 Native speaker"),
    badgeIcon: "graphic-eq" as IconName,
    rating: 4.98,
    reviews: 124,
    skills: [
      { label: L("Français", "French"), level: L("Natif", "Native") },
      { label: L("Douala", "Douala"), level: L("Natif", "Native") },
      { label: L("Ewondo", "Ewondo"), level: L("Courant", "Fluent") },
      { label: L("Anglais", "English"), level: L("C1", "C1") },
    ],
    tags: [
      L("Patrimoine", "Heritage"),
      L("Linguistique", "Linguistics"),
      L("Préparation d'examen", "Exam prep"),
    ],
    availability: {
      label: L("Prochaine dispo", "Next available"),
      value: L("Aujourd'hui à 16:00", "Today at 16:00"),
      note: L("(WAT/Douala)", "(WAT/Douala)"),
      icon: "schedule" as IconName,
    },
    trial: L("Essai instantané avec Pass", "Instant trial with Pass"),
    sampleLabel: L("Intro 1:20 min", "Intro 1:20 min"),
    sampleIcon: "graphic-eq" as IconName,
    rate: 6500,
    languages: ["douala", "ewondo"],
  },
  {
    id: "marc-aurel-tchouente",
    avatar: portraits["marc-aurel-tchouente"],
    name: "Marc Aurel Tchouente",
    headline: L(
      "Français conversationnel & anglais des affaires",
      "Conversational French & business English",
    ),
    city: "Douala",
    credential: L("ESSEC Douala • Communication", "ESSEC Douala • Communication"),
    badge: L("Douala, Littoral", "Douala, Littoral"),
    badgeIcon: "videocam" as IconName,
    rating: 4.92,
    reviews: 88,
    skills: [
      { label: L("Français", "French"), level: L("Natif", "Native") },
      { label: L("Anglais", "English"), level: L("C2 affaires", "C2 business") },
      { label: L("Camfranglais", "Camfranglais"), level: L("Natif", "Native") },
    ],
    tags: [
      L("Entretiens d'embauche", "Job interviews"),
      L("Affaires", "Business"),
      L("Camfranglais", "Camfranglais"),
    ],
    availability: {
      label: L("Statut", "Status"),
      value: L("Disponible demain", "Available tomorrow"),
      note: L("(Plusieurs créneaux)", "(Multiple slots)"),
      icon: "event-available" as IconName,
    },
    trial: L("Éligible au Pass", "Pass eligible"),
    sampleLabel: L("Leçon type 0:45 min", "Sample lesson 0:45 min"),
    sampleIcon: "videocam" as IconName,
    rate: 5000,
    languages: ["camfranglais"],
  },
  {
    id: "nadine-bella",
    avatar: portraits["nadine-bella"],
    name: "Nadine Bella",
    headline: L(
      "Ewondo patrimonial & culture camerounaise",
      "Heritage Ewondo & Cameroonian culture",
    ),
    city: "Bafoussam",
    credential: L("Conteuse certifiée • Patrimoine oral", "Certified storyteller • Oral heritage"),
    badge: L("Maîtresse d'Ewondo", "Ewondo master"),
    badgeIcon: "celebration" as IconName,
    rating: 5.0,
    reviews: 65,
    skills: [
      { label: L("Ewondo", "Ewondo"), level: L("Natif", "Native") },
      { label: L("Français", "French"), level: L("Natif", "Native") },
    ],
    tags: [
      L("Idéal débutants", "Beginner friendly"),
      L("Immersion culturelle", "Cultural immersion"),
      L("Contes & proverbes Ewondo", "Ewondo tales & proverbs"),
    ],
    availability: {
      label: L("Disponible", "Available"),
      value: L("Aujourd'hui (soirée)", "Today (evening slots)"),
      note: L("", ""),
      icon: "bolt" as IconName,
    },
    trial: L("Essai instantané avec Pass", "Instant trial with Pass"),
    sampleLabel: L("5 ans d'enseignement", "5 years teaching"),
    sampleIcon: "celebration" as IconName,
    rate: 4500,
    languages: ["ewondo", "medumba"],
  },
];

export const reviews: Record<string, { id: string; name: string; rating: number; text: Localized; when: Localized }[]> = {
  "henriette-mbassi": [
    {
      id: "r1",
      name: "Sandrine K.",
      rating: 5,
      text: L(
        "Henriette explique les tons Douala avec une patience incroyable. Ma grand-mère m'a compris au téléphone !",
        "Henriette explains Douala tones with incredible patience. My grandmother understood me on the phone!",
      ),
      when: L("Il y a 3 jours", "3 days ago"),
    },
    {
      id: "r2",
      name: "Eric N.",
      rating: 5,
      text: L(
        "Structuré, chaleureux et toujours ponctuel. Le travail sur les proverbes est le moment fort de ma semaine.",
        "Structured, warm and always on time. The proverb work is the highlight of my week.",
      ),
      when: L("Il y a 1 semaine", "1 week ago"),
    },
  ],
};

export const discoveryFilters = [
  { id: "all", label: L("Tous", "All") },
  { id: "cameroonian", label: L("🇨🇲 Camerounais (Douala, Ewondo)", "🇨🇲 Cameroonian (Douala, Ewondo)") },
  { id: "bilingual", label: L("Bilingue (FR/EN)", "Bilingual (FR/EN)") },
  { id: "exam", label: L("Préparation d'examen", "Exam prep") },
  { id: "top", label: L("⭐ Mieux notés", "⭐ Top rated") },
];

/* ---------- Learner ---------- */

export const student = {
  name: "Franck Bishu",
  level: "A1",
  streak: 12,
  minutesLearned: 640,
  lessonsTaken: 14,
  languages: [L("Douala", "Douala"), L("Ewondo", "Ewondo")],
  passCredits: 3,
};

export const courses = [
  {
    id: "douala-foundations",
    title: L("Les bases du Douala", "Douala foundations"),
    teacher: "Dr. Henriette Mbassi",
    lessons: 24,
    completed: 11,
    minutes: 15,
    level: "A1 → A2",
  },
  {
    id: "ewondo-proverbs",
    title: L("Contes & proverbes Ewondo", "Ewondo tales & proverbs"),
    teacher: "Nadine Bella",
    lessons: 18,
    completed: 4,
    minutes: 12,
    level: "A2",
  },
  {
    id: "camfranglais-street",
    title: L("Camfranglais : rue & culture pop", "Camfranglais: street & pop culture"),
    teacher: "Marc Aurel Tchouente",
    lessons: 12,
    completed: 12,
    minutes: 8,
    level: "B1",
  },
];

export const upcomingLessons = [
  {
    id: "l1",
    teacher: "Dr. Henriette Mbassi",
    teacherId: "henriette-mbassi",
    avatar: portraits["henriette-mbassi"],
    topic: L("Douala — salutations & famille", "Douala — greetings & family"),
    date: L("Aujourd'hui", "Today"),
    time: "16:00",
    tz: "WAT/Douala",
    duration: 50,
  },
  {
    id: "l2",
    teacher: "Nadine Bella",
    teacherId: "nadine-bella",
    avatar: portraits["nadine-bella"],
    topic: L("Ewondo — proverbes & contes", "Ewondo — proverbs & tales"),
    date: L("Jeudi 25 sept.", "Thursday 25 Sept"),
    time: "19:30",
    tz: "WAT/Douala",
    duration: 50,
  },
];

/* Full lesson records. The upcoming list above is the summary projection of
 * these -- a real API would serve /v1/me/lessons and /v1/me/lessons/:id from
 * the same table. */
export const lessonDetails = [
  {
    id: "l1",
    teacherId: "henriette-mbassi",
    teacher: "Dr. Henriette Mbassi",
    avatar: portraits["henriette-mbassi"],
    teacherHeadline: L(
      "Spécialiste en linguistique Douala & Ewondo",
      "Specialist in Douala & Ewondo linguistics",
    ),
    cover: lessonCovers["douala-foundations"],
    topic: L("Douala — salutations & famille", "Douala — greetings & family"),
    date: L("Aujourd'hui", "Today"),
    time: "16:00",
    endTime: "16:50",
    tz: "WAT/Douala",
    duration: 50,
    status: "confirmed" as const,
    statusLabel: L("Confirmée", "Confirmed"),
    language: L("Douala", "Douala"),
    level: L("Débutant · A2", "Beginner · A2"),
    lessonType: L("Cours particulier", "One-to-one lesson"),
    joinable: true,
    countdown: L("Commence bientôt", "Starting soon"),
    objectives: [
      L("Saluer selon le moment de la journée", "Greet according to the time of day"),
      L("Présenter les membres de sa famille", "Introduce your family members"),
      L("Maîtriser les tons hauts et bas", "Master high and low tones"),
      L("Répondre à « Comment vas-tu ? »", 'Answer "How are you?"'),
    ],
    materials: [
      {
        id: "m1",
        label: L("Fiche — 20 salutations", "Handout — 20 greetings"),
        meta: L("PDF · 2 pages", "PDF · 2 pages"),
        icon: "picture-as-pdf" as IconName,
      },
      {
        id: "m2",
        label: L("Audio — tons Douala", "Audio — Douala tones"),
        meta: L("4 min · locutrice native", "4 min · native speaker"),
        icon: "graphic-eq" as IconName,
      },
      {
        id: "m3",
        label: L("Vocabulaire de la famille", "Family vocabulary"),
        meta: L("18 cartes", "18 cards"),
        icon: "style" as IconName,
      },
    ],
    teacherNote: L(
      "Révise les salutations de la dernière fois — on commence par un rappel de 5 minutes, puis on passe à la famille.",
      "Review last time's greetings — we start with a 5-minute recap, then move on to family.",
    ),
    policy: L(
      "Annulation gratuite jusqu'à 4 h avant le début. Au-delà, le crédit Pass est décompté.",
      "Free cancellation up to 4 h before the start. After that, the Pass credit is used.",
    ),
  },
  {
    id: "l2",
    teacherId: "nadine-bella",
    teacher: "Nadine Bella",
    avatar: portraits["nadine-bella"],
    teacherHeadline: L("Conteuse & professeure d'Ewondo", "Storyteller & Ewondo teacher"),
    cover: lessonCovers["ewondo-proverbs"],
    topic: L("Ewondo — proverbes & contes", "Ewondo — proverbs & tales"),
    date: L("Jeudi 25 sept.", "Thursday 25 Sept"),
    time: "19:30",
    endTime: "20:20",
    tz: "WAT/Douala",
    duration: 50,
    status: "confirmed" as const,
    statusLabel: L("Confirmée", "Confirmed"),
    language: L("Ewondo", "Ewondo"),
    level: L("Intermédiaire · B1", "Intermediate · B1"),
    lessonType: L("Cours particulier", "One-to-one lesson"),
    joinable: false,
    countdown: L("Dans 2 jours", "In 2 days"),
    objectives: [
      L("Comprendre 5 proverbes courants", "Understand 5 common proverbs"),
      L("Raconter une courte histoire", "Tell a short story"),
      L("Repérer les images et métaphores", "Spot imagery and metaphor"),
    ],
    materials: [
      {
        id: "m1",
        label: L("Recueil — proverbes Ewondo", "Collection — Ewondo proverbs"),
        meta: L("PDF · 6 pages", "PDF · 6 pages"),
        icon: "picture-as-pdf" as IconName,
      },
      {
        id: "m2",
        label: L("Conte enregistré — Le lièvre", "Recorded tale — The hare"),
        meta: L("7 min", "7 min"),
        icon: "graphic-eq" as IconName,
      },
    ],
    teacherNote: L(
      "Écoute le conte avant la session, même sans tout comprendre. On le décortiquera ensemble.",
      "Listen to the tale before the session, even if you don't catch it all. We'll unpack it together.",
    ),
    policy: L(
      "Annulation gratuite jusqu'à 4 h avant le début. Au-delà, le crédit Pass est décompté.",
      "Free cancellation up to 4 h before the start. After that, the Pass credit is used.",
    ),
  },
];

export const threads = [
  {
    id: "t1",
    teacherId: "henriette-mbassi",
    name: "Dr. Henriette Mbassi",
    avatar: portraits["henriette-mbassi"],
    time: L("14:32", "14:32"),
    unread: 1,
    messages: [
      {
        from: "them" as const,
        text: L("Bonjour Franck ! Prêt pour la session de demain ?", "Hello Franck! Ready for tomorrow's session?"),
        time: L("14:20", "14:20"),
      },
      {
        from: "me" as const,
        text: L("Oui ! J'ai révisé le vocabulaire de la famille.", "Yes! I revised the family vocabulary."),
        time: L("14:28", "14:28"),
      },
      {
        from: "them" as const,
        text: L("Parfait ! On révise les salutations Douala demain.", "Perfect! We'll review Douala greetings tomorrow."),
        time: L("14:32", "14:32"),
      },
    ],
  },
  {
    id: "t2",
    teacherId: "nadine-bella",
    name: "Nadine Bella",
    avatar: portraits["nadine-bella"],
    time: L("Hier", "Yesterday"),
    unread: 1,
    messages: [
      {
        from: "them" as const,
        text: L(
          "J'ai joint la fiche de proverbes — à jeudi !",
          "I've attached the proverb worksheet — see you Thursday.",
        ),
        time: L("Hier", "Yesterday"),
      },
    ],
  },
];

export const availability: Record<string, { day: Localized; date: string; slots: string[] }[]> = {
  default: [
    { day: L("Lun", "Mon"), date: "22", slots: ["09:00", "16:00", "18:30"] },
    { day: L("Mar", "Tue"), date: "23", slots: ["10:00", "14:00"] },
    { day: L("Mer", "Wed"), date: "24", slots: ["08:30", "16:00", "17:30", "20:00"] },
    { day: L("Jeu", "Thu"), date: "25", slots: ["19:30"] },
    { day: L("Ven", "Fri"), date: "26", slots: ["09:00", "11:00", "15:00"] },
  ],
};

export const lessonTypes = [
  {
    id: "trial",
    label: L("Séance d'essai", "Trial session"),
    duration: 25,
    note: L("Incluse avec le Pass", "Included with the Pass"),
  },
  {
    id: "single",
    label: L("Leçon 1:1", "1:1 lesson"),
    duration: 50,
    note: L("Format standard", "Standard format"),
  },
  {
    id: "group",
    label: L("Session de groupe", "Group session"),
    duration: 60,
    note: L("Jusqu'à 4 apprenants", "Up to 4 learners"),
  },
];

/* ---------- Teacher ---------- */

export const teacherProfile = {
  name: "Dr. Henriette Mbassi",
  firstName: "Henriette",
  badge: L("Tuteur vérifié Cameroun 🇨🇲", "Verified Cameroon tutor 🇨🇲"),
  status: L("Disponible pour réservations", "Available for bookings"),
  rating: 4.98,
  reviews: 124,
  hoursThisMonth: 42.5,
  sessionsToday: 3,
  sessionsDone: 2,
  sessionsUpcoming: 1,
  learners: 24,
};

export const nextSession = {
  inMinutes: 45,
  at: "15:30 WAT",
  latency: L("Douala SFU · 18ms · stable", "Douala SFU · 18ms · stable"),
  student: "Alain Nguemo",
  level: "A2",
  topic: L(
    "Douala A2 • modulations tonales et diphtongues",
    "Douala A2 • tonal modulation and diphthongs",
  ),
  progress: L("Session 8 sur 12 du parcours", "Session 8 of 12 in the track"),
};

export const week = [
  { day: L("Lun", "Mon"), date: "16", today: false },
  { day: L("Mar", "Tue"), date: "17", today: false },
  { day: L("Mer", "Wed"), date: "18", today: true },
  { day: L("Jeu", "Thu"), date: "19", today: false },
  { day: L("Ven", "Fri"), date: "20", today: false },
  { day: L("Sam", "Sat"), date: "21", today: false },
];

export const slots: Record<string, {
  id: string;
  start: string;
  end: string;
  state: SlotState;
  student?: string;
  studentMeta?: Localized;
  title: Localized;
  note?: Localized;
  noteIcon?: IconName;
  statusLabel: Localized;
}[]> = {
  "18": [
    {
      id: "s1",
      start: "09:00",
      end: "09:50",
      state: "done",
      student: "Alain Nguemo",
      title: L("Initiation Douala • grammaire fondamentale", "Douala basics • core grammar"),
      note: L(
        "Revue 5.0 reçue : « Excellente pédagogie pratique »",
        "5.0 review received: “Excellent practical teaching”",
      ),
      noteIcon: "star",
      statusLabel: L("Terminé", "Completed"),
    },
    {
      id: "s2",
      start: "11:00",
      end: "11:50",
      state: "done",
      student: "Valérie E.",
      studentMeta: L("Montréal 🇨🇦", "Montréal 🇨🇦"),
      title: L(
        "Perfectionnement Ewondo • expressions du quotidien",
        "Ewondo refinement • everyday expressions",
      ),
      note: L("Enregistrement prêt (48 min)", "Recording ready (48 min)"),
      noteIcon: "play-circle-outline",
      statusLabel: L("Terminé", "Completed"),
    },
    {
      id: "s3",
      start: "15:30",
      end: "16:20",
      state: "next",
      student: "Alain Nguemo",
      title: L("Douala A2 • modulations tonales", "Douala A2 • tonal modulation"),
      note: L(
        "Salle LiveKit configurée • documents liés : 3",
        "LiveKit room configured • linked documents: 3",
      ),
      noteIcon: "videocam",
      statusLabel: L("Prochaine séance", "Next session"),
    },
    {
      id: "s4",
      start: "17:00",
      end: "17:50",
      state: "open",
      title: L("Créneau ouvert", "Open slot"),
      note: L("Réservation instantanée activée", "Instant booking enabled"),
      noteIcon: "bolt",
      statusLabel: L("Réservable", "Bookable"),
    },
    {
      id: "s5",
      start: "18:30",
      end: "19:20",
      state: "blocked",
      title: L("Bloqué • pause personnelle", "Blocked • personal break"),
      note: L(
        "Non visible au catalogue public des apprenants",
        "Hidden from the public learner catalogue",
      ),
      noteIcon: "bedtime",
      statusLabel: L("Indisponible", "Unavailable"),
    },
  ],
};

export const rosterFilters = [
  { id: "all", label: L("Tous", "All"), count: 24 },
  { id: "active", label: L("Actifs", "Active"), count: 18 },
  { id: "new", label: L("Nouveaux", "New"), count: 4 },
  { id: "pending", label: L("À relancer", "Follow up"), count: 2 },
];

export const learners: {
  id: string;
  name: string;
  flag: string;
  course: Localized;
  status: RosterStatus;
  statusLabel: Localized;
  progressLabel: Localized;
  progress?: number;
  when: Localized;
  whenIcon: IconName;
  note?: Localized;
  noteKind?: "text" | "audio" | "goal" | "info";
  attachment?: { label: string; duration: string };
}[] = [
  {
    id: "alain",
    name: "Alain Nguemo",
    flag: "🇫🇷",
    course: L("Douala A2", "Douala A2"),
    status: "active",
    statusLabel: L("En direct", "Live"),
    progressLabel: L("Session 8 sur 12 complétée", "Session 8 of 12 completed"),
    progress: 0.72,
    when: L("Aujourd'hui à 15:30 WAT", "Today at 15:30 WAT"),
    whenIcon: "videocam",
    note: L(
      "« Excellente prononciation des tons montants. Travailler les voyelles nasales lors du cours d'aujourd'hui. »",
      "“Excellent rising-tone pronunciation. Work on nasal vowels in today's lesson.”",
    ),
    noteKind: "text",
  },
  {
    id: "valerie",
    name: "Valérie Essomba",
    flag: "🇨🇦",
    course: L("Ewondo B1", "Ewondo B1"),
    status: "pending",
    statusLabel: L("En attente", "Pending"),
    progressLabel: L("Session 3 / 10 • hier", "Session 3 / 10 • yesterday"),
    when: L("Vendredi 11:00", "Friday 11:00"),
    whenIcon: "mic",
    note: L("Devoir audio reçu", "Audio homework received"),
    noteKind: "audio",
    attachment: { label: "Exercice_Contes_Ewondo_v1.m4a", duration: "1:42" },
  },
  {
    id: "marcelle",
    name: "Marcelle Kuate",
    flag: "🇬🇧",
    course: L("Medumba / Bamiléké A1", "Medumba / Bamileke A1"),
    status: "new",
    statusLabel: L("Nouveau", "New"),
    progressLabel: L("1ʳᵉ session à venir", "First session upcoming"),
    when: L("1ʳᵉ session : samedi à 10:00", "First session: Saturday at 10:00"),
    whenIcon: "event-available",
    note: L(
      "Objectif : cérémonie de mariage traditionnel en décembre.",
      "Goal: traditional wedding ceremony in December.",
    ),
    noteKind: "goal",
  },
  {
    id: "christian",
    name: "Christian Dipoko",
    flag: "🇨🇲",
    course: L("Douala débutant • 0 crédit restant", "Douala beginner • 0 credits left"),
    status: "inactive",
    statusLabel: L("Inactif", "Inactive"),
    progressLabel: L("Dernière leçon : il y a 22 j", "Last lesson: 22 days ago"),
    when: L("Pass Web inactif", "Web Pass inactive"),
    whenIcon: "history-edu",
    note: L(
      "Rappel automatique envoyé par la plateforme. Aucune action requise.",
      "Automatic reminder sent by the platform. No action required.",
    ),
    noteKind: "info",
  },
];

export const teacherResources = [
  {
    id: "bank",
    icon: "assignment" as IconName,
    title: L("Banque d'exercices partagés", "Shared exercise bank"),
    hint: L("6 fiches distribuées cette semaine", "6 worksheets shared this week"),
  },
  {
    id: "attendance",
    icon: "description" as IconName,
    title: L("Récapitulatif mensuel des présences", "Monthly attendance summary"),
    hint: L("Télécharger l'émargement (PDF)", "Download the register (PDF)"),
  },
];

export const earnings = {
  wallet: {
    available: 184500,
    escrow: 45000,
    monthTotal: 348000,
    sessionsCompleted: 28,
    nextAutoPayout: L("25 sept.", "25 Sept"),
    monthLabel: L("Septembre 2026", "September 2026"),
    trend: L("+18% vs août", "+18% vs August"),
  },
  accounts: [
    {
      id: "mtn",
      initial: "M",
      name: "MTN Mobile Money",
      tag: L("Principal", "Primary"),
      masked: "+237 67X XXX 842 • Henriette Mbassi",
      verified: true,
    },
    {
      id: "orange",
      initial: "O",
      name: "Orange Money",
      tag: L("Secours", "Backup"),
      masked: "+237 69X XXX 115 • H. Mbassi",
      verified: false,
    },
  ],
  weekly: [
    { label: "S35", value: 45000 },
    { label: "S36", value: 58000 },
    { label: "S37", value: 62500 },
    { label: "S38", value: 78000 },
  ],
  sources: [
    { id: "live", label: L("Cours 1:1 LiveKit", "1:1 LiveKit lessons"), share: 0.75, amount: 261000 },
    {
      id: "recorded",
      label: L("Cours enregistrés Pass Web", "Recorded courses, Web Pass"),
      share: 0.25,
      amount: 87000,
    },
  ],
  movements: [
    {
      id: "m1",
      icon: "videocam" as IconName,
      title: L("Session 1:1 LiveKit Douala A2", "1:1 LiveKit session, Douala A2"),
      meta: L("Alain Nguemo • aujourd'hui 15:30", "Alain Nguemo • today 15:30"),
      amount: 6500,
      state: L("Crédité", "Credited"),
    },
    {
      id: "m2",
      icon: "inventory-2" as IconName,
      title: L("Pack 4 sessions Ewondo", "4-session Ewondo pack"),
      meta: L("Valérie E. (Montréal) • hier", "Valérie E. (Montréal) • yesterday"),
      amount: 24000,
      state: L("Crédité", "Credited"),
    },
    {
      id: "m3",
      icon: "arrow-outward" as IconName,
      title: L("Retrait Orange Money", "Orange Money withdrawal"),
      meta: L("Réf #WD-8921 • 18 sept.", "Ref #WD-8921 • 18 Sept"),
      amount: -120000,
      state: L("Transféré", "Transferred"),
    },
    {
      id: "m4",
      icon: "play-lesson" as IconName,
      title: L("Partage revenus cours vidéo", "Video course revenue share"),
      meta: L("Douala Parlé (Pass Web) • 15 sept.", "Spoken Douala (Web Pass) • 15 Sept"),
      amount: 18500,
      state: L("Crédité", "Credited"),
    },
  ],
};

export const application = {
  steps: [
    { label: L("Profil", "Profile"), done: true, current: false },
    { label: L("Diplômes", "Credentials"), done: true, current: false },
    { label: L("Vidéo", "Video"), done: false, current: true },
    { label: L("Dispos", "Availability"), done: false, current: false },
  ],
  video: {
    duration: L("1:45 enregistré", "1:45 recorded"),
    quality: "1080p FHD",
    audio: L("Son clair (micro sans fil)", "Clear audio (wireless mic)"),
    file: "Vidéo_Presentation_Henriette.mp4",
    size: L("18.4 Mo • prête pour analyse IA & jury", "18.4 MB • ready for AI and panel review"),
  },
  guidance: [
    L(
      "Salutations et présentation fluide dans votre langue maternelle (ex : Douala, Ewondo, Bamiléké).",
      "Greetings and a fluent introduction in your mother tongue (e.g. Douala, Ewondo, Bamileke).",
    ),
    L(
      "Explication de votre méthode pédagogique en français ou en anglais.",
      "An explanation of your teaching method in French or English.",
    ),
    L(
      "Un mini-conseil d'intonation ou de prononciation pour rassurer l'apprenant en diaspora.",
      "One short intonation or pronunciation tip to reassure a diaspora learner.",
    ),
  ],
  docs: [
    {
      id: "cni",
      icon: "badge" as IconName,
      title: L("CNI camerounaise (recto / verso)", "Cameroonian ID card (front / back)"),
      hint: L("Téléversée & validité conforme (2028)", "Uploaded and valid (2028)"),
      verified: true,
    },
    {
      id: "diploma",
      icon: "school" as IconName,
      title: L("Diplôme de linguistique / chefferie", "Linguistics / chiefdom credential"),
      hint: "Attestation_Univ_Yde_I.pdf (1.8 Mo)",
      verified: true,
    },
  ],
  languages: [
    { name: L("Douala (Duala)", "Douala (Duala)"), level: L("Langue maternelle (natif)", "Mother tongue (native)") },
    { name: L("Ewondo (Fang-Beti)", "Ewondo (Fang-Beti)"), level: L("Courant / bilingue", "Fluent / bilingual") },
  ],
  basins: [
    L("Canton Bell / Sawa (Littoral)", "Bell canton / Sawa (Littoral)"),
    L("Bassin du Wouri", "Wouri basin"),
    L("Yaoundé Métropole", "Greater Yaoundé"),
  ],
};

/* ---------- Live session ---------- */

export const classroomSession = {
  id: "NK-8429",
  teacher: "Dr. Henriette Mbassi",
  student: "Alain Nguemo",
  elapsedSeconds: 24 * 60 + 18,
  lengthSeconds: 50 * 60,
  latency: L("Douala SFU · 18ms · stable", "Douala SFU · 18ms · stable"),
  boardTitle: L("Tableau partagé · Douala", "Shared board · Douala"),
  vocab: [
    { word: "Mwelē", gloss: L("Soleil", "Sun") },
    { word: "Muna", gloss: L("Enfant", "Child") },
    { word: "Na tondi o", gloss: L("Je t'aime", "I love you") },
  ],
  phoneticGuide: {
    target: "Na tondi o",
    ipa: "[nah ton-dee oh]",
    hint: L("Ton montant sur « ton »", "Rising tone on “ton”"),
  },
  notes: [
    {
      from: "teacher" as const,
      author: "Dr. Henriette Mbassi",
      text: L(
        "Concentrez-vous sur le ton nasal doux de « Mwelē ». Ne laissez pas tomber la voyelle finale.",
        "Focus on the soft nasal tone for “Mwelē”. Don't drop the final vowel.",
      ),
    },
    {
      from: "me" as const,
      author: L("Vous (Alain)", "You (Alain)"),
      text: L(
        "Compris ! Pourriez-vous prononcer « Muna » lentement à nouveau ?",
        "Understood! Could you pronounce “Muna” again slowly?",
      ),
    },
  ],
};

export const sessionSummary = {
  id: "NK-8429",
  teacher: "Dr. Henriette Mbassi",
  teacherId: "henriette-mbassi",
  credential: L("Univ. de Yaoundé I • Linguistique bantoue", "Univ. of Yaoundé I • Bantu linguistics"),
  duration: 50,
  subject: L("Douala conversation & phonétique", "Douala conversation & phonetics"),
  when: L("Aujourd'hui, 15:30 – 16:20 (WAT)", "Today, 15:30 – 16:20 (WAT)"),
  highlights: [
    { id: "tone", label: L("🎯 Accent & tonalité", "🎯 Accent & tone") },
    { id: "speaking", label: L("🗣️ Beaucoup de pratique orale", "🗣️ Lots of speaking practice") },
    { id: "vocab", label: L("📚 Vocabulaire enrichissant", "📚 Rich vocabulary") },
    { id: "punctual", label: L("⏱️ Ponctuelle & structurée", "⏱️ Punctual & structured") },
    { id: "kind", label: L("🌟 Encouragements bienveillants", "🌟 Kind encouragement") },
  ],
  remainingSessions: 2,
};

/* ---------- Quiz ---------- */

const speaker = {
  name: "Dr. Henriette Mbassi",
  credential: L("Locutrice native • Douala Littoral", "Native speaker • Douala Littoral"),
};

const toneHint = {
  high: L("Ton haut (High)", "High tone"),
  low: L("Ton bas (Low)", "Low tone"),
};

export const quiz = {
  id: "douala-a1-listening",
  title: L("Exercice d'écoute • Douala A1", "Listening drill • Douala A1"),
  hearts: 5,
  startingXp: 40,
  startIndex: 2,
  questions: [
    {
      id: "q1",
      prompt: L("Écoutez et identifiez la voyelle nasale", "Listen and identify the nasal vowel"),
      instruction: L(
        "Repérez la nasalisation finale dans le radical nominal.",
        "Spot the final nasalisation in the noun stem.",
      ),
      speaker,
      toneHint,
      clipLength: "0:02",
      options: [
        { key: "A" as const, word: "Muna", tone: L("Ton plat", "Level tone"), meaning: L("Signification : Enfant", "Meaning: Child") },
        { key: "B" as const, word: "Munà", tone: L("Ton descendant (Ò)", "Falling tone (Ò)"), meaning: L("Signification : Petite quantité", "Meaning: Small amount") },
        { key: "C" as const, word: "Múna", tone: L("Ton haut (Ó)", "High tone (Ó)"), meaning: L("Signification : À l'intérieur de", "Meaning: Inside of") },
      ],
      correct: "A" as const,
      xp: 20,
      successLabel: L("Bien vu ! Ton plat confirmé", "Nice! Level tone confirmed"),
      successHint: L("La voyelle finale reste ouverte", "The final vowel stays open"),
      fact: {
        title: L("Le saviez-vous ? • Nasales Douala", "Did you know? • Douala nasals"),
        body: L(
          "« Muna » (enfant) se distingue de « Múna » (à l'intérieur de) uniquement par la hauteur de la première syllabe. Le sens change entièrement.",
          "“Muna” (child) differs from “Múna” (inside of) only in the pitch of the first syllable. The meaning changes completely.",
        ),
      },
    },
    {
      id: "q2",
      prompt: L("Écoutez et identifiez le ton initial", "Listen and identify the initial tone"),
      instruction: L(
        "Distinguez l'attaque haute de l'attaque basse sur la première syllabe.",
        "Tell a high onset from a low onset on the first syllable.",
      ),
      speaker,
      toneHint,
      clipLength: "0:03",
      options: [
        { key: "A" as const, word: "Ndòlo", tone: L("Ton bas (Ò)", "Low tone (Ò)"), meaning: L("Signification : Amour / affection", "Meaning: Love / affection") },
        { key: "B" as const, word: "Ndólo", tone: L("Ton haut (Ó)", "High tone (Ó)"), meaning: L("Signification : Appel, convocation", "Meaning: A call, a summons") },
        { key: "C" as const, word: "Ndolo", tone: L("Ton plat", "Level tone"), meaning: L("Signification : Forme non attestée", "Meaning: Not an attested form") },
      ],
      correct: "A" as const,
      xp: 20,
      successLabel: L("Parfait ! Ton bas confirmé", "Perfect! Low tone confirmed"),
      successHint: L("Attaque descendante bien repérée", "Falling onset well spotted"),
      fact: {
        title: L("Le saviez-vous ? • Ndòlo", "Did you know? • Ndòlo"),
        body: L(
          "« Ndòlo » (amour) est l'un des mots Douala les plus connus de la diaspora — on l'entend dans le makossa et les chants de mariage traditionnels du Littoral.",
          "“Ndòlo” (love) is one of the best-known Douala words in the diaspora — you hear it in makossa and in traditional Littoral wedding songs.",
        ),
      },
    },
    {
      id: "q3",
      prompt: L("Écoutez et identifiez le ton mélodique", "Listen and identify the melodic tone"),
      instruction: L(
        "Distinguez le ton haut (Ó) du ton bas (Ò) dans le radical nominal.",
        "Tell the high tone (Ó) from the low tone (Ò) in the noun stem.",
      ),
      speaker,
      toneHint,
      clipLength: "0:02",
      options: [
        { key: "A" as const, word: "Mwélē", tone: L("Ton haut (Ó)", "High tone (Ó)"), meaning: L("Signification : Soleil / clarté du jour", "Meaning: Sun / daylight") },
        { key: "B" as const, word: "Mwele", tone: L("Ton plat", "Level tone"), meaning: L("Signification : Brise légère / souffle", "Meaning: Light breeze / breath") },
        { key: "C" as const, word: "Mwèlè", tone: L("Ton descendant (Ò)", "Falling tone (Ò)"), meaning: L("Signification : Rive sablonneuse du fleuve Wouri", "Meaning: Sandy bank of the Wouri river") },
      ],
      correct: "A" as const,
      xp: 20,
      successLabel: L("Excellent ! Ton haut confirmé", "Excellent! High tone confirmed"),
      successHint: L("Identification acoustique parfaite", "Perfect acoustic identification"),
      fact: {
        title: L("Le saviez-vous ? • Règle tonale Douala", "Did you know? • Douala tone rule"),
        body: L(
          "En langue Douala (bantu A.24), les variations de hauteur vocale sont strictement lexicales. Dire « Mwélē » avec un ton haut désigne l'astre solaire, tandis que « Mwèlè » avec un ton bas évoque les rives sablonneuses côtières.",
          "In Douala (Bantu A.24), pitch variation is strictly lexical. Saying “Mwélē” with a high tone means the sun, while “Mwèlè” with a low tone evokes the sandy coastal banks.",
        ),
      },
    },
    {
      id: "q4",
      prompt: L("Écoutez et identifiez le contour tonal", "Listen and identify the tone contour"),
      instruction: L(
        "Un contour montant puis descendant distingue ces deux formes verbales.",
        "A rising-then-falling contour separates these two verb forms.",
      ),
      speaker,
      toneHint,
      clipLength: "0:04",
      options: [
        { key: "A" as const, word: "Na tóndi", tone: L("Ton haut médian", "Mid-high tone"), meaning: L("Signification : J'aime (présent)", "Meaning: I love (present)") },
        { key: "B" as const, word: "Na tòndi", tone: L("Ton bas médian", "Mid-low tone"), meaning: L("Signification : J'ai aimé (accompli)", "Meaning: I loved (completed)") },
        { key: "C" as const, word: "Na tondí", tone: L("Ton haut final", "Final high tone"), meaning: L("Signification : Forme interrogative", "Meaning: Interrogative form") },
      ],
      correct: "A" as const,
      xp: 20,
      successLabel: L("Excellent ! Contour montant confirmé", "Excellent! Rising contour confirmed"),
      successHint: L("Le présent est bien marqué", "The present tense is clearly marked"),
      fact: {
        title: L("Le saviez-vous ? • Temps et ton", "Did you know? • Tense and tone"),
        body: L(
          "En Douala, le temps verbal se marque souvent par le ton seul, sans changer une seule consonne. « Na tóndi » et « Na tòndi » ne diffèrent que par la hauteur.",
          "In Douala, verb tense is often marked by tone alone, without changing a single consonant. “Na tóndi” and “Na tòndi” differ only in pitch.",
        ),
      },
    },
    {
      id: "q5",
      prompt: L("Écoutez et identifiez la salutation correcte", "Listen and identify the correct greeting"),
      instruction: L(
        "Choisissez la forme de politesse employée à Douala en journée.",
        "Choose the polite form used in Douala during the day.",
      ),
      speaker,
      toneHint,
      clipLength: "0:03",
      options: [
        { key: "A" as const, word: "Idibá", tone: L("Ton haut final", "Final high tone"), meaning: L("Signification : Bonjour (matin)", "Meaning: Good morning") },
        { key: "B" as const, word: "Ebiámù", tone: L("Ton descendant", "Falling tone"), meaning: L("Signification : Salutation respectueuse", "Meaning: Respectful greeting") },
        { key: "C" as const, word: "Nà bolo", tone: L("Ton plat", "Level tone"), meaning: L("Signification : Au travail / bon courage", "Meaning: To work / good luck") },
      ],
      correct: "B" as const,
      xp: 20,
      successLabel: L("Parfait ! Salutation respectueuse", "Perfect! Respectful greeting"),
      successHint: L("Registre de politesse bien choisi", "Politeness register well chosen"),
      fact: {
        title: L("Le saviez-vous ? • Registres", "Did you know? • Registers"),
        body: L(
          "« Ebiámù » marque le respect envers un aîné ou un notable. L'employer correctement compte autant que la prononciation dans les échanges familiaux.",
          "“Ebiámù” marks respect toward an elder or a notable. Using it correctly matters as much as pronunciation in family exchanges.",
        ),
      },
    },
  ],
};

/* ---------- Safety ---------- */

export const reportContext = {
  promise: {
    headline: L("Votre sécurité est notre priorité absolue", "Your safety is our absolute priority"),
    body: L(
      "Équipe de modération humaine active 24/7 basée à Douala et Yaoundé. Tout incident en direct est consigné et audité.",
      "A human moderation team works 24/7 from Douala and Yaoundé. Every live incident is logged and audited.",
    ),
    sla: L("Revue sous < 2h", "Reviewed in under 2h"),
    compliance: L("Conforme App Store Guideline 1.2", "Meets App Store Guideline 1.2"),
  },
  target: {
    kind: L("Session vidéo", "Video session"),
    person: "Dr. Henriette Mbassi",
    role: L("Tuteur", "Tutor"),
    subject: L("Douala conversation & phonétique", "Douala conversation & phonetics"),
    ref: "#NK-8429",
    when: L("Aujourd'hui, 14:18 (GMT+1)", "Today, 14:18 (GMT+1)"),
    rtcRoom: "LiveKit RTC Room: #NK-8429-FR-DLA",
  },
  reasons: [
    {
      id: "harassment",
      label: L("Comportement déplacé ou harcèlement", "Inappropriate behaviour or harassment"),
      detail: L(
        "Propos insultants, gestes inconvenants, remarques discriminatoires ou harcèlement durant l'appel vidéo.",
        "Insults, inappropriate gestures, discriminatory remarks or harassment during the video call.",
      ),
    },
    {
      id: "noshow",
      label: L("Absence injustifiée / no-show", "Unexplained absence / no-show"),
      detail: L(
        "L'enseignant ou l'élève n'a pas rejoint la salle virtuelle après 10 minutes d'attente.",
        "The teacher or student did not join the virtual room after 10 minutes of waiting.",
      ),
    },
    {
      id: "fraud",
      label: L("Problèmes techniques récurrents ou fraude", "Recurring technical issues or fraud"),
      detail: L(
        "Tentative de paiement hors plateforme, usurpation d'identité ou panne technique intentionnelle.",
        "Off-platform payment attempts, identity fraud, or deliberate technical failure.",
      ),
    },
    {
      id: "content",
      label: L("Contenu non conforme aux directives", "Content that breaches the guidelines"),
      detail: L(
        "Discours haineux, propos politiques extrêmes ou diffusion de matériels non autorisés.",
        "Hate speech, extreme political statements, or sharing unauthorised material.",
      ),
    },
    {
      id: "other",
      label: L("Autre motif", "Other reason"),
      detail: L("Précisez dans la boîte de détails ci-dessous.", "Describe it in the details box below."),
    },
  ],
  protections: [
    {
      id: "block",
      icon: "lock" as IconName,
      label: L("Bloquer immédiatement cet utilisateur", "Block this user immediately"),
      detail: L(
        "Empêche tout appel futur, message direct ou réservation avec le Dr. Henriette Mbassi.",
        "Prevents any future call, direct message or booking with Dr. Henriette Mbassi.",
      ),
      defaultOn: true,
    },
    {
      id: "hide",
      icon: "visibility-off" as IconName,
      label: L("Masquer mon profil pour cet utilisateur", "Hide my profile from this user"),
      detail: L(
        "Votre photo, statut d'apprentissage et disponibilités deviennent invisibles pour son compte.",
        "Your photo, learning status and availability become invisible to their account.",
      ),
      defaultOn: false,
    },
    {
      id: "credit",
      icon: "confirmation-number" as IconName,
      label: L("Demander la réattribution de mon crédit de cours", "Request my lesson credit back"),
      detail: L(
        "Si la session a été interrompue ou compromise, vos jetons de cours seront recrédités sans frais.",
        "If the session was interrupted or compromised, your lesson tokens are refunded at no cost.",
      ),
      defaultOn: true,
    },
  ],
  minDetailChars: 20,
  attachment: { name: "preuve_capture_14h19.png", size: "1.2 Mo" },
};
