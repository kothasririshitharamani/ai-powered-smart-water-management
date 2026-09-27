import { apiRequest } from "../api/client";
import type { WeatherAlert } from "../types/auth";

interface WeatherAlertsResponse {
  alerts: WeatherAlert[];
  unread_count: number;
}

interface SingleWeatherAlertResponse {
  alert: WeatherAlert;
}

export async function getWeatherAlerts(
  unreadOnly = false,
): Promise<{ alerts: WeatherAlert[]; unread_count: number }> {
  const query = unreadOnly ? "?unread=true" : "";
  return apiRequest<WeatherAlertsResponse>(`/weather-alerts${query}`);
}

export async function createWeatherAlert(data: {
  title: string;
  details: string;
  alert_type: string;
  severity: string;
  starts_at: string;
  ends_at?: string | null;
}): Promise<WeatherAlert> {
  const response = await apiRequest<SingleWeatherAlertResponse>(
    "/weather-alerts",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  return response.alert;
}

export async function markWeatherAlertRead(
  alertId: string,
): Promise<WeatherAlert> {
  const response = await apiRequest<SingleWeatherAlertResponse>(
    `/weather-alerts/${alertId}/read`,
    {
      method: "PATCH",
    },
  );
  return response.alert;
}
