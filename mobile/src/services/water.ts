import { apiRequest } from "../api/client";
import type { WaterBudgetSummary, WaterUsageEntry } from "../types/auth";

interface BudgetResponse {
  budget: WaterBudgetSummary;
}

interface UsageListResponse {
  usages: WaterUsageEntry[];
}

export async function getWaterBudget(): Promise<WaterBudgetSummary> {
  const response = await apiRequest<BudgetResponse>("/water-budget");
  return response.budget;
}

export async function updateWaterBudget(
  amount: number,
): Promise<WaterBudgetSummary> {
  const response = await apiRequest<BudgetResponse>("/water-budget", {
    method: "POST",
    body: JSON.stringify({ amount, unit: "liters" }),
  });
  return response.budget;
}

export async function getWaterUsage(): Promise<WaterUsageEntry[]> {
  const response = await apiRequest<UsageListResponse>("/water-usage");
  return response.usages;
}

export async function createWaterUsage(
  amount: number,
  notes: string,
): Promise<WaterUsageEntry> {
  const response = await apiRequest<{ usage: WaterUsageEntry }>(
    "/water-usage",
    {
      method: "POST",
      body: JSON.stringify({ amount, unit: "liters", notes }),
    },
  );
  return response.usage;
}
