export interface AuthCredentials {
  mobile: string;
  password: string;
}

export interface FarmerProfile {
  name: string | null;
  village: string | null;
  district: string | null;
  crop: string | null;
  land_area: number | null;
  crop_stage: string | null;
  water_source: WaterSource | null;
  available_water: number | null;
  preferred_language: "తెలుగు";
}

export const WATER_SOURCE_OPTIONS = [
  "బోర్‌వెల్",
  "బావి",
  "కాలువ",
  "వర్షపు నీరు",
  "ఇతర",
] as const;

export type WaterSource = (typeof WATER_SOURCE_OPTIONS)[number];

export type FarmerProfileUpdate = Omit<FarmerProfile, "preferred_language"> & {
  preferred_language: "తెలుగు";
  name: string;
  village: string;
  district: string;
  crop: string;
  land_area: number;
  crop_stage: string;
  water_source: WaterSource;
  available_water: number;
};

export interface AuthUser {
  id: string;
  mobile: string;
  farmer_profile: FarmerProfile;
}

export interface FarmerRegistration extends AuthCredentials {
  name: string;
  village: string;
  district: string;
  preferred_language: "తెలుగు";
}

export type WaterWarningLevel = "not_set" | "normal" | "low" | "very_low";

export interface WaterBudgetSummary {
  available_water: number | null;
  total_used: number;
  remaining_water: number | null;
  usage_percent: number;
  remaining_percent: number | null;
  warning_level: WaterWarningLevel;
  low_warning_percent: number;
  very_low_warning_percent: number;
  unit: "liters";
  period_start: string;
  period_end: string;
}

export interface WaterUsageEntry {
  id: string;
  amount: number;
  unit: "liters";
  notes: string | null;
  recorded_at: string;
}
