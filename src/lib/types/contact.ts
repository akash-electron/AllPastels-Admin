export type MessageStatus = "new" | "replied" | "closed";

export interface Msg {
  _id: string;
  name: string;
  email: string;
  orderNumber: string | null;
  topic: string;
  message: string;
  status: MessageStatus;
  adminNote: string;
  repliedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ip?: string;
}

export interface MessageSummary {
  new: number;
  replied: number;
  closed: number;
  all: number;
}

export interface MessagesPage {
  data: Msg[];
  total: number;
  page: number;
  limit: number;
  summary: MessageSummary;
}

// Convenience alias kept for callers that prefer a longer name.
export type ContactMessage = Msg;
