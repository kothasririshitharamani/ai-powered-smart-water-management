import { apiRequest } from "../api/client";
import type {
  AddFarmerCropPayload,
  FarmerCrop,
  SaveAllocationPayload,
  ScarcityAllocationSummary,
  WaterAllocationPlan,
} from "../types/auth";

interface CropsResponse {
  crops: FarmerCrop[];
}

interface CropResponse {
  crop: FarmerCrop;
  message: string;
}

interface SavePlanResponse {
  plan: WaterAllocationPlan;
  summary: ScarcityAllocationSummary;
  message: string;
}

export async function getScarcityAllocation(): Promise<ScarcityAllocationSummary> {
  return apiRequest<ScarcityAllocationSummary>("/scarcity-allocation");
}

export async function saveScarcityAllocation(
  payload: SaveAllocationPayload,
): Promise<SavePlanResponse> {
  return apiRequest<SavePlanResponse>("/scarcity-allocation", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getFarmerCrops(): Promise<FarmerCrop[]> {
  const response = await apiRequest<CropsResponse>("/scarcity-allocation/crops");
  return response.crops;
}

export async function addFarmerCrop(
  payload: AddFarmerCropPayload,
): Promise<FarmerCrop> {
  const response = await apiRequest<CropResponse>("/scarcity-allocation/crops", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.crop;
}

export async function deleteFarmerCrop(
  cropId: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/scarcity-allocation/crops/${cropId}`, {
    method: "DELETE",
  });
}
