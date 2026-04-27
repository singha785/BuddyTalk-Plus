export type LessonItem = {
  text: string;
  hint?: string;
};

export type Lesson = {
  id: string;
  title: string;
  category: "alphabet" | "phrase" | "daily" | "grammar";
  level: "Beginner" | "Intermediate" | "Advanced";
  minutes: number;
  description: string;
  items: LessonItem[];
};

export const LESSONS: Lesson[] = [
  {
    id: "alphabet-basics",
    title: "Alphabet Sounds",
    category: "alphabet",
    level: "Beginner",
    minutes: 5,
    description: "Learn how each English letter sounds when spoken.",
    items: [
      { text: "A — apple", hint: "ay" },
      { text: "B — book", hint: "bee" },
      { text: "C — cat", hint: "see" },
      { text: "D — dog", hint: "dee" },
      { text: "E — egg", hint: "ee" },
      { text: "F — fish", hint: "ef" },
      { text: "G — girl", hint: "jee" },
    ],
  },
  {
    id: "greetings",
    title: "Everyday Greetings",
    category: "phrase",
    level: "Beginner",
    minutes: 6,
    description: "Common greetings used in daily conversation.",
    items: [
      { text: "Hello, how are you?" },
      { text: "Good morning! Have a nice day." },
      { text: "Nice to meet you." },
      { text: "What's your name?" },
      { text: "I am from India. Where are you from?" },
      { text: "See you later. Take care." },
    ],
  },
  {
    id: "introduce-yourself",
    title: "Introduce Yourself",
    category: "phrase",
    level: "Beginner",
    minutes: 7,
    description: "Confidently tell people who you are.",
    items: [
      { text: "Hi, my name is Aman." },
      { text: "I am twenty-two years old." },
      { text: "I live in Lahore with my family." },
      { text: "I am learning English to get a better job." },
      { text: "I love cricket and music." },
    ],
  },
  {
    id: "ordering-food",
    title: "Ordering Food",
    category: "daily",
    level: "Beginner",
    minutes: 5,
    description: "Order food at a restaurant or café in English.",
    items: [
      { text: "Excuse me, can I see the menu?" },
      { text: "I would like one chicken biryani, please." },
      { text: "Could I get some water as well?" },
      { text: "Is this dish spicy?" },
      { text: "Thank you. Could I have the bill?" },
    ],
  },
  {
    id: "job-interview",
    title: "Job Interview",
    category: "daily",
    level: "Intermediate",
    minutes: 8,
    description: "Speak confidently in interviews.",
    items: [
      { text: "Tell me about yourself." },
      { text: "I have two years of experience as a customer support agent." },
      { text: "My biggest strength is staying calm under pressure." },
      { text: "I want to grow in a company that values learning." },
      { text: "Do you have any questions for me?" },
    ],
  },
  {
    id: "small-talk",
    title: "Small Talk Skills",
    category: "phrase",
    level: "Intermediate",
    minutes: 6,
    description: "Keep conversations going naturally.",
    items: [
      { text: "How was your weekend?" },
      { text: "The weather is really nice today, isn't it?" },
      { text: "What do you usually do in your free time?" },
      { text: "I have heard about that movie. Is it worth watching?" },
      { text: "Let's catch up over chai sometime." },
    ],
  },
  {
    id: "grammar-tenses",
    title: "Tenses Made Simple",
    category: "grammar",
    level: "Intermediate",
    minutes: 9,
    description: "Past, present, and future without confusion.",
    items: [
      { text: "I eat lunch at one o'clock every day." },
      { text: "I am eating lunch right now." },
      { text: "I ate lunch an hour ago." },
      { text: "I will eat lunch with my friends tomorrow." },
      { text: "I have eaten at this place before." },
    ],
  },
  {
    id: "advanced-debate",
    title: "Express Your Opinion",
    category: "phrase",
    level: "Advanced",
    minutes: 10,
    description: "Share thoughts clearly and politely.",
    items: [
      { text: "I think education should be more practical." },
      { text: "On the other hand, theory builds the foundation." },
      { text: "From my experience, both balance is essential." },
      { text: "I respectfully disagree with that point." },
      { text: "Could you explain what you mean by that?" },
    ],
  },
];
