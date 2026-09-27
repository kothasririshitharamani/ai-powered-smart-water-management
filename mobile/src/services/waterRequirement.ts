import { apiRequest } from "../api/client";
import type {
  WaterRequirementEstimate,
  WaterRequirementResponse,
} from "../types/auth";

interface HistoryResponse {
  history: WaterRequirementEstimate[];
}

export async function getWaterRequirement(): Promise<WaterRequirementResponse> {
  return apiRequest<WaterRequirementResponse>("/water-requirement");
}

export async function calculateWaterRequirement(): Promise<WaterRequirementResponse> {
  return apiRequest<WaterRequirementResponse>("/water-requirement/calculate", {
    method: "POST",
  });
}

export async function getWaterRequirementHistory(): Promise<WaterRequirementEstimate[]> {
  const response = await apiRequest<HistoryResponse>(
    "/water-requirement/history",
  );
  return response.history;
}
