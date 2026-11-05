import AsyncStorage from "@react-native-async-storage/async-storage";
import { customFetch } from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import type { PronunciationScore } from "@/utils/pronunciationScore";

export type UserGoal = "job" | "study" | "daily" | "travel";
export type UserLevel = "Beginner" | "Intermediate" | "Advanced";
export type AppLanguage = "en" | "hi" | "bn" | "mr" | "te" | "ta" | "kn" | "ml" | "gu" | "or" | "pa" | "as" | "ur" | "th";

export type UserProfile = {
  name: string;
  goal: UserGoal | null;
  level: UserLevel | null;
  region: string;
  onboarded: boolean;
};

export type CallType = "practice" | "mentor";

export type CallHistoryEntry = {
  id: string;
  date: string;
  type: CallType;
  partnerName: string;
  partnerInitials: string;
  partnerColor: string;
  partnerRegion?: string;
  durationMinutes: number;
  coinsSpent?: number;
  feedback?: { good: string; improve: string };
  reported?: boolean;
};

export type LessonScoreEntry = {
  lessonId: string;
  scores: PronunciationScore[];
  bestOverall: number;
  lastPracticed: string;
};

export type WalletTx = {
  id: string;
  delta: number;
  reason: string;
  note: string | null;
  balanceAfter: number;
  createdAt: string;
};
type WalletResponse = { balance: number; earnedToday: number; dailyEarnCap: number; transactions: WalletTx[] };
type EarnResponse = { granted: number; balance: number; duplicate?: boolean; limited?: string };

export type AppState = {
  language: AppLanguage;
  profile: UserProfile;
  coins: number;
  premium: boolean;
  streak: number;
  lastOpened: string | null;
  freeMinutesUsed: number;
  freeMinutesDate: string | null;
  adsWatchedToday: number;
  adsWatchedDate: string | null;
  completedTasks: string[];
  completedLessons: string[];
  totalCalls: number;
  totalMinutesSpoken: number;
  fluency: number;
  pronunciation: number;
  confidence: number;
  callHistory: CallHistoryEntry[];
  blockedUsers: string[];
  lessonScores: LessonScoreEntry[];
  greetedPartners: string[];
};

const FREE_DAILY_MINUTES = 20;
const DAILY_AD_LIMIT = 10;
const COIN_AD_REWARD = 15;
// Display only. The real coin amounts and daily caps live on the server (api-server/src/routes/wallet.ts).
const DAILY_LOGIN_BONUS = 2;

// Each user account gets its own isolated storage slot.
// v2 because v1 used a global key — all v1 data is abandoned on next login.
const userStorageKey = (id: string) => `speakup.state.v2.${id}`;

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const defaultState: AppState = {
  language: "en",
  profile: {
    name: "",
    goal: null,
    level: null,
    region: "South Asia",
    onboarded: false,
  },
  coins: 0,
  premium: false,
  streak: 0,
  lastOpened: null,
  freeMinutesUsed: 0,
  freeMinutesDate: todayKey(),
  adsWatchedToday: 0,
  adsWatchedDate: todayKey(),
  completedTasks: [],
  completedLessons: [],
  totalCalls: 0,
  totalMinutesSpoken: 0,
  fluency: 0,
  pronunciation: 0,
  confidence: 0,
  callHistory: [],
  blockedUsers: [],
  lessonScores: [],
  greetedPartners: [],
};

type AppContextValue = {
  state: AppState;
  ready: boolean;
  freeMinutesRemaining: number;
  adsRemainingToday: number;
  /** Last wallet transactions, newest first (from the server ledger). */
  transactions: WalletTx[];
  /** Re-read balance and history from the server. */
  refreshWallet: () => Promise<void>;
  completeOnboarding: (data: {
    name: string;
    goal: UserGoal;
    level: UserLevel;
  }) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number, reason?: string) => Promise<boolean>;
  watchAdReward: () => Promise<{ ok: boolean; reason?: string }>;
  consumeFreeMinutes: (minutes: number) => Promise<void>;
  recordCall: (entry: {
    minutes: number;
    type: CallType;
    partnerName: string;
    partnerInitials: string;
    partnerColor: string;
    partnerRegion?: string;
    coinsSpent?: number;
    feedback?: { good: string; improve: string };
  }) => Promise<CallHistoryEntry>;
  completeTask: (taskId: string, reward: number) => Promise<void>;
  completeLesson: (lessonId: string) => Promise<void>;
  savePronunciationScore: (lessonId: string, score: PronunciationScore) => Promise<void>;
  setPremium: (value: boolean) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  trackGreeting: (partnerId: string) => Promise<void>;
  blockUser: (name: string) => Promise<void>;
  unblockUser: (name: string) => Promise<void>;
  reportCall: (callId: string) => Promise<void>;
  resetAccount: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function rollDailyResets(state: AppState): AppState {
  const today = todayKey();
  let next = state;
  if (state.freeMinutesDate !== today) {
    // New day: reset free minutes, daily tasks, and greeted-partner tracking
    next = {
      ...next,
      freeMinutesUsed: 0,
      freeMinutesDate: today,
      completedTasks: [],
      greetedPartners: [],
    };
  }
  if (state.adsWatchedDate !== today) {
    next = { ...next, adsWatchedToday: 0, adsWatchedDate: today };
  }
  return next;
}

