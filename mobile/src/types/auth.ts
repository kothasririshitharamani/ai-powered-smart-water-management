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

export type WeatherAlertSeverity = "low" | "medium" | "high" | "critical";

export type WeatherAlertType =
  | "heavy_rain"
  | "thunderstorm"
  | "heatwave"
  | "flood"
  | "cyclone"
  | "dry_spell"
  | "general";

export interface WeatherAlert {
  id: string;
  alert_type: string;
  title: string;
  details: string;
  severity: WeatherAlertSeverity;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  is_read: boolean;
}

export interface WaterRequirementEstimate {
  id: string | null;
  crop: string;
  land_area_acres: number;
  crop_stage: string;
  stage_factor: number;
  base_liters_per_acre: number;
  estimated_liters: number;
  available_water_liters: number | null;
  remaining_water_liters: number | null;
  water_balance_liters: number | null;
  is_sufficient: boolean | null;
  explanation: string;
  created_at: string;
}

export interface WaterRequirementResponse {
  has_required_inputs: boolean;
  missing_fields: string[];
  message?: string;
  estimate: WaterRequirementEstimate | null;
}

export interface FarmerCrop {
  id: string;
  crop_name: string;
  area_acres: number;
  crop_stage: string | null;
  priority: number;
  created_at: string | null;
}

export interface WaterAllocationItem {
  id?: string;
  crop_name: string;
  area_acres: number;
  allocated_liters: number;
  percentage_of_remaining: number;
  liters_per_acre: number;
  priority: number;
  notes?: string | null;
}

export interface WaterAllocationPlan {
  id: string;
  total_budget_liters: number;
  already_used_liters: number;
  remaining_water_liters: number;
  total_allocated_liters: number;
  unallocated_water_liters: number;
  allocation_percentage: number;
  status: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  items: WaterAllocationItem[];
}

export type ScarcityLevel =
  | "not_set"
  | "exhausted"
  | "critical"
  | "high"
  | "moderate"
  | "normal";

export interface ScarcityAllocationSummary {
  available_water: number | null;
  total_used: number;
  remaining_water: number | null;
  remaining_percent: number | null;
  total_allocated: number;
  unallocated_water: number;
  can_allocate: boolean;
  scarcity_level: ScarcityLevel;
  message: string | null;
  crops: FarmerCrop[];
  current_plan: WaterAllocationPlan | null;
  unit: "liters";
}

export interface SaveAllocationPayload {
  items: {
    crop_name: string;
    area_acres: number;
    allocated_liters: number;
    priority?: number;
    notes?: string;
  }[];
  notes?: string;
}

export interface AddFarmerCropPayload {
  crop_name: string;
  area_acres: number;
  crop_stage?: string;
  priority?: number;
}

export interface CropEfficiencyItem {
  crop_key: string;
  crop_name_te: string;
  crop_name_en: string;
  water_requirement_liters_per_acre: number;
  water_requirement_mm: number;
  efficiency_category_key: "very_high" | "high" | "moderate" | "low";
  efficiency_category_te: string;
  water_use_intensity_te: string;
  water_savings_vs_paddy_percent: number;
  drought_resilience_te: string;
  season_te: string;
  duration_days: string;
  soil_suitability_te: string;
  key_benefit_te: string;
  total_water_liters?: number;
  water_savings_vs_selected_max_liters?: number;
  water_savings_vs_selected_max_percent?: number;
  cultivable_acres_with_remaining_water?: number | null;
}

export interface CropEfficiencyListResponse {
  crops: CropEfficiencyItem[];
  paddy_baseline_liters_per_acre: number;
  source: string;
  disclaimer: string;
  unit: string;
}

export interface CropComparisonPayload {
  crop_keys: string[];
  land_area_acres?: number;
}

export interface CropComparisonResponse {
  land_area_acres: number;
  selected_crops: CropEfficiencyItem[];
  most_water_efficient: {
    crop_key: string;
    crop_name_te: string;
    total_water_liters: number;
  };
  least_water_efficient: {
    crop_key: string;
    crop_name_te: string;
    total_water_liters: number;
  };
  max_water_savings_liters: number;
  max_water_savings_percent: number;
  farmer_context: {
    profile_crop: string | null;
    profile_land_area: number | null;
    remaining_water_liters: number | null;
    available_water_liters: number | null;
  };
  source: string;
  disclaimer: string;
  unit: string;
}

export interface SoilAnalysisReport {
  id: string;
  apparent_soil_characteristics: string;
  possible_moisture_condition: string;
  visible_issues: string[];
  recommended_next_steps: string[];
  uncertainty_and_limitations: string;
  requires_laboratory_testing: boolean;
  disclaimer_te: string;
  created_at: string;
}

export interface SoilAnalysisResponse {
  report: SoilAnalysisReport;
  message: string;
}

export interface SoilAnalysisPayload {
  image_base64: string;
  mime_type?: string;
}

export interface VoiceAssistantQueryPayload {
  query?: string;
  audio_base64?: string;
}

export interface VoiceAssistantResponse {
  query: string;
  intent: string;
  response_text: string;
  data?: Record<string, unknown>;
}

export interface VoiceChatMessage {
  id: string;
  sender: "farmer" | "assistant";
  text: string;
  timestamp: string;
  intent?: string;
  data?: Record<string, unknown>;
}

export interface GeneralPreparednessItem {
  id: string;
  title_te: string;
  action_te: string;
  importance_te: string;
}

export interface ActiveAlertActionItem {
  id: string;
  title_te: string;
  action_te: string;
  urgency_te: string;
}

export interface DisasterCategoryItem {
  category_key: "flood" | "drought" | "cyclone" | string;
  category_name_te: string;
  category_name_en: string;
  icon: string;
  summary_te: string;
  has_active_alert: boolean;
  active_alert_count: number;
  general_preparedness: GeneralPreparednessItem[];
  active_alert_actions: ActiveAlertActionItem[];
}

export interface ActiveAlertGuidance {
  alert: WeatherAlert;
  disaster_category: "flood" | "drought" | "cyclone" | string;
  category_name_te: string;
  urgency_level: string;
  emergency_actions: ActiveAlertActionItem[];
}

export interface DisasterPreparednessResponse {
  has_active_alerts: boolean;
  active_alert_count: number;
  status_message_te: string;
  disaster_occurring: boolean;
  active_alerts_guidance: ActiveAlertGuidance[];
  general_categories: DisasterCategoryItem[];
  disclaimer_te: string;
}
