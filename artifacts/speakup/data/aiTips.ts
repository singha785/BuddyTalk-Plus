export const AI_SUGGESTIONS: string[] = [
  "Try saying: \"Could you repeat that, please?\"",
  "You can ask: \"What does that word mean?\"",
  "A natural reply is: \"That sounds interesting, tell me more.\"",
  "Smooth phrase: \"Honestly, I am still learning, please be patient.\"",
  "Try: \"In my opinion, …\" before sharing a view.",
  "Use: \"By the way, …\" to gently change topics.",
  "Ask: \"How do you usually spend your weekends?\"",
  "End a call with: \"It was lovely talking to you.\"",
];

export const AI_FEEDBACK: { good: string[]; improve: string[] } = {
  good: [
    "Your greeting was warm and natural.",
    "Nice pace — easy to understand.",
    "You used good filler words like \"actually\" and \"well\".",
    "Confident tone throughout the call.",
  ],
  improve: [
    "Try replacing \"I am do\" with \"I do\".",
    "Slow down a little when introducing yourself.",
    "Practice the \"th\" sound in words like \"think\" and \"three\".",
    "Add small pauses between sentences for clarity.",
  ],
};

export const PARTNER_LINES: string[] = [
  "Hi! Nice to meet you. How are you today?",
  "I'm doing great, thank you. Where are you from?",
  "Oh that's lovely! What do you do?",
  "How long have you been learning English?",
  "What do you enjoy most about practicing?",
  "Do you watch any English shows or movies?",
  "I think you're doing really well. Keep going!",
  "It was great talking with you. Let's chat again soon.",
];

type FeedbackContext = {
  seconds: number;
  partnerRegion?: string;
};

const SHORT_GOOD = [
  "You stayed calm and started speaking right away — that takes confidence.",
  "Good opening — your first few sentences were clear and natural.",
  "Even a short session counts. You showed up and practiced.",
];
const SHORT_IMPROVE = [
  "Next time try to keep the conversation going for at least 3 minutes.",
  "Ask a follow-up question to keep the chat flowing longer.",
  "Introduce yourself fully — name, where you're from, what you do.",
];

const MEDIUM_GOOD = [
  "Nice work keeping the conversation going for several minutes.",
  "Your vocabulary felt natural and varied throughout the call.",
  "You handled pauses well and kept things comfortable.",
];
const MEDIUM_IMPROVE = [
  "Try using more connectors like \"Moreover\" or \"On the other hand\".",
  "Practice the \"th\" sound in words like \"think\" and \"three\".",
  "Slow down slightly when explaining something complex.",
];

const LONG_GOOD = [
  "Excellent stamina — speaking for that long in a second language is real progress.",
  "Your sentence structures got more complex as the call went on — great sign.",
  "You kept the conversation engaging and asked thoughtful questions.",
];
const LONG_IMPROVE = [
  "Work on intonation — vary your pitch to sound more expressive.",
  "Try to use more idioms naturally: \"on the other hand\", \"as a matter of fact\".",
  "Record yourself next time to catch small pronunciation patterns to fix.",
];

const REGION_TIPS: Record<string, string> = {
  India: "Focus on the \"v\" vs \"w\" distinction — \"vine\" and \"wine\" sound different in native speech.",
  Pakistan: "Great effort! Work on elongating vowel sounds — \"cat\" vs \"cut\" difference matters a lot.",
  Bangladesh: "Practice the \"r\" sound at the end of words like \"water\" and \"better\".",
  "Sri Lanka": "Your rhythm was good. Try to stress the right syllable: \"pho-TO-graph\" not \"PHO-to-graph\".",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateContextualFeedback(ctx: FeedbackContext): { good: string; improve: string } {
  const { seconds, partnerRegion } = ctx;

  let good: string;
  let improve: string;

  if (seconds < 90) {
    good = pick(SHORT_GOOD);
    improve = pick(SHORT_IMPROVE);
  } else if (seconds < 300) {
    good = pick(MEDIUM_GOOD);
    improve = pick(MEDIUM_IMPROVE);
  } else {
    good = pick(LONG_GOOD);
    improve = pick(LONG_IMPROVE);
  }

  if (partnerRegion && REGION_TIPS[partnerRegion]) {
    improve = REGION_TIPS[partnerRegion];
  }

  return { good, improve };
}
