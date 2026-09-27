import { apiRequest } from "../api/client";
import type { FarmerProfile, FarmerProfileUpdate } from "../types/auth";

interface ProfileResponse {
  profile: FarmerProfile & { mobile: string };
}

function withoutMobile(profile: ProfileResponse["profile"]): FarmerProfile {
  const { mobile: _mobile, ...farmerProfile } = profile;
  return farmerProfile;
}

export async function getFarmerProfile(): Promise<FarmerProfile> {
  const response = await apiRequest<ProfileResponse>("/profile");
  return withoutMobile(response.profile);
}

export async function updateFarmerProfile(
  details: FarmerProfileUpdate,
): Promise<FarmerProfile> {
  const response = await apiRequest<ProfileResponse>("/profile", {
    method: "PUT",
    body: JSON.stringify(details),
  });
  return withoutMobile(response.profile);
}

export function isFarmerProfileComplete(
  profile: FarmerProfile | null,
): boolean {
  if (!profile) return false;
  return [
    profile.name,
    profile.village,
    profile.district,
    profile.crop,
    profile.land_area,
    profile.crop_stage,
    profile.water_source,
    profile.available_water,
    profile.preferred_language,
  ].every((value) => value !== null && value !== undefined && value !== "");
}