function bumpStreak(state: AppState): AppState {
  const today = todayKey();
  if (state.lastOpened === today) return state;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = state.lastOpened === yesterday ? state.streak + 1 : 1;
  // The daily login coins are granted by the server (see the load effect below).
  return { ...state, lastOpened: today, streak };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, ready: authReady, updateProfile: serverUpdateProfile } = useAuth();
  const [state, setState] = useState<AppState>(defaultState);
  const [ready, setReady] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);

  // The coin balance is owned by the server. coinsRef always holds the latest server balance
  // so that saving other fields can never overwrite it with an old number.
  const coinsRef = useRef<number>(0);
  const userIdRef = useRef<string | undefined>(undefined);
  userIdRef.current = authUser?.id;

  const applyBalance = useCallback((balance: number) => {
    coinsRef.current = balance;
    setState((prev) => {
      const next = { ...prev, coins: balance };
      const uid = userIdRef.current;
      if (uid) AsyncStorage.setItem(userStorageKey(uid), JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!userIdRef.current) return;
    try {
      const w = await customFetch<WalletResponse>("/wallet", { method: "GET", responseType: "json" });
      applyBalance(w.balance);
      setTransactions(w.transactions ?? []);
    } catch {
      // offline: keep showing the last synced balance
    }
  }, [applyBalance]);

  const serverEarn = useCallback(
    async (reason: string, opts: { ref?: string; amount?: number; note?: string } = {}): Promise<EarnResponse | null> => {
      try {
        const r = await customFetch<EarnResponse>("/wallet/earn", {
          method: "POST",
          body: JSON.stringify({ reason, ...opts }),
          responseType: "json",
        });
        applyBalance(r.balance);
        return r;
      } catch {
        return null;
      }
    },
    [applyBalance],
  );

  // ── Load per-user state whenever auth resolves or the logged-in account changes ──
  useEffect(() => {
    if (!authReady) return;

    setReady(false);
    const userId = authUser?.id;

    if (!userId) {
      // Logged out — show clean default, no storage write
      coinsRef.current = 0;
      setTransactions([]);
      setState(defaultState);
      setReady(true);
      return;
    }

    const key = userStorageKey(userId);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          const merged: AppState = {
            ...defaultState,
            ...parsed,
            // Always overlay the latest profile data from the server
            profile: {
              ...defaultState.profile,
              ...(parsed.profile ?? {}),
              name: authUser.name ?? parsed.profile?.name ?? "",
              goal: (authUser.goal ?? parsed.profile?.goal ?? null) as UserGoal | null,
              level: (authUser.level ?? parsed.profile?.level ?? null) as UserLevel | null,
              onboarded: !!authUser.onboarded,
            },
          };
          const rolled = bumpStreak(rollDailyResets(merged));
          coinsRef.current = rolled.coins;
          setState(rolled);
          await AsyncStorage.setItem(key, JSON.stringify(rolled));
        } else {
          // First open for this account — start fresh with their server profile
          const initial = bumpStreak({
            ...defaultState,
            profile: {
              name: authUser.name ?? "",
              goal: (authUser.goal ?? null) as UserGoal | null,
              level: (authUser.level ?? null) as UserLevel | null,
              region: "South Asia",
              onboarded: !!authUser.onboarded,
            },
          });
          coinsRef.current = initial.coins;
          setState(initial);
          await AsyncStorage.setItem(key, JSON.stringify(initial));
        }
      } catch {
        setState(defaultState);
      } finally {
        setReady(true);
      }
      // Coins: ask the server for the real balance, collect today's login coins, load history.
      await serverEarn("daily_login");
      await refreshWallet();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authUser?.id]);

  const persist = useCallback(async (incoming: AppState) => {
    const next: AppState = { ...incoming, coins: coinsRef.current };
    setState(next);
    const userId = authUser?.id;
    if (!userId) return;
    try {
      await AsyncStorage.setItem(userStorageKey(userId), JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [authUser?.id]);

  const completeOnboarding = useCallback<AppContextValue["completeOnboarding"]>(
    async ({ name, goal, level }) => {
      try {
        await serverUpdateProfile({ name, goal, level, onboarded: true });
      } catch {
        // continue locally
      }
      const next: AppState = {
        ...state,
        profile: { ...state.profile, name, goal, level, onboarded: true },
      };
      await persist(next);
    },
    [state, persist, serverUpdateProfile],
  );

  const addCoins = useCallback<AppContextValue["addCoins"]>(
    async (amount) => {
      await serverEarn("bonus", { amount, ref: `bonus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
    },
    [serverEarn],
  );

  const spendCoins = useCallback<AppContextValue["spendCoins"]>(
    async (amount, reason = "spend") => {
      if (coinsRef.current < amount) return false;
      try {
        const r = await customFetch<{ ok: boolean; balance: number }>("/wallet/spend", {
          method: "POST",
          body: JSON.stringify({ reason, amount, ref: `${reason}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }),
          responseType: "json",
        });
        applyBalance(r.balance);
        return r.ok !== false;
      } catch {
        return false;
      }
    },
    [applyBalance],
  );

  const watchAdReward = useCallback<AppContextValue["watchAdReward"]>(async () => {
    const rolled = rollDailyResets(state);
    if (rolled.adsWatchedToday >= DAILY_AD_LIMIT) {
      return { ok: false, reason: "Daily ad limit reached." };
    }
    const r = await serverEarn("ad", {
      amount: COIN_AD_REWARD,
      ref: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });
    if (!r) return { ok: false, reason: "Network problem. Please try again." };
    if (!r.granted) return { ok: false, reason: "Daily coin limit reached. Come back tomorrow!" };
    await persist({ ...rolled, adsWatchedToday: rolled.adsWatchedToday + 1 });
    return { ok: true };
  }, [state, persist, serverEarn]);

  const consumeFreeMinutes = useCallback<AppContextValue["consumeFreeMinutes"]>(
    async (minutes) => {
      const rolled = rollDailyResets(state);
      await persist({ ...rolled, freeMinutesUsed: rolled.freeMinutesUsed + minutes });
    },
    [state, persist],
  );

  const recordCall = useCallback<AppContextValue["recordCall"]>(
    async (entry) => {
      const rolled = rollDailyResets(state);
      const newEntry: CallHistoryEntry = {
        id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        type: entry.type,
        partnerName: entry.partnerName,
        partnerInitials: entry.partnerInitials,
        partnerColor: entry.partnerColor,
        partnerRegion: entry.partnerRegion,
        durationMinutes: entry.minutes,
        coinsSpent: entry.coinsSpent,
        feedback: entry.feedback,
      };
      await persist({
        ...rolled,
        totalCalls: rolled.totalCalls + 1,
        totalMinutesSpoken: rolled.totalMinutesSpoken + entry.minutes,
        fluency: Math.min(100, rolled.fluency + 2),
        confidence: Math.min(100, rolled.confidence + 3),
        pronunciation: Math.min(100, rolled.pronunciation + 1),
        callHistory: [newEntry, ...rolled.callHistory].slice(0, 50),
      });
      return newEntry;
    },
    [state, persist],
  );

  const blockUser = useCallback<AppContextValue["blockUser"]>(
    async (name) => {
      if (state.blockedUsers.includes(name)) return;
      await persist({ ...state, blockedUsers: [...state.blockedUsers, name] });
    },
    [state, persist],
  );

  const unblockUser = useCallback<AppContextValue["unblockUser"]>(
    async (name) => {
      await persist({ ...state, blockedUsers: state.blockedUsers.filter((n) => n !== name) });
    },
    [state, persist],
  );

  const reportCall = useCallback<AppContextValue["reportCall"]>(
    async (callId) => {
      await persist({
        ...state,
        callHistory: state.callHistory.map((c) => (c.id === callId ? { ...c, reported: true } : c)),
      });
    },
    [state, persist],
  );

  const completeTask = useCallback<AppContextValue["completeTask"]>(
    async (taskId, reward) => {
      if (state.completedTasks.includes(taskId)) return;
      const r = await serverEarn("task", { ref: taskId, amount: reward, note: taskId });
      // offline: leave the task open so the player can finish it again later
      if (!r) return;
      await persist({ ...state, completedTasks: [...state.completedTasks, taskId] });
    },
    [state, persist, serverEarn],
  );

  const completeLesson = useCallback<AppContextValue["completeLesson"]>(
    async (lessonId) => {
      if (state.completedLessons.includes(lessonId)) return;
      await persist({
        ...state,
        completedLessons: [...state.completedLessons, lessonId],
        pronunciation: Math.min(100, state.pronunciation + 4),
        fluency: Math.min(100, state.fluency + 2),
      });
    },
    [state, persist],
  );

  const savePronunciationScore = useCallback<AppContextValue["savePronunciationScore"]>(
    async (lessonId, score) => {
      const existing = state.lessonScores.find((e) => e.lessonId === lessonId);
      const updatedScores = existing
        ? existing.scores.slice(-49).concat(score)
        : [score];
      const bestOverall = Math.max(...updatedScores.map((s) => s.overall));
      const entry: LessonScoreEntry = {
        lessonId,
        scores: updatedScores,
        bestOverall,
        lastPracticed: new Date().toISOString(),
      };
      const nextLessonScores = state.lessonScores
        .filter((e) => e.lessonId !== lessonId)
        .concat(entry);
      await persist({
        ...state,
        pronunciation: Math.min(100, state.pronunciation + Math.round(score.overall / 25)),
        lessonScores: nextLessonScores,
      });
    },
    [state, persist],
  );

  const trackGreeting = useCallback(
    async (partnerId: string) => {
      if (!partnerId || state.greetedPartners.includes(partnerId)) return;
      const greetedPartners = [...state.greetedPartners, partnerId];
      const GREET_TASK_ID = "task-greet-5";
      const GREET_TASK_REWARD = 8;
      const alreadyComplete = state.completedTasks.includes(GREET_TASK_ID);
      const nowComplete = !alreadyComplete && greetedPartners.length >= 5;
      if (nowComplete) await serverEarn("task", { ref: GREET_TASK_ID, amount: GREET_TASK_REWARD, note: GREET_TASK_ID });
      await persist({
        ...state,
        greetedPartners,
        completedTasks: nowComplete
          ? [...state.completedTasks, GREET_TASK_ID]
          : state.completedTasks,
      });
    },
    [state, persist, serverEarn],
  );

  const setLanguage = useCallback<AppContextValue["setLanguage"]>(
    async (language) => { await persist({ ...state, language }); },
    [state, persist],
  );

  const setPremium = useCallback<AppContextValue["setPremium"]>(
    async (value) => { await persist({ ...state, premium: value }); },
    [state, persist],
  );

  const resetAccount = useCallback<AppContextValue["resetAccount"]>(async () => {
    const userId = authUser?.id;
    if (userId) {
      await AsyncStorage.removeItem(userStorageKey(userId)).catch(() => {});
    }
    const fresh = bumpStreak(defaultState);
    await persist(fresh);
  }, [persist, authUser?.id]);

  const value = useMemo<AppContextValue>(() => {
    const totalAllowed = state.premium ? FREE_DAILY_MINUTES + 20 : FREE_DAILY_MINUTES;
    const freeMinutesRemaining = Math.max(0, totalAllowed - state.freeMinutesUsed);
    const adsRemainingToday = Math.max(0, DAILY_AD_LIMIT - state.adsWatchedToday);
    return {
      state,
      ready,
      freeMinutesRemaining,
      adsRemainingToday,
      transactions,
      refreshWallet,
      completeOnboarding,
      addCoins,
      spendCoins,
      watchAdReward,
      consumeFreeMinutes,
      recordCall,
      completeTask,
      completeLesson,
      savePronunciationScore,
      setPremium,
      setLanguage,
      trackGreeting,
      blockUser,
      unblockUser,
      reportCall,
      resetAccount,
    };
  }, [
    state, ready, transactions, refreshWallet, completeOnboarding, addCoins, spendCoins, watchAdReward,
    consumeFreeMinutes, recordCall, completeTask, completeLesson,
    savePronunciationScore, setPremium, setLanguage, trackGreeting, blockUser, unblockUser, reportCall, resetAccount,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export const CONSTANTS = {
  FREE_DAILY_MINUTES,
  DAILY_AD_LIMIT,
  COIN_AD_REWARD,
  DAILY_LOGIN_BONUS,
};
