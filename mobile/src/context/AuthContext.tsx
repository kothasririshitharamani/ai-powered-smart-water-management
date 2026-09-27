import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { ApiError, setUnauthorizedHandler } from "../api/client";
import { translate } from "../i18n";
import type {
  AuthCredentials,
  AuthUser,
  FarmerProfile,
  FarmerProfileUpdate,
  FarmerRegistration,
  WaterBudgetSummary,
  WaterUsageEntry,
} from "../types/auth";
import {
  getCurrentUser,
  login as authenticate,
  register as createAccount,
} from "../services/auth";
import {
  clearAuthSession,
  readAccessToken,
  storeAuthSession,
} from "../services/tokenStorage";
import { getFarmerProfile, updateFarmerProfile } from "../services/profile";
import {
  createWaterUsage,
  getWaterBudget,
  getWaterUsage,
  updateWaterBudget,
} from "../services/water";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  profile: FarmerProfile | null;
  waterBudget: WaterBudgetSummary | null;
  waterUsage: WaterUsageEntry[];
  waterLoading: boolean;
  waterError: string | null;
  startupMessage: string | null;
  profileSavedMessage: string | null;
  login(credentials: AuthCredentials): Promise<void>;
  register(details: FarmerRegistration): Promise<AuthUser>;
  refreshProfile(): Promise<FarmerProfile>;
  saveProfile(details: FarmerProfileUpdate): Promise<FarmerProfile>;
  refreshWater(): Promise<void>;
  saveWaterBudget(amount: number): Promise<void>;
  recordWaterUsage(amount: number, notes: string): Promise<void>;
  clearProfileSavedMessage(): void;
  logout(): Promise<void>;
  retryRestore(): Promise<void>;
  clearStartupMessage(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : translate("requestFailed");
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [startupMessage, setStartupMessage] = useState<string | null>(null);
  const [profileSavedMessage, setProfileSavedMessage] = useState<string | null>(
    null,
  );
  const [waterBudget, setWaterBudget] = useState<WaterBudgetSummary | null>(
    null,
  );
  const [waterUsage, setWaterUsage] = useState<WaterUsageEntry[]>([]);
  const [waterLoading, setWaterLoading] = useState(false);
  const [waterError, setWaterError] = useState<string | null>(null);

  const profile = user?.farmer_profile ?? null;

  const refreshWater = useCallback(async () => {
    setWaterLoading(true);
    setWaterError(null);
    try {
      const [budget, usage] = await Promise.all([
        getWaterBudget(),
        getWaterUsage(),
      ]);
      setWaterBudget(budget);
      setWaterUsage(usage);
      setUser((currentUser) => {
        if (!currentUser || budget.available_water === null) return currentUser;
        if (
          currentUser.farmer_profile.available_water === budget.available_water
        ) {
          return currentUser;
        }
        const updatedUser = {
          ...currentUser,
          farmer_profile: {
            ...currentUser.farmer_profile,
            available_water: budget.available_water,
          },
        };
        void readAccessToken().then((token) => {
          if (token) void storeAuthSession(token, updatedUser);
        });
        return updatedUser;
      });
    } catch (error) {
      setWaterError(errorMessage(error));
      throw error;
    } finally {
      setWaterLoading(false);
    }
  }, []);

  async function restoreSession() {
    setStatus("loading");
    setStartupMessage(null);
    try {
      const token = await readAccessToken();
      if (!token) {
        await clearAuthSession();
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      const restoredUser = await getCurrentUser();
      await storeAuthSession(token, restoredUser);
      setUser(restoredUser);
      setStatus("authenticated");
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        await clearAuthSession().catch(() => undefined);
      }
      setUser(null);
      setStartupMessage(errorMessage(error));
      setStatus("unauthenticated");
    }
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearAuthSession().catch(() => undefined);
      setUser(null);
      setStartupMessage(translate("sessionExpired"));
      setStatus("unauthenticated");
    });
    void restoreSession();
    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(credentials: AuthCredentials) {
    const response = await authenticate(credentials);
    await storeAuthSession(response.access_token, response.user);
    setStartupMessage(null);
    setProfileSavedMessage(null);
    setUser(response.user);
    setStatus("authenticated");
  }

  async function register(details: FarmerRegistration) {
    return createAccount(details);
  }

  const refreshProfile = useCallback(async () => {
    const updatedProfile = await getFarmerProfile();
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      return { ...currentUser, farmer_profile: updatedProfile };
    });
    return updatedProfile;
  }, []);

  async function saveProfile(details: FarmerProfileUpdate) {
    const updatedProfile = await updateFarmerProfile(details);
    const token = await readAccessToken();
    if (!token || !user) throw new Error(translate("sessionExpired"));
    const updatedUser = { ...user, farmer_profile: updatedProfile };
    await storeAuthSession(token, updatedUser);
    setUser(updatedUser);
    setProfileSavedMessage(translate("profileSaveSuccess"));
    await refreshWater();
    return updatedProfile;
  }

  async function saveWaterBudget(amount: number) {
    await updateWaterBudget(amount);
    await refreshWater();
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const updatedUser = {
        ...currentUser,
        farmer_profile: {
          ...currentUser.farmer_profile,
          available_water: amount,
        },
      };
      void readAccessToken().then((token) => {
        if (token) void storeAuthSession(token, updatedUser);
      });
      return updatedUser;
    });
  }

  async function recordWaterUsage(amount: number, notes: string) {
    await createWaterUsage(amount, notes);
    await refreshWater();
  }

  useEffect(() => {
    if (status === "authenticated") {
      void refreshWater().catch(() => undefined);
    } else {
      setWaterBudget(null);
      setWaterUsage([]);
      setWaterError(null);
      setWaterLoading(false);
    }
  }, [status, refreshWater]);

  async function logout() {
    await clearAuthSession();
    setUser(null);
    setStatus("unauthenticated");
    setStartupMessage(null);
    setProfileSavedMessage(null);
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        profile,
        waterBudget,
        waterUsage,
        waterLoading,
        waterError,
        startupMessage,
        profileSavedMessage,
        login,
        register,
        refreshProfile,
        saveProfile,
        refreshWater,
        saveWaterBudget,
        recordWaterUsage,
        logout,
        retryRestore: restoreSession,
        clearStartupMessage: () => setStartupMessage(null),
        clearProfileSavedMessage: () => setProfileSavedMessage(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing.");
  return context;
}
