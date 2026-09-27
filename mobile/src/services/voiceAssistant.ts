import { apiRequest } from "../api/client";
import type {
  VoiceAssistantQueryPayload,
  VoiceAssistantResponse,
} from "../types/auth";

export async function askVoiceAssistant(
  payload: VoiceAssistantQueryPayload,
): Promise<VoiceAssistantResponse> {
  return apiRequest<VoiceAssistantResponse>("/voice-assistant/query", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
