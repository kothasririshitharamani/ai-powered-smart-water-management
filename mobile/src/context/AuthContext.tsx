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
import {
  getWeatherAlerts,
  markWeatherAlertRead,
} from "../services/weather";
import {
  calculateWaterRequirement,
  getWaterRequirement,
} from "../services/waterRequirement";
import {
  addFarmerCrop,
  deleteFarmerCrop,
  getScarcityAllocation,
  saveScarcityAllocation,
} from "../services/scarcityAllocation";
import type {
  AddFarmerCropPayload,
  FarmerCrop,
  SaveAllocationPayload,
  ScarcityAllocationSummary,
  WeatherAlert,
  WaterRequirementEstimate,
} from "../types/auth";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  profile: FarmerProfile | null;
  waterBudget: WaterBudgetSummary | null;
  waterUsage: WaterUsageEntry[];
  waterLoading: boolean;
  waterError: string | null;
  weatherAlerts: WeatherAlert[];
  unreadAlertsCount: number;
  weatherAlertsLoading: boolean;
  weatherAlertsError: string | null;
  waterEstimate: WaterRequirementEstimate | null;
  waterEstimateMissingFields: string[];
  waterEstimateLoading: boolean;
  waterEstimateError: string | null;
  scarcitySummary: ScarcityAllocationSummary | null;
  scarcityLoading: boolean;
  scarcityError: string | null;
  startupMessage: string | null;
  profileSavedMessage: string | null;
  login(credentials: AuthCredentials): Promise<void>;
  register(details: FarmerRegistration): Promise<AuthUser>;
  refreshProfile(): Promise<FarmerProfile>;
  saveProfile(details: FarmerProfileUpdate): Promise<FarmerProfile>;
  refreshWater(): Promise<void>;
  refreshWeatherAlerts(): Promise<void>;
  markAlertRead(alertId: string): Promise<void>;
  refreshWaterEstimate(): Promise<void>;
  calculateNewWaterEstimate(): Promise<void>;
  refreshScarcityAllocation(): Promise<void>;
  saveAllocation(payload: SaveAllocationPayload): Promise<void>;
  addNewCrop(payload: AddFarmerCropPayload): Promise<FarmerCrop>;
  removeCrop(cropId: string): Promise<void>;
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
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [weatherAlertsLoading, setWeatherAlertsLoading] = useState(false);
  const [weatherAlertsError, setWeatherAlertsError] = useState<string | null>(
    null,
  );
  const [waterEstimate, setWaterEstimate] =
    useState<WaterRequirementEstimate | null>(null);
  const [waterEstimateMissingFields, setWaterEstimateMissingFields] = useState<
    string[]
  >([]);
  const [waterEstimateLoading, setWaterEstimateLoading] = useState(false);
  const [waterEstimateError, setWaterEstimateError] = useState<string | null>(
    null,
  );
  const [scarcitySummary, setScarcitySummary] =
    useState<ScarcityAllocationSummary | null>(null);
  const [scarcityLoading, setScarcityLoading] = useState(false);
  const [scarcityError, setScarcityError] = useState<string | null>(null);

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
    void refreshWaterEstimate().catch(() => undefined);
    return updatedProfile;
  }

  async function saveWaterBudget(amount: number) {
    await updateWaterBudget(amount);
    await refreshWater();
    void refreshScarcityAllocation().catch(() => undefined);
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
    void refreshScarcityAllocation().catch(() => undefined);
  }

  const refreshWeatherAlerts = useCallback(async () => {
    setWeatherAlertsLoading(true);
    setWeatherAlertsError(null);
    try {
      const data = await getWeatherAlerts();
      setWeatherAlerts(data.alerts);
      setUnreadAlertsCount(data.unread_count);
    } catch (error) {
      setWeatherAlertsError(errorMessage(error));
      throw error;
    } finally {
      setWeatherAlertsLoading(false);
    }
  }, []);

  const markAlertRead = useCallback(async (alertId: string) => {
    const updated = await markWeatherAlertRead(alertId);
    setWeatherAlerts((current) =>
      current.map((item) => (item.id === alertId ? updated : item)),
    );
    setUnreadAlertsCount((prev) => Math.max(0, prev - 1));
  }, []);

  const refreshWaterEstimate = useCallback(async () => {
    setWaterEstimateLoading(true);
    setWaterEstimateError(null);
    try {
      const data = await getWaterRequirement();
      setWaterEstimate(data.estimate);
      setWaterEstimateMissingFields(data.missing_fields || []);
    } catch (error) {
      setWaterEstimateError(errorMessage(error));
      throw error;
    } finally {
      setWaterEstimateLoading(false);
    }
  }, []);

  const calculateNewWaterEstimate = useCallback(async () => {
    setWaterEstimateLoading(true);
    setWaterEstimateError(null);
    try {
      const data = await calculateWaterRequirement();
      setWaterEstimate(data.estimate);
      setWaterEstimateMissingFields(data.missing_fields || []);
    } catch (error) {
      setWaterEstimateError(errorMessage(error));
      throw error;
    } finally {
      setWaterEstimateLoading(false);
    }
  }, []);

  const refreshScarcityAllocation = useCallback(async () => {
    setScarcityLoading(true);
    setScarcityError(null);
    try {
      const data = await getScarcityAllocation();
      setScarcitySummary(data);
    } catch (error) {
      setScarcityError(errorMessage(error));
      throw error;
    } finally {
      setScarcityLoading(false);
    }
  }, []);

  const saveAllocation = useCallback(
    async (payload: SaveAllocationPayload) => {
      setScarcityLoading(true);
      setScarcityError(null);
      try {
        const res = await saveScarcityAllocation(payload);
        setScarcitySummary(res.summary);
      } catch (error) {
        setScarcityError(errorMessage(error));
        throw error;
      } finally {
        setScarcityLoading(false);
      }
    },
    [],
  );

  const addNewCrop = useCallback(
    async (payload: AddFarmerCropPayload) => {
      setScarcityLoading(true);
      setScarcityError(null);
      try {
        const crop = await addFarmerCrop(payload);
        const data = await getScarcityAllocation();
        setScarcitySummary(data);
        return crop;
      } catch (error) {
        setScarcityError(errorMessage(error));
        throw error;
      } finally {
        setScarcityLoading(false);
      }
    },
    [],
  );

  const removeCrop = useCallback(
    async (cropId: string) => {
      setScarcityLoading(true);
      setScarcityError(null);
      try {
        await deleteFarmerCrop(cropId);
        const data = await getScarcityAllocation();
        setScarcitySummary(data);
      } catch (error) {
        setScarcityError(errorMessage(error));
        throw error;
      } finally {
        setScarcityLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (status === "authenticated") {
      void refreshWater().catch(() => undefined);
      void refreshWeatherAlerts().catch(() => undefined);
      void refreshWaterEstimate().catch(() => undefined);
      void refreshScarcityAllocation().catch(() => undefined);
    } else {
      setWaterBudget(null);
      setWaterUsage([]);
      setWaterError(null);
      setWaterLoading(false);
      setWeatherAlerts([]);
      setUnreadAlertsCount(0);
      setWeatherAlertsLoading(false);
      setWeatherAlertsError(null);
      setWaterEstimate(null);
      setWaterEstimateMissingFields([]);
      setWaterEstimateLoading(false);
      setWaterEstimateError(null);
      setScarcitySummary(null);
      setScarcityLoading(false);
      setScarcityError(null);
    }
  }, [
    status,
    refreshWater,
    refreshWeatherAlerts,
    refreshWaterEstimate,
    refreshScarcityAllocation,
  ]);

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
        weatherAlerts,
        unreadAlertsCount,
        weatherAlertsLoading,
        weatherAlertsError,
        waterEstimate,
        waterEstimateMissingFields,
        waterEstimateLoading,
        waterEstimateError,
        scarcitySummary,
        scarcityLoading,
        scarcityError,
        startupMessage,
        profileSavedMessage,
        login,
        register,
        refreshProfile,
        saveProfile,
        refreshWater,
        refreshWeatherAlerts,
        markAlertRead,
        refreshWaterEstimate,
        calculateNewWaterEstimate,
        refreshScarcityAllocation,
        saveAllocation,
        addNewCrop,
        removeCrop,
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
