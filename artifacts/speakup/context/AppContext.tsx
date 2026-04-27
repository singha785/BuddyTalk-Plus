import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type UserGoal = "job" | "study" | "daily" | "travel";
export type UserLevel = "Beginner" | "Intermediate" | "Advanced";

export type UserProfile = {
  name: string;
  goal: UserGoal | null;
  level: UserLevel | null;
  region: string;
  onboarded: boolean;
};

export type AppState = {
  profile: UserProfile;
  coins: number;
  premium: boolean;
  streak: number;
  lastOpened: string | null;
  freeMinutesUsed: number; // resets daily
  freeMinutesDate: string | null;
  adsWatchedToday: number;
  adsWatchedDate: string | null;
  completedTasks: string[];
  completedLessons: string[];
  totalCalls: number;
  totalMinutesSpoken: number;
  fluency: number; // 0..100
  pronunciation: number;
  confidence: number;
};

const FREE_DAILY_MINUTES = 20;
const DAILY_AD_LIMIT = 10;
const COIN_AD_REWARD = 5;

const STORAGE_KEY = "speakup.state.v1";

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const defaultState: AppState = {
  profile: {
    name: "",
    goal: null,
    level: null,
    region: "South Asia",
    onboarded: false,
  },
  coins: 30,
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
  fluency: 30,
  pronunciation: 35,
  confidence: 28,
};

type AppContextValue = {
  state: AppState;
  ready: boolean;
  freeMinutesRemaining: number;
  adsRemainingToday: number;
  completeOnboarding: (data: {
    name: string;
    goal: UserGoal;
    level: UserLevel;
  }) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
  watchAdReward: () => Promise<{ ok: boolean; reason?: string }>;
  consumeFreeMinutes: (minutes: number) => Promise<void>;
  recordCall: (minutes: number) => Promise<void>;
  completeTask: (taskId: string, reward: number) => Promise<void>;
  completeLesson: (lessonId: string) => Promise<void>;
  setPremium: (value: boolean) => Promise<void>;
  resetAccount: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function rollDailyResets(state: AppState): AppState {
  const today = todayKey();
  let next = state;
  if (state.freeMinutesDate !== today) {
    next = { ...next, freeMinutesUsed: 0, freeMinutesDate: today };
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
  return { ...state, lastOpened: today, streak };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AppState;
          const merged = { ...defaultState, ...parsed };
          const rolled = bumpStreak(rollDailyResets(merged));
          setState(rolled);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rolled));
        } else {
          const initial = bumpStreak(defaultState);
          setState(initial);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        }
      } catch {
        setState(defaultState);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: AppState) => {
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const completeOnboarding = useCallback<AppContextValue["completeOnboarding"]>(
    async ({ name, goal, level }) => {
      const next: AppState = {
        ...state,
        profile: { ...state.profile, name, goal, level, onboarded: true },
      };
      await persist(next);
    },
    [state, persist],
  );

  const addCoins = useCallback<AppContextValue["addCoins"]>(
    async (amount) => {
      await persist({ ...state, coins: state.coins + amount });
    },
    [state, persist],
  );

  const spendCoins = useCallback<AppContextValue["spendCoins"]>(
    async (amount) => {
      if (state.coins < amount) return false;
      await persist({ ...state, coins: state.coins - amount });
      return true;
    },
    [state, persist],
  );

  const watchAdReward = useCallback<AppContextValue["watchAdReward"]>(async () => {
    const rolled = rollDailyResets(state);
    if (rolled.adsWatchedToday >= DAILY_AD_LIMIT) {
      return { ok: false, reason: "Daily ad limit reached." };
    }
    await persist({
      ...rolled,
      adsWatchedToday: rolled.adsWatchedToday + 1,
      coins: rolled.coins + COIN_AD_REWARD,
    });
    return { ok: true };
  }, [state, persist]);

  const consumeFreeMinutes = useCallback<AppContextValue["consumeFreeMinutes"]>(
    async (minutes) => {
      const rolled = rollDailyResets(state);
      await persist({
        ...rolled,
        freeMinutesUsed: rolled.freeMinutesUsed + minutes,
      });
    },
    [state, persist],
  );

  const recordCall = useCallback<AppContextValue["recordCall"]>(
    async (minutes) => {
      const rolled = rollDailyResets(state);
      await persist({
        ...rolled,
        totalCalls: rolled.totalCalls + 1,
        totalMinutesSpoken: rolled.totalMinutesSpoken + minutes,
        fluency: Math.min(100, rolled.fluency + 2),
        confidence: Math.min(100, rolled.confidence + 3),
        pronunciation: Math.min(100, rolled.pronunciation + 1),
      });
    },
    [state, persist],
  );

  const completeTask = useCallback<AppContextValue["completeTask"]>(
    async (taskId, reward) => {
      if (state.completedTasks.includes(taskId)) return;
      await persist({
        ...state,
        completedTasks: [...state.completedTasks, taskId],
        coins: state.coins + reward,
      });
    },
    [state, persist],
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

  const setPremium = useCallback<AppContextValue["setPremium"]>(
    async (value) => {
      await persist({ ...state, premium: value });
    },
    [state, persist],
  );

  const resetAccount = useCallback<AppContextValue["resetAccount"]>(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    const fresh = bumpStreak(defaultState);
    await persist(fresh);
  }, [persist]);

  const value = useMemo<AppContextValue>(() => {
    const totalAllowed = state.premium
      ? FREE_DAILY_MINUTES + 20
      : FREE_DAILY_MINUTES;
    const freeMinutesRemaining = Math.max(
      0,
      totalAllowed - state.freeMinutesUsed,
    );
    const adsRemainingToday = Math.max(0, DAILY_AD_LIMIT - state.adsWatchedToday);
    return {
      state,
      ready,
      freeMinutesRemaining,
      adsRemainingToday,
      completeOnboarding,
      addCoins,
      spendCoins,
      watchAdReward,
      consumeFreeMinutes,
      recordCall,
      completeTask,
      completeLesson,
      setPremium,
      resetAccount,
    };
  }, [
    state,
    ready,
    completeOnboarding,
    addCoins,
    spendCoins,
    watchAdReward,
    consumeFreeMinutes,
    recordCall,
    completeTask,
    completeLesson,
    setPremium,
    resetAccount,
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
};
