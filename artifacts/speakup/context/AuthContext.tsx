import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type UserProfile,
  customFetch,
} from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const TOKEN_KEY = "buddytalk.auth.token.v1";
const USER_KEY = "buddytalk.auth.user.v1";

type AuthResponse = {
  token: string;
  expiresAt: string;
  user: UserProfile;
};

type AuthContextValue = {
  user: UserProfile | null;
  token: string | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  requestMagicLink: (email: string) => Promise<{ devToken: string | null }>;
  verifyMagicLink: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (
    patch: Partial<{
      name: string;
      level: "Beginner" | "Intermediate" | "Advanced" | null;
      goal: "job" | "study" | "daily" | "travel" | null;
      interests: string[];
      onboarded: boolean;
      role: "learner" | "mentor";
    }>,
  ) => Promise<UserProfile>;
  refresh: () => Promise<void>;
  /** Request a 6-digit password reset code. Returns devCode in non-production. */
  forgotPassword: (email: string) => Promise<{ devCode: string | null }>;
  /** Verify a reset code and set a new password. Auto-signs the user in on success. */
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  /** Send a phone OTP. Returns devOtp in non-production. */
  sendPhoneOTP: (phone: string, purpose: "signin" | "signup") => Promise<{ devOtp: string | null }>;
  /** Verify a phone OTP and sign in (creating an account for new users). */
  verifyPhoneOTP: (phone: string, code: string, name?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let _tokenInMemory: string | null = null;
export function getAuthToken(): string | null {
  return _tokenInMemory;
}

async function persistAuth(token: string, user: UserProfile) {
  _tokenInMemory = token;
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

async function clearAuth() {
  _tokenInMemory = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState<boolean>(false);

  // Hydrate from storage
  useEffect(() => {
    (async () => {
      try {
        const [[, t], [, u]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
        if (t) {
          _tokenInMemory = t;
          setToken(t);
        }
        if (u) {
          try {
            setUser(JSON.parse(u) as UserProfile);
          } catch {
            // ignore corrupt cache
          }
        }
        // If we have a token, refresh from server in the background
        if (t) {
          try {
            const fresh = await customFetch<UserProfile>("/auth/me", {
              method: "GET",
              responseType: "json",
            });
            setUser(fresh);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
          } catch {
            // Token invalid → sign out silently
            await clearAuth();
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await customFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      responseType: "json",
    });
    await persistAuth(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await customFetch<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
        responseType: "json",
      });
      await persistAuth(res.token, res.user);
      setToken(res.token);
      setUser(res.user);
    },
    [],
  );

  const forgotPassword = useCallback(async (email: string) => {
    const res = await customFetch<{ sent: boolean; devCode: string | null }>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email }),
        responseType: "json",
      },
    );
    return { devCode: res.devCode ?? null };
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      const res = await customFetch<AuthResponse>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword }),
        responseType: "json",
      });
      await persistAuth(res.token, res.user);
      setToken(res.token);
      setUser(res.user);
    },
    [],
  );

  const sendPhoneOTP = useCallback(
    async (phone: string, purpose: "signin" | "signup") => {
      const res = await customFetch<{ sent: boolean; devOtp: string | null }>(
        "/auth/otp/send",
        {
          method: "POST",
          body: JSON.stringify({ phone, purpose }),
          responseType: "json",
        },
      );
      return { devOtp: res.devOtp ?? null };
    },
    [],
  );

  const verifyPhoneOTP = useCallback(
    async (phone: string, code: string, name?: string) => {
      const res = await customFetch<AuthResponse>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code, ...(name ? { name } : {}) }),
        responseType: "json",
      });
      await persistAuth(res.token, res.user);
      setToken(res.token);
      setUser(res.user);
    },
    [],
  );

  const requestMagicLink = useCallback(async (email: string) => {
    const res = await customFetch<{ sent: boolean; devToken: string | null }>(
      "/auth/magic-link",
      {
        method: "POST",
        body: JSON.stringify({ email }),
        responseType: "json",
      },
    );
    return { devToken: res.devToken ?? null };
  }, []);

  const verifyMagicLink = useCallback(async (linkToken: string) => {
    const res = await customFetch<AuthResponse>("/auth/magic-link/verify", {
      method: "POST",
      body: JSON.stringify({ token: linkToken }),
      responseType: "json",
    });
    await persistAuth(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await customFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    await clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(
    async (patch) => {
      const updated = await customFetch<UserProfile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify(patch),
        responseType: "json",
      });
      setUser(updated);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!_tokenInMemory) return;
    try {
      const fresh = await customFetch<UserProfile>("/auth/me", {
        method: "GET",
        responseType: "json",
      });
      setUser(fresh);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      ready,
      signIn,
      signUp,
      forgotPassword,
      resetPassword,
      sendPhoneOTP,
      verifyPhoneOTP,
      requestMagicLink,
      verifyMagicLink,
      signOut,
      updateProfile,
      refresh,
    }),
    [
      user,
      token,
      ready,
      signIn,
      signUp,
      forgotPassword,
      resetPassword,
      sendPhoneOTP,
      verifyPhoneOTP,
      requestMagicLink,
      verifyMagicLink,
      signOut,
      updateProfile,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
