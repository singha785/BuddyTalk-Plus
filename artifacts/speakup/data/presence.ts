export type PresenceStatus = "live" | "in-call" | "away" | "offline";

export type Presence = {
  status: PresenceStatus;
  label: string;
  shortLabel: string;
  etaMinutes: number;
  isLive: boolean;
  callable: boolean;
  responseSeconds?: number;
  inCallWith?: string;
};

const SLOT_MS = 5 * 60 * 1000;

const FIRST_NAMES = [
  "Aman",
  "Sara",
  "Karim",
  "Nisha",
  "Bilal",
  "Pooja",
  "Imran",
  "Fatima",
  "Ravi",
  "Anu",
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickFromSeed<T>(seed: number, arr: T[]): T {
  return arr[seed % arr.length];
}

export function getPresence(
  mentorId: string,
  baseOnline: boolean,
  now: number = Date.now(),
): Presence {
  const slot = Math.floor(now / SLOT_MS);
  const seed = hash(`${mentorId}:${slot}`);
  const dice = seed % 100;

  let status: PresenceStatus;
  if (!baseOnline) {
    status = dice < 60 ? "offline" : dice < 80 ? "away" : "in-call";
  } else if (dice < 55) {
    status = "live";
  } else if (dice < 80) {
    status = "in-call";
  } else if (dice < 92) {
    status = "away";
  } else {
    status = "offline";
  }

  const etaSeed = (seed >> 8) % 100;

  if (status === "live") {
    const responseSeconds = 5 + (etaSeed % 20);
    return {
      status,
      label: `Live now · answers in ~${responseSeconds}s`,
      shortLabel: "Live now",
      etaMinutes: 0,
      isLive: true,
      callable: true,
      responseSeconds,
    };
  }

  if (status === "in-call") {
    const remaining = 1 + (etaSeed % 7);
    const partner = pickFromSeed(seed >> 4, FIRST_NAMES);
    return {
      status,
      label: `In a call with ${partner} · ~${remaining} min left`,
      shortLabel: `Busy · ${remaining}m`,
      etaMinutes: remaining,
      isLive: false,
      callable: false,
      inCallWith: partner,
    };
  }

  if (status === "away") {
    const back = 5 + (etaSeed % 25);
    return {
      status,
      label: `Stepped away · back in ~${back} min`,
      shortLabel: `Away · ${back}m`,
      etaMinutes: back,
      isLive: false,
      callable: false,
    };
  }

  const hours = 1 + (etaSeed % 8);
  return {
    status,
    label: `Offline · returns in about ${hours}h`,
    shortLabel: "Offline",
    etaMinutes: hours * 60,
    isLive: false,
    callable: false,
  };
}

export function statusColor(status: PresenceStatus): string {
  switch (status) {
    case "live":
      return "#16A085";
    case "in-call":
      return "#FF7A45";
    case "away":
      return "#F5A524";
    case "offline":
    default:
      return "#9CA3AF";
  }
}
