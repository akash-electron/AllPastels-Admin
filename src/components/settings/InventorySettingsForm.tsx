"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FormNotice } from "@/components/ui/FormNotice";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/error";
import {
  getInventorySettings,
  updateInventorySettings,
} from "@/lib/services/inventory.service";

const MAX_THRESHOLD = 100000;

interface Notice {
  kind: "success" | "error";
  text: string;
}

function parseThreshold(raw: string): { value: number | null; error?: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { value: null, error: "Enter a low-stock threshold." };
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_THRESHOLD) {
    return {
      value: null,
      error: `Enter a whole number between 0 and ${MAX_THRESHOLD.toLocaleString("en-IN")}.`,
    };
  }
  return { value: parsed };
}

export function InventorySettingsForm() {
  const [threshold, setThreshold] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await getInventorySettings();
      setThreshold(String(settings.lowStockThreshold));
      setReady(true);
    } catch (err) {
      setReady(false);
      setError(getErrorMessage(err, "Failed to load inventory settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseThreshold(threshold);
    if (parsed.value === null) {
      setNotice({
        kind: "error",
        text: parsed.error ?? "Enter a valid low-stock threshold.",
      });
      return;
    }

    setNotice(null);
    setBusy(true);
    try {
      const saved = await updateInventorySettings({
        lowStockThreshold: parsed.value,
      });
      setThreshold(String(saved.lowStockThreshold));
      setReady(true);
      setError(null);
      setNotice({ kind: "success", text: "Inventory settings saved." });
    } catch (err) {
      setNotice({
        kind: "error",
        text:
          err instanceof ApiError
            ? err.message
            : "Failed to save inventory settings",
      });
    } finally {
      setBusy(false);
    }
  }

  const parsed = parseThreshold(threshold);
  const preview =
    parsed.value === null
      ? null
      : parsed.value === 0
        ? "Low-stock alerts are turned off. Out-of-stock products are still flagged."
        : `Products with 1 to ${(parsed.value - 1).toLocaleString("en-IN")} units will be shown as low stock.`;

  return (
    <form className="flex w-full max-w-2xl flex-col gap-4" onSubmit={handleSubmit}>
      {notice ? (
        <FormNotice tone={notice.kind} message={notice.text} />
      ) : null}

      {error ? (
        <ErrorBanner message={error} onRetry={load} className="" />
      ) : null}

      {loading ? (
        <Card>
          <CardHeader title="Inventory alerts" />
          <div className="px-5 py-5" aria-busy="true">
            <div className="h-10 animate-pulse rounded-sm bg-line" />
          </div>
        </Card>
      ) : ready ? (
        <Card>
          <CardHeader
            title="Inventory alerts"
            subtitle="Controls the low-stock threshold used by the dashboard and inventory page."
          />
          <div className="flex flex-col gap-4 px-5 py-5">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="ap-eyebrow text-ash-300">
                Low-stock threshold (units)
              </span>
              <input
                type="number"
                min={0}
                max={MAX_THRESHOLD}
                step={1}
                inputMode="numeric"
                required
                value={threshold}
                onChange={(event) => {
                  setThreshold(event.target.value);
                  setNotice(null);
                }}
                className="ap-input"
                placeholder="e.g. 10"
                disabled={busy}
              />
              <span className="text-xs text-ash-300">
                Products below this quantity are highlighted as low stock.
                Use 0 to disable low-stock alerts.
              </span>
            </label>

            {preview ? (
              <p className="rounded-sm bg-surface px-3 py-2 text-xs text-ash-200">
                {preview}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
            <button
              type="submit"
              disabled={busy || parsed.value === null}
              className="inline-flex items-center gap-2 rounded-sm bg-burnt-500 px-5 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400 disabled:opacity-60"
            >
              {busy ? (
                <Spinner className="border-floral border-t-burnt-400" />
              ) : null}
              Save inventory settings
            </button>
            <Link
              href="/inventory"
              className="text-xs text-ash-300 underline underline-offset-2 hover:text-burnt-400"
            >
              Open inventory
            </Link>
          </div>
        </Card>
      ) : null}
    </form>
  );
}
