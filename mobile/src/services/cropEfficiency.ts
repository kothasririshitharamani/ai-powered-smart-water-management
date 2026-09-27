import { apiRequest } from "../api/client";
import type {
  CropComparisonPayload,
  CropComparisonResponse,
  CropEfficiencyListResponse,
} from "../types/auth";

export async function getCropEfficiencyList(): Promise<CropEfficiencyListResponse> {
  return apiRequest<CropEfficiencyListResponse>("/crop-efficiency");
}

export async function compareCrops(
  payload: CropComparisonPayload,
): Promise<CropComparisonResponse> {
  return apiRequest<CropComparisonResponse>("/crop-efficiency/compare", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
