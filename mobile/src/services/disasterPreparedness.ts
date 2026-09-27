import { apiRequest } from "../api/client";
import type {
  DisasterPreparednessResponse,
  DisasterCategoryItem,
} from "../types/auth";

export async function fetchDisasterPreparedness(): Promise<DisasterPreparednessResponse> {
  return apiRequest<DisasterPreparednessResponse>("/disaster-preparedness", {
    method: "GET",
  });
}

export async function fetchDisasterCategory(
  categoryKey: string
): Promise<DisasterCategoryItem> {
  return apiRequest<DisasterCategoryItem>(
    `/disaster-preparedness/${encodeURIComponent(categoryKey)}`,
    {
      method: "GET",
    }
  );
}
