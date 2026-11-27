"use client";

import { useState, type FormEvent } from "react";
import { CloseIcon } from "@/components/icons";
import { FormField } from "@/components/ui/FormField";
import { FormNotice } from "@/components/ui/FormNotice";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { adjustStock } from "@/lib/services/inventory.service";
import { getErrorMessage } from "@/lib/utils/error";
import {
  MAX_STOCK,
  STOCK_ADJUST_MODES,
  STOCK_ADJUST_REASONS,
  getProductSku,
  getStockStatus,
  stockStatusLabel,
} from "@/lib/utils/inventory";
import type {
  AdjustStockResult,
  InventoryProduct,
  StockAdjustMode,
} from "@/lib/types/inventory";

function previewStock(
  mode: StockAdjustMode,
  quantity: number,
  current: number,
): number {
  if (mode === "add") return current + quantity;
  if (mode === "remove") return current - quantity;
  return quantity;
}

export function StockAdjustDialog({
  product,
  lowStockThreshold,
  onClose,
  onSaved,
}: {
  product: InventoryProduct;
  lowStockThreshold: number;
  onClose: () => void;
  onSaved: (result: AdjustStockResult) => void;
}) {
  const [mode, setMode] = useState<StockAdjustMode>("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<string>(STOCK_ADJUST_REASONS[0]);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = Number(quantity.trim());
  const quantityValid =
    quantity.trim() !== "" &&
    Number.isInteger(parsed) &&
    parsed >= (mode === "set" ? 0 : 1) &&
    parsed <= MAX_STOCK;
  const nextStock = quantityValid
    ? previewStock(mode, parsed, product.stock)
    : null;
  const nextValid =
    nextStock !== null && nextStock >= 0 && nextStock <= MAX_STOCK;
  const noChange = nextStock !== null && nextStock === product.stock;
  const canContinue = quantityValid && nextValid && !noChange;

  const modeConfig = STOCK_ADJUST_MODES.find((item) => item.value === mode);
  const nextStatus =
    nextStock !== null && nextValid
      ? getStockStatus(nextStock, lowStockThreshold)
      : null;

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quantityValid) {
      setError(
        mode === "set"
          ? "Enter a whole number between 0 and 10,000,000."
          : "Enter a whole number of 1 or more.",
      );
      return;
    }
    if (!nextValid || nextStock === null) {
      setError("That change would push stock outside the allowed range.");
      return;
    }
    if (noChange) {
      setError("This adjustment would not change the current stock.");
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function handleConfirm() {
    if (nextStock === null || !canContinue) return;
    setBusy(true);
    setError(null);
    try {
      const result = await adjustStock(product._id, {
        mode,
        quantity: parsed,
        reason,
        note: note.trim() || undefined,
      });
      onSaved(result);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to adjust stock"));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  const delta = nextStock === null ? 0 : nextStock - product.stock;

  return (
    <Modal
      ariaLabel={`Adjust stock for ${product.name}`}
      panelClassName="w-full max-w-lg rounded-sm border border-line bg-floral-500 shadow-xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg">Adjust stock</h2>
          <p className="mt-0.5 truncate text-sm text-ash-200">
            {product.name}{" "}
            <span className="font-mono text-xs text-ash-300">
              {getProductSku(product)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-sm p-1.5 hover:bg-surface"
        >
          <CloseIcon className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
      </div>

      {confirming && nextStock !== null ? (
        <div className="flex flex-col gap-4 px-5 py-5">
          <div>
            <p className="ap-eyebrow text-ash-300">Confirm adjustment</p>
            <p className="mt-2 text-sm">
              {modeConfig?.label}:{" "}
              <span className="font-medium">
                {delta > 0 ? "+" : ""}
                {delta.toLocaleString("en-IN")}
              </span>{" "}
              units for <span className="font-medium">{product.name}</span>.
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-3 rounded-sm border border-line bg-surface px-4 py-3 text-sm">
            <div>
              <dt className="text-xs text-ash-200">Current</dt>
              <dd className="mt-0.5 font-medium">
                {product.stock.toLocaleString("en-IN")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ash-200">New</dt>
              <dd className="mt-0.5 font-medium">
                {nextStock.toLocaleString("en-IN")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ash-200">Status</dt>
              <dd className="mt-0.5 font-medium">
                {nextStatus ? stockStatusLabel(nextStatus) : "—"}
              </dd>
            </div>
          </dl>

          <p className="text-sm text-ash-200">
            Reason: <span className="text-ink">{reason}</span>
            {note.trim() ? (
              <>
                <br />
                Note: <span className="text-ink">{note.trim()}</span>
              </>
            ) : null}
          </p>

          {error ? <FormNotice tone="error" message={error} /> : null}

          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirming(false);
              }}
              disabled={busy}
              className="rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400 disabled:opacity-60"
            >
              {busy ? (
                <Spinner className="border-floral border-t-burnt-400" />
              ) : null}
              Confirm adjustment
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleReview}
          noValidate
          className="flex flex-col gap-4 px-5 py-5"
        >
          <p className="rounded-sm bg-surface px-3 py-2 text-sm text-ash-200">
            Current stock:{" "}
            <span className="font-medium text-ink">
              {product.stock.toLocaleString("en-IN")}
            </span>{" "}
            · {stockStatusLabel(product.stockStatus)}
          </p>

          <fieldset className="flex flex-col gap-2">
            <legend className="ap-eyebrow mb-1.5 text-ash-300">
              Adjustment type
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {STOCK_ADJUST_MODES.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-sm border px-3 py-2 text-sm transition-colors ${
                    mode === option.value
                      ? "border-burnt-400 bg-surface"
                      : "border-line hover:bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="adjust-mode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={() => {
                      setMode(option.value);
                      setError(null);
                    }}
                    className="sr-only"
                    disabled={busy}
                  />
                  <span className="block font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-ash-200">
                    {option.hint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <FormField
            label={mode === "set" ? "New stock quantity" : "Quantity"}
            htmlFor="inventory-adjust-quantity"
            hint={
              mode === "set"
                ? "Whole units available to sell. Use 0 to mark as out of stock."
                : mode === "add"
                  ? `Adds to the current ${product.stock.toLocaleString("en-IN")} units.`
                  : `Removes from the current ${product.stock.toLocaleString("en-IN")} units.`
            }
          >
            <input
              id="inventory-adjust-quantity"
              type="number"
              min={mode === "set" ? 0 : 1}
              max={MAX_STOCK}
              step={1}
              inputMode="numeric"
              autoFocus
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value);
                setError(null);
              }}
              className={`ap-input ${error ? "border-powder-400" : ""}`}
              disabled={busy}
            />
          </FormField>

          <FormField
            label="Reason"
            htmlFor="inventory-adjust-reason"
            hint="Recorded in the stock movement history."
          >
            <select
              id="inventory-adjust-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="ap-input"
              disabled={busy}
            >
              {STOCK_ADJUST_REASONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Note (optional)"
            htmlFor="inventory-adjust-note"
            hint="Up to 500 characters."
          >
            <textarea
              id="inventory-adjust-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={2}
              className="ap-input resize-none"
              disabled={busy}
            />
          </FormField>

          {nextStock !== null && nextValid && !noChange ? (
            <p className="text-xs text-ash-300">
              Preview: {product.stock.toLocaleString("en-IN")} →{" "}
              {nextStock.toLocaleString("en-IN")} units
              {nextStatus ? ` · ${stockStatusLabel(nextStatus)}` : null}
            </p>
          ) : null}

          {error ? <FormNotice tone="error" message={error} /> : null}

          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !canContinue}
              className="rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400 disabled:opacity-60"
            >
              Review adjustment
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
