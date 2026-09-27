import type { FarmerProfileUpdate } from "../../src/types/auth";

export const farmerFixture = {
  name: "రమేష్",
  mobile: "9000000001",
  password: "Test@1234",
  village: "కొత్తపల్లి",
  district: "కృష్ణా",
};

export const farmerProfileFixture: FarmerProfileUpdate = {
  name: farmerFixture.name,
  village: farmerFixture.village,
  district: farmerFixture.district,
  crop: "వరి",
  land_area: 2,
  crop_stage: "వృద్ధి దశ",
  water_source: "బోర్‌వెల్",
  available_water: 2400,
  preferred_language: "తెలుగు",
};

export const editedFarmerName = "రమేష్ రైతు";
export const editedAvailableWater = 2500;
export const waterBudgetUpdateAmount = 3000;
