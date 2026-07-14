import api from "@/lib/axios";

import type {
  CloseSessionPayload,
  CloseSessionResponse,
  OpenSessionPayload,
  OpenSessionResponse,
} from "@/types/session";

export async function openSession(
  payload: OpenSessionPayload,
): Promise<OpenSessionResponse> {
  const res = await api.post("/store-session/open", payload);
  return res.data;
}

export async function CloseSession(
  payload: CloseSessionPayload,
): Promise<CloseSessionResponse> {
  const res = await api.put("/store-session/close", payload);
  return res.data;
}

export async function hasSession(): Promise<boolean> {
  const res = await api.get("/store-session/my-session");
  return res.data;
}
