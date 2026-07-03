export type PronunciationScore = {
  accuracy: number;
  fluency: number;
  completeness: number;
  overall: number;
  matchedWords: string[];
  missedWords: string[];
  extraWords: string[];
  transcript: string;
  expected: string;
  date: string;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 0);
}

function lcsLength(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function scorePronunciation(expected: string, transcript: string): PronunciationScore {
  const expectedWords = tokenize(expected);
  const spokenWords = tokenize(transcript);

  if (expectedWords.length === 0) {
    return {
      accuracy: 100,
      fluency: 100,
      completeness: 100,
      overall: 100,
      matchedWords: [],
      missedWords: [],
      extraWords: [],
      transcript,
      expected,
      date: new Date().toISOString(),
    };
  }

  if (spokenWords.length === 0) {
    return {
      accuracy: 0,
      fluency: 0,
      completeness: 0,
      overall: 0,
      matchedWords: [],
      missedWords: expectedWords,
      extraWords: [],
      transcript,
      expected,
      date: new Date().toISOString(),
    };
  }

  const matched = lcsLength(expectedWords, spokenWords);

  const expectedSet = new Set(expectedWords);
  const spokenSet = new Set(spokenWords);
  const matchedWords = expectedWords.filter((w) => spokenSet.has(w));
  const missedWords = expectedWords.filter((w) => !spokenSet.has(w));
  const extraWords = spokenWords.filter((w) => !expectedSet.has(w));

  const accuracy = Math.round((matched / expectedWords.length) * 100);
  const completeness = Math.round((matchedWords.length / expectedWords.length) * 100);
  const fluencyRaw = spokenWords.length > 0
    ? Math.max(0, 1 - extraWords.length / spokenWords.length)
    : 0;
  const fluency = Math.round(fluencyRaw * 100);
  const overall = Math.round(accuracy * 0.5 + completeness * 0.3 + fluency * 0.2);

  return {
    accuracy: Math.min(100, accuracy),
    fluency: Math.min(100, fluency),
    completeness: Math.min(100, completeness),
    overall: Math.min(100, overall),
    matchedWords,
    missedWords,
    extraWords,
    transcript,
    expected,
    date: new Date().toISOString(),
  };
}

export function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "OK — passed";
  if (score >= 40) return "Needs work";
  return "Try again";
}

export function scoreColor(score: number): string {
  if (score >= 75) return "#16A085";
  if (score >= 60) return "#F39C12";
  return "#E5484D";
}

export const PASS_THRESHOLD = 60;
