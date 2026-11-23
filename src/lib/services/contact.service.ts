import { apiFetchEnvelope, apiGet, apiPatch, buildQuery } from "@/lib/api";
import { byId, ENDPOINTS } from "@/lib/constants/endpoints";
import type {
  MessageStatus,
  MessagesPage,
  Msg,
} from "@/lib/types/contact";

export interface ListMessagesParams {
  status?: MessageStatus | "";
  q?: string;
  page?: number;
  limit?: number;
}

export async function listMessages(
  params: ListMessagesParams = {},
): Promise<MessagesPage> {
  const suffix = buildQuery({
    status: params.status,
    q: params.q?.trim(),
    page: params.page,
    limit: params.limit,
  });
  const envelope = await apiFetchEnvelope<Msg[]>(
    `${ENDPOINTS.contact}${suffix}`,
  );
  const raw = envelope as unknown as {
    data?: Msg[];
    total?: number;
    page?: number;
    limit?: number;
    summary?: MessagesPage["summary"];
  };
  return {
    data: raw.data ?? [],
    total: raw.total ?? 0,
    page: raw.page ?? params.page ?? 1,
    limit: raw.limit ?? params.limit ?? 20,
    summary: raw.summary ?? { new: 0, replied: 0, closed: 0, all: 0 },
  };
}

export function getMessage(id: string): Promise<Msg> {
  return apiGet<Msg>(byId(ENDPOINTS.contact, id));
}

export function updateMessage(
  id: string,
  payload: { status?: MessageStatus; adminNote?: string },
): Promise<Msg> {
  return apiPatch<Msg>(byId(ENDPOINTS.contact, id), payload);
}
