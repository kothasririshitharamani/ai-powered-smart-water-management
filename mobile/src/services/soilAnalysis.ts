import { apiRequest } from "../api/client";
import type {
  SoilAnalysisPayload,
  SoilAnalysisReport,
  SoilAnalysisResponse,
} from "../types/auth";

interface HistoryResponse {
  history?: SoilAnalysisReport[];
  reports?: SoilAnalysisReport[];
}

interface LatestResponse {
  report: SoilAnalysisReport | null;
}

export async function analyzeSoilImage(
  payload: SoilAnalysisPayload,
): Promise<SoilAnalysisResponse> {
  return apiRequest<SoilAnalysisResponse>("/soil-analysis", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSoilAnalysisHistory(): Promise<SoilAnalysisReport[]> {
  const response = await apiRequest<HistoryResponse>("/soil-analysis/history");
  return response.history ?? response.reports ?? [];
}

export async function getLatestSoilAnalysis(): Promise<SoilAnalysisReport | null> {
  const response = await apiRequest<LatestResponse>("/soil-analysis/latest");
  return response.report;
}
