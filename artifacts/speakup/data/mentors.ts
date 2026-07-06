export type Mentor = {
  id: string;
  name: string;
  initials: string;
  level: "Helper" | "Mentor" | "Pro Mentor";
  rating: number;
  sessions: number;
  region: string;
  languages: string[];
  bio: string;
  pricePer10Min: number;
  online: boolean;
  specialties: string[];
  accentColor: string;
};

export const MENTORS: Mentor[] = [
  {
    id: "mentor-anjali",
    name: "Anjali Perera",
    initials: "AP",
    level: "Pro Mentor",
    rating: 4.9,
    sessions: 1240,
    region: "Colombo, Sri Lanka",
    languages: ["Sinhala", "Tamil", "English"],
    bio: "Patient mentor specialising in interview English and confidence building.",
    pricePer10Min: 30,
    online: true,
    specialties: ["Interview", "Confidence", "Pronunciation"],
    accentColor: "#5B3DFF",
  },
  {
    id: "mentor-rohan",
    name: "Rohan Verma",
    initials: "RV",
    level: "Mentor",
    rating: 4.8,
    sessions: 860,
    region: "Bengaluru, India",
    languages: ["Hindi", "Kannada", "English"],
    bio: "Software engineer who loves teaching workplace English and small talk.",
    pricePer10Min: 28,
    online: true,
    specialties: ["Workplace", "Small Talk", "Tech"],
    accentColor: "#FF7A45",
  },
  {
    id: "mentor-priya",
    name: "Priya Sharma",
    initials: "PS",
    level: "Pro Mentor",
    rating: 5.0,
    sessions: 1840,
    region: "Delhi, India",
    languages: ["Hindi", "Punjabi", "English"],
    bio: "Friendly mentor for beginners. We start from zero and build slowly.",
    pricePer10Min: 30,
    online: false,
    specialties: ["Beginner", "Grammar", "Daily Life"],
    accentColor: "#16A085",
  },
  {
    id: "mentor-tariq",
    name: "Tariq Hussain",
    initials: "TH",
    level: "Mentor",
    rating: 4.7,
    sessions: 540,
    region: "Dhaka, Bangladesh",
    languages: ["Bangla", "Hindi", "English"],
    bio: "Helps you sound natural in everyday conversations.",
    pricePer10Min: 26,
    online: true,
    specialties: ["Fluency", "Accent", "Travel"],
    accentColor: "#F5A524",
  },
  {
    id: "mentor-meena",
    name: "Meena Acharya",
    initials: "MA",
    level: "Helper",
    rating: 4.6,
    sessions: 220,
    region: "Kathmandu, Nepal",
    languages: ["Nepali", "Hindi", "English"],
    bio: "Chatty helper for relaxed practice sessions and student English.",
    pricePer10Min: 22,
    online: true,
    specialties: ["Student", "Casual", "Listening"],
    accentColor: "#E5484D",
  },
  {
    id: "mentor-zarah",
    name: "Zarah Ahmadi",
    initials: "ZA",
    level: "Mentor",
    rating: 4.8,
    sessions: 410,
    region: "Tehran, Iran",
    languages: ["Persian", "English"],
    bio: "Focused on professional English for international remote work.",
    pricePer10Min: 28,
    online: false,
    specialties: ["Professional", "Email English", "Calls"],
    accentColor: "#7C3AED",
  },
];
