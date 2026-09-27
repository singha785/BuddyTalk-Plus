export type TaskCategory = "confidence" | "fluency" | "vocabulary" | "interview" | "conversation";
export type TaskTier = "beginner" | "intermediate" | "advanced";

export type DailyTask = {
  id: string;
  title: string;
  description: string;
  minutes: number;
  reward: number;
  type:
    | "speak"
    | "listen"
    | "learn"
    | "talk"
    | "debate"
    | "roleplay"
    | "explain"
    | "wordUse";
  category: TaskCategory;
  tier: TaskTier;
};

// ── Category display order + metadata ─────────────────────────────────────

export const CATEGORY_ORDER: TaskCategory[] = [
  "confidence",
  "fluency",
  "vocabulary",
  "interview",
  "conversation",
];

export const CATEGORY_META: Record<TaskCategory, { label: string; blurb: string }> = {
  confidence: { label: "Confidence", blurb: "Speak up without hesitating" },
  fluency: { label: "Fluency", blurb: "Build a smooth, natural flow" },
  vocabulary: { label: "Vocabulary", blurb: "Grow your everyday word bank" },
  interview: { label: "Interview Prep", blurb: "Practice for the real thing" },
  conversation: { label: "Real Conversation", blurb: "Talk with real people" },
};

// ── Tier badge metadata ─────────────────────────────────────────────────────

export const TIER_META: Record<TaskTier, { label: string; color: string; bg: string }> = {
  beginner: { label: "Beginner", color: "#0E6F5A", bg: "#DDF5EE" },
  intermediate: { label: "Intermediate", color: "#A93D00", bg: "#FFE9DD" },
  advanced: { label: "Advanced", color: "#5B3DFF", bg: "#EAE2FF" },
};

// ── Task list ────────────────────────────────────────────────────────────

export const DAILY_TASKS: DailyTask[] = [
  {
    id: "task-greet-5",
    title: "Greet five people",
    description: "Practice five different ways to greet someone in English.",
    minutes: 5,
    reward: 8,
    type: "speak",
    category: "confidence",
    tier: "beginner",
  },
  {
    id: "task-debate",
    title: "Debate a topic",
    description: "Pick a side, argue it, then respond to a challenge — like a real debate.",
    minutes: 5,
    reward: 15,
    type: "debate",
    category: "confidence",
    tier: "intermediate",
  },
  {
    id: "task-listen-podcast",
    title: "Listen and repeat",
    description: "Listen to three short phrases and repeat them aloud.",
    minutes: 6,
    reward: 8,
    type: "listen",
    category: "fluency",
    tier: "beginner",
  },
  {
    id: "task-tongue-twister",
    title: "Tongue twister challenge",
    description: "Repeat a tricky English sentence three times fast.",
    minutes: 3,
    reward: 5,
    type: "speak",
    category: "fluency",
    tier: "beginner",
  },
  {
    id: "task-learn-words",
    title: "Learn 10 new words",
    description: "Tap through ten daily-use English words.",
    minutes: 5,
    reward: 6,
    type: "learn",
    category: "vocabulary",
    tier: "beginner",
  },
  {
    id: "task-word-use",
    title: "Word of the day → use it",
    description: "Learn today's word, then use it correctly in your own sentence.",
    minutes: 3,
    reward: 7,
    type: "wordUse",
    category: "vocabulary",
    tier: "beginner",
  },
  {
    id: "task-self-intro",
    title: "Record your self-introduction",
    description: "Speak about yourself for 60 seconds without stopping.",
    minutes: 5,
    reward: 10,
    type: "speak",
    category: "interview",
    tier: "beginner",
  },
  {
    id: "task-explain-pro",
    title: "Explain like a pro",
    description: "Explain today's everyday concept clearly, like you would in an interview.",
    minutes: 4,
    reward: 12,
    type: "explain",
    category: "interview",
    tier: "intermediate",
  },
  {
    id: "task-real-talk",
    title: "Have a 5 minute call",
    description: "Connect with a real partner for a 5 minute conversation.",
    minutes: 5,
    reward: 14,
    type: "talk",
    category: "conversation",
    tier: "intermediate",
  },
  {
    id: "task-roleplay",
    title: "Roleplay of the day",
    description: "Play out today's real-life scenario in spoken English.",
    minutes: 5,
    reward: 13,
    type: "roleplay",
    category: "conversation",
    tier: "intermediate",
  },
];
