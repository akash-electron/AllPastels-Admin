"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td, Th } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Spinner } from "@/components/ui/Spinner";
import { FormNotice } from "@/components/ui/FormNotice";
import { RefreshIcon } from "@/components/icons";
import { getErrorMessage } from "@/lib/utils/error";
import { formatDateTime } from "@/lib/utils/dates";
import {
  listMessages,
  updateMessage,
} from "@/lib/services/contact.service";
import type {
  MessageStatus,
  MessagesPage as MessagesPageData,
  Msg,
} from "@/lib/types/contact";

const LIMIT = 20;

const TABS: { key: MessageStatus | "all"; label: string }[] = [
  { key: "new", label: "New" },
  { key: "replied", label: "Replied" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

function tabCount(
  summary: MessagesPageData["summary"],
  key: MessageStatus | "all",
): number {
  if (key === "all") return summary.all;
  if (key === "new") return summary.new;
  if (key === "replied") return summary.replied;
  return summary.closed;
}

export function MessagesPage() {
  const [pageData, setPageData] = useState<MessagesPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState<{
    status: MessageStatus | "";
    q: string;
    page: number;
    limit: number;
  }>({ status: "new", q: "", page: 1, limit: LIMIT });

  const [selected, setSelected] = useState<Msg | null>(null);
  const [noteText, setNoteText] = useState("");
  const [updateBusy, setUpdateBusy] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const [updateNotice, setUpdateNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMessages({
        status: query.status,
        q: query.q,
        page: query.page,
        limit: query.limit,
      });
      setPageData(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load messages"));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((current) =>
        current.q === searchInput.trim()
          ? current
          : { ...current, q: searchInput.trim(), page: 1 },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  async function handleStatus(next: MessageStatus) {
    if (!selected) return;
    setUpdateBusy(true);
    setUpdateNotice(null);
    try {
      const updated = await updateMessage(selected._id, { status: next });
      setSelected(updated);
      setNoteText(updated.adminNote ?? "");
      setUpdateNotice({ tone: "success", message: "Status updated." });
      await load();
    } catch (err) {
      setUpdateNotice({
        tone: "error",
        message: getErrorMessage(err, "Failed to update status"),
      });
    } finally {
      setUpdateBusy(false);
    }
  }

  async function handleSaveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setNoteBusy(true);
    setUpdateNotice(null);
    try {
      const updated = await updateMessage(selected._id, {
        adminNote: noteText,
      });
      setSelected(updated);
      setNoteText(updated.adminNote ?? "");
      setUpdateNotice({ tone: "success", message: "Note saved." });
      await load();
    } catch (err) {
      setUpdateNotice({
        tone: "error",
        message: getErrorMessage(err, "Failed to save note"),
      });
    } finally {
      setNoteBusy(false);
    }
  }

  const summary = pageData?.summary ?? {
    new: 0,
    replied: 0,
    closed: 0,
    all: 0,
  };
  const messages = pageData?.data ?? [];
  const total = pageData?.total ?? 0;
  const currentPage = pageData?.page ?? query.page;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const activeTab: MessageStatus | "all" =
    query.status === "" ? "all" : query.status;

  return (
    <>
      <PageHeader
        title="Messages"
        description="Notes sent from the storefront contact form."
        action={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface disabled:opacity-60"
          >
            <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setQuery((current) => ({
                    ...current,
                    status: tab.key === "all" ? "" : tab.key,
                    page: 1,
                  }));
                }}
                className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-burnt-500 bg-burnt-500 text-floral"
                    : "border-line hover:bg-surface"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-xs ${
                    active ? "bg-floral/20 text-floral" : "bg-surface text-ash-200"
                  }`}
                >
                  {tabCount(summary, tab.key)}
                </span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search messages"
              className="ap-input w-48 sm:w-64"
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Contact messages"
          subtitle={
            pageData === null
              ? "Loading…"
              : `${total} message${total === 1 ? "" : "s"}`
          }
        />
        {loading && pageData === null ? (
          <div className="flex items-center justify-center px-5 py-12" aria-busy="true">
            <Spinner className="border-ash-300 border-t-burnt-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <p className="font-display text-xl">No messages here yet.</p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Received</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Topic</Th>
                <Th>Order</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody aria-busy={loading}>
              {messages.map((msg) => (
                <tr
                  key={msg._id}
                  onClick={() => { setSelected(msg); setNoteText(msg.adminNote ?? ""); setUpdateNotice(null); }}
                  className={`cursor-pointer transition-colors hover:bg-surface ${
                    msg.status === "new" ? "font-bold" : ""
                  }`}
                >
                  <Td className="whitespace-nowrap text-ash-200">
                    {formatDateTime(msg.createdAt)}
                  </Td>
                  <Td>{msg.name}</Td>
                  <Td className="text-ash-200">{msg.email}</Td>
                  <Td className="text-ash-200">{msg.topic}</Td>
                  <Td className="text-ash-200">
                    {msg.orderNumber ? msg.orderNumber : "—"}
                  </Td>
                  <Td>
                    <Badge status={msg.status.charAt(0).toUpperCase() + msg.status.slice(1)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {messages.length > 0 ? (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() =>
                setQuery((current) => ({
                  ...current,
                  page: Math.max(1, current.page - 1),
                }))
              }
              className="rounded-sm border border-line px-3 py-1.5 transition-colors hover:bg-surface disabled:opacity-60"
            >
              Prev
            </button>
            <span className="text-ash-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setQuery((current) => ({
                  ...current,
                  page: current.page + 1,
                }))
              }
              className="rounded-sm border border-line px-3 py-1.5 transition-colors hover:bg-surface disabled:opacity-60"
            >
              Next
            </button>
          </div>
        ) : null}
      </Card>

      {selected ? (
        <Modal
          ariaLabel="Message details"
          panelClassName="w-full max-w-2xl rounded-sm border border-line bg-floral-500 p-5 shadow-xl max-h-[90vh] overflow-y-auto"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="ap-eyebrow text-ash-300">Message</p>
              <h2 className="text-2xl">{selected.name}</h2>
              <p className="mt-1 text-sm text-ash-200">
                Received {formatDateTime(selected.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-sm p-2 text-ash-300 hover:bg-surface"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {updateNotice ? (
            <div className="mb-4">
              <FormNotice tone={updateNotice.tone} message={updateNotice.message} />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="ap-eyebrow text-ash-300">Email</p>
              <p>{selected.email}</p>
            </div>
            <div>
              <p className="ap-eyebrow text-ash-300">Topic</p>
              <p>{selected.topic}</p>
            </div>
            <div>
              <p className="ap-eyebrow text-ash-300">Order</p>
              <p>
                {selected.orderNumber ? (
                  <Link
                    href={`/orders/${selected.orderNumber}`}
                    className="hover:text-burnt-400"
                  >
                    {selected.orderNumber}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="ap-eyebrow text-ash-300">Status</p>
              <Badge
                status={
                  selected.status.charAt(0).toUpperCase() +
                  selected.status.slice(1)
                }
              />
            </div>
            {selected.ip ? (
              <div className="sm:col-span-2">
                <p className="ap-eyebrow text-ash-300">IP</p>
                <p className="text-xs text-ash-300">{selected.ip}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <p className="ap-eyebrow text-ash-300">Message</p>
            <div className="mt-1 whitespace-pre-wrap break-words rounded-sm bg-surface px-4 py-3 text-sm">
              {selected.message}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`mailto:${selected.email}?subject=${encodeURIComponent(
                `Re: ${selected.topic}`,
              )}`}
              className="inline-flex items-center gap-2 rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
            >
              Reply by email
            </a>
            {selected.status === "new" ? (
              <>
                <button
                  type="button"
                  disabled={updateBusy}
                  onClick={() => handleStatus("replied")}
                  className="rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400 disabled:opacity-60"
                >
                  {updateBusy ? "Saving…" : "Mark replied"}
                </button>
                <button
                  type="button"
                  disabled={updateBusy}
                  onClick={() => handleStatus("closed")}
                  className="rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface disabled:opacity-60"
                >
                  Close
                </button>
              </>
            ) : null}
            {selected.status === "replied" ? (
              <button
                type="button"
                disabled={updateBusy}
                onClick={() => handleStatus("closed")}
                className="rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface disabled:opacity-60"
              >
                Close
              </button>
            ) : null}
            {selected.status === "closed" ? (
              <button
                type="button"
                disabled={updateBusy}
                onClick={() => handleStatus("new")}
                className="rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400 disabled:opacity-60"
              >
                {updateBusy ? "Saving…" : "Reopen"}
              </button>
            ) : null}
          </div>

          <form className="mt-5 flex flex-col gap-2" onSubmit={handleSaveNote}>
            <label htmlFor="admin-note" className="text-xs text-ash-200">
              Admin note (max 2000)
            </label>
            <textarea
              id="admin-note"
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              rows={3}
              maxLength={2000}
              className="ap-input resize-y"
              placeholder="Internal note…"
            />
            <button
              type="submit"
              disabled={noteBusy}
              className="self-start rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400 disabled:opacity-60"
            >
              {noteBusy ? "Saving…" : "Save note"}
            </button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
