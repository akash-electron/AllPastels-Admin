"use client";

import { useCallback, useEffect, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Modal } from "@/components/ui/Modal";
import { Table, Td, Th } from "@/components/ui/Table";
import { listStockMovements } from "@/lib/services/inventory.service";
import { getErrorMessage } from "@/lib/utils/error";
import { formatDateTime } from "@/lib/utils/dates";
import {
  MOVEMENT_TYPE_FILTERS,
  movementActorName,
  movementDeltaLabel,
  movementModeLabel,
  movementTypeLabel,
} from "@/lib/utils/inventory";
import type {
  StockMovementPage,
  StockMovementType,
} from "@/lib/types/inventory";

const PAGE_SIZE = 10;

export function StockHistoryDialog({
  productId,
  productName,
  onClose,
}: {
  productId?: string;
  productName?: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<StockMovementType | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StockMovementPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listStockMovements({
        productId,
        type,
        page,
        limit: PAGE_SIZE,
      });
      setData(result);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load stock history"));
    } finally {
      setLoading(false);
    }
  }, [productId, type, page]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const title = productName ? "Stock history" : "Movement history";
  const subtitle = productName
    ? productName
    : "Every stock change recorded across the catalog";

  return (
    <Modal
      ariaLabel={title}
      panelClassName="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-sm border border-line bg-floral-500 shadow-xl"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-floral-500 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg">{title}</h2>
          <p className="mt-0.5 truncate text-sm text-ash-200">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1.5 hover:bg-surface"
        >
          <CloseIcon className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="ap-eyebrow text-ash-300">Movement type</span>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as StockMovementType | "");
              setPage(1);
            }}
            className="ap-input min-w-52"
            disabled={loading}
          >
            {MOVEMENT_TYPE_FILTERS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {data ? (
          <p className="text-xs text-ash-200">
            {data.total.toLocaleString("en-IN")}{" "}
            {data.total === 1 ? "movement" : "movements"}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="px-5 pt-4">
          <ErrorBanner message={error} onRetry={load} className="" />
        </div>
      ) : null}

      {loading && data === null ? (
        <div className="flex flex-col gap-2 px-5 py-8" aria-busy="true">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-sm bg-surface"
            />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
          <p className="font-display text-xl">No stock movements</p>
          <p className="text-sm text-ash-200">
            Adjustments, orders and cancellations will appear here.
          </p>
        </div>
      ) : data ? (
        <>
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                {!productId ? <Th>Product</Th> : null}
                <Th>Type</Th>
                <Th align="right">Change</Th>
                <Th align="right">Stock after</Th>
                <Th>Reason</Th>
                <Th>By</Th>
              </tr>
            </thead>
            <tbody aria-busy={loading}>
              {data.items.map((movement) => (
                <tr
                  key={movement._id}
                  className="align-top transition-colors hover:bg-surface"
                >
                  <Td className="whitespace-nowrap text-ash-200">
                    {formatDateTime(movement.createdAt)}
                  </Td>
                  {!productId ? (
                    <Td>
                      <span className="block max-w-[14rem] truncate font-medium">
                        {movement.product?.name ?? "Deleted product"}
                      </span>
                      {movement.product?.sku ? (
                        <span className="block font-mono text-xs text-ash-200">
                          {movement.product.sku}
                        </span>
                      ) : null}
                    </Td>
                  ) : null}
                  <Td>
                    <span className="block">{movementTypeLabel(movement.type)}</span>
                    {movement.mode ? (
                      <span className="block text-xs text-ash-200">
                        {movementModeLabel(movement.mode)}
                      </span>
                    ) : null}
                  </Td>
                  <Td
                    className={`whitespace-nowrap text-right font-medium ${
                      movement.delta > 0
                        ? "text-cotton-200"
                        : movement.delta < 0
                          ? "text-powder-300"
                          : "text-ash-200"
                    }`}
                  >
                    {movementDeltaLabel(movement.delta)}
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    {movement.newStock.toLocaleString("en-IN")}
                  </Td>
                  <Td>
                    <span className="block max-w-[16rem] whitespace-normal">
                      {movement.reason || "—"}
                    </span>
                    {movement.note ? (
                      <span className="block max-w-[16rem] whitespace-normal text-xs text-ash-200">
                        {movement.note}
                      </span>
                    ) : null}
                    {movement.reference ? (
                      <span className="block font-mono text-xs text-ash-300">
                        {movement.reference}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="whitespace-nowrap text-ash-200">
                    {movementActorName(movement)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 text-sm">
            <p className="text-ash-200">
              Showing{" "}
              {((data.page - 1) * data.limit + 1).toLocaleString("en-IN")}–
              {((data.page - 1) * data.limit + data.items.length).toLocaleString(
                "en-IN",
              )}{" "}
              of {data.total.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || data.page <= 1}
                className="rounded-sm border border-line px-3 py-1.5 text-xs transition-colors hover:bg-surface disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-ash-200">
                Page {data.totalPages === 0 ? 0 : data.page} of{" "}
                {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={
                  loading ||
                  data.totalPages === 0 ||
                  data.page >= data.totalPages
                }
                className="rounded-sm border border-line px-3 py-1.5 text-xs transition-colors hover:bg-surface disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
