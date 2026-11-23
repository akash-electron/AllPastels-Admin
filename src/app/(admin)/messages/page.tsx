import type { Metadata } from "next";
import { MessagesPage } from "@/components/messages/MessagesPage";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesRoutePage() {
  return <MessagesPage />;
}
