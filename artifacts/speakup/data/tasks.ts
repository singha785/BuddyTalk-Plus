export type DailyTask = {
  id: string;
  title: string;
  description: string;
  minutes: number;
  reward: number;
  type: "speak" | "listen" | "learn" | "talk";
};

export const DAILY_TASKS: DailyTask[] = [
  {
    id: "task-greet-5",
    title: "Greet five people",
    description: "Practice five different ways to greet someone in English.",
    minutes: 5,
    reward: 8,
    type: "speak",
  },
  {
    id: "task-self-intro",
    title: "Record your self-introduction",
    description: "Speak about yourself for 60 seconds without stopping.",
    minutes: 5,
    reward: 10,
    type: "speak",
  },
  {
    id: "task-listen-podcast",
    title: "Listen and repeat",
    description: "Listen to three short phrases and repeat them aloud.",
    minutes: 6,
    reward: 8,
    type: "listen",
  },
  {
    id: "task-learn-words",
    title: "Learn 10 new words",
    description: "Tap through ten daily-use English words.",
    minutes: 5,
    reward: 6,
    type: "learn",
  },
  {
    id: "task-real-talk",
    title: "Have a 5 minute call",
    description: "Connect with a real partner for a 5 minute conversation.",
    minutes: 5,
    reward: 14,
    type: "talk",
  },
  {
    id: "task-tongue-twister",
    title: "Tongue twister challenge",
    description: "Repeat a tricky English sentence three times fast.",
    minutes: 3,
    reward: 5,
    type: "speak",
  },
];
