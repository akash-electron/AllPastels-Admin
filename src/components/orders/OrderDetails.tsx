"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { AlertIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { formatINR } from "@/lib/utils/format";
import { formatDate, formatDateTime } from "@/lib/utils/dates";
import { getErrorMessage } from "@/lib/utils/error";
import {
  addOrderNote,
  cancelOrder,
  getOrder,
  paymentMethodLabel,
  paymentStatusLabel,
  toBadge,
} from "@/lib/services/orders.service";
import type { AdminOrder } from "@/lib/types/order";

export function OrderDetails({ id }: { id: string }) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(getErrorMessage(err, "Failed to load order"));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleCancel() {
    if (!order) return;
    setCancelBusy(true);
    try {
      await cancelOrder(order.orderNumber);
      setCancelling(false);
      await load();
    } catch (err) {
      setNotice(getErrorMessage(err, "Failed to cancel the order"));
    } finally {
      setCancelBusy(false);
    }
  }

  async function handleAddNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !noteText.trim()) return;
    setNoteBusy(true);
    setNoteError(null);
    try {
      const updated = await addOrderNote(order.orderNumber, noteText.trim());
      setOrder(updated);
      setNoteText("");
    } catch (err) {
      setNoteError(getErrorMessage(err, "Failed to add note"));
    } finally {
      setNoteBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="h-16 w-full max-w-md animate-pulse rounded-sm bg-line" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="h-72 animate-pulse rounded-sm bg-line xl:col-span-2" />
          <div className="h-72 animate-pulse rounded-sm bg-line" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <NotFound
        title="Order not found"
        description="Check the order number and try again."
        backHref="/orders"
        backLabel="Back to orders"
      />
    );
  }

  if (error || order === null) {
    return (
      <Card className="mx-auto max-w-md px-5 py-8 text-center">
        <AlertIcon className="mx-auto h-6 w-6 text-powder-400" />
        <p className="mt-3 text-sm" role="alert">
          {error ?? "Failed to load order"}
        </p>
        <button
          type="button"
          onClick={load}
          className="mt-5 rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400"
        >
          Retry
        </button>
      </Card>
    );
  }

  const statusLabel = toBadge(order.status);
  const cancellable = ["placed", "confirmed", "processing", "shipped"].includes(
    order.status,
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ap-eyebrow text-ash-300">Order details</p>
          <h1 className="text-3xl">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-ash-200">
            Placed {formatDateTime(order.createdAt)} — live data from the
            backend API.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/orders"
            className="rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
          >
            Back
          </Link>
          <Link
            href={`/orders/${order.orderNumber}/edit`}
            className="rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400"
          >
            Update status
          </Link>
        </div>
      </div>

      {notice ? (
        <div className="mb-4">
          <p
            role="alert"
            className="flex items-start gap-2 rounded-sm bg-powder-800 px-4 py-3 text-sm text-powder-200"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {notice}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Items"
            subtitle={`${order.items.reduce((sum, item) => sum + item.qty, 0)} units`}
          />
          <div className="px-5 py-2">
            <ul className="flex flex-col text-sm">
              {order.items.map((item, index) => (
                <li
                  key={`${item.product?._id ?? "item"}-${index}`}
                  className="flex gap-4 border-b border-line py-3 last:border-b-0"
                >
                  {item.product?.images?.[0] ? (
                    <img
                      src={item.product.images[0]}
                      alt=""
                      width={48}
                      height={62}
                      className="h-[62px] w-12 shrink-0 border border-line object-cover"
                    />
                  ) : (
                    <span className="grid h-[62px] w-12 shrink-0 place-items-center border border-line bg-surface text-[10px] text-ash-300">
                      No image
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {item.product?.name ?? "Removed product"}
                    </span>
                    <span className="mt-1 block text-xs text-ash-200">
                      {item.size ? `Size ${item.size} · ` : ""}Qty {item.qty} ×{" "}
                      {formatINR(item.priceAtPurchase)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {formatINR(item.qty * item.priceAtPurchase)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ash-200">Subtotal</dt>
                <dd>{formatINR(order.subtotal)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ash-200">
                    Discount{order.coupon ? ` (${order.coupon.code})` : ""}
                  </dt>
                  <dd>−{formatINR(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ash-200">Shipping</dt>
                <dd>{formatINR(order.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ash-200">Tax</dt>
                <dd>{formatINR(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1.5 font-medium">
                <dt>Total</dt>
                <dd className="font-display text-lg">{formatINR(order.total)}</dd>
              </div>
            </dl>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Customer" />
            <div className="px-5 py-4 text-sm">
              <p className="font-medium">
                {order.customerName || order.shippingAddress?.fullName || "Guest"}
              </p>
              <p className="mt-1 text-ash-200">
                {order.customerEmail || "No email supplied"}
              </p>
              {order.customerPhone || order.shippingAddress?.phone ? (
                <p className="text-ash-200">
                  <a
                    href={`tel:${order.customerPhone || order.shippingAddress?.phone}`}
                    className="hover:text-burnt-400"
                  >
                    {order.customerPhone || order.shippingAddress?.phone}
                  </a>
                </p>
              ) : null}
              <p className="mt-2 text-xs text-ash-300">
                {order.user ? "Registered customer" : "Guest checkout"}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Shipping / billing address" />
            <div className="px-5 py-4 text-sm">
              {order.shippingAddress ? (
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{order.shippingAddress.fullName}</p>
                  <p className="text-ash-200">
                    {order.shippingAddress.line1}
                    {order.shippingAddress.line2
                      ? `, ${order.shippingAddress.line2}`
                      : ""}
                  </p>
                  <p className="text-ash-200">
                    {order.shippingAddress.city}
                    {order.shippingAddress.state
                      ? `, ${order.shippingAddress.state}`
                      : ""}
                    {order.shippingAddress.postalCode
                      ? ` ${order.shippingAddress.postalCode}`
                      : ""}
                  </p>
                  <p className="text-ash-200">{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone ? (
                    <p className="text-ash-200">{order.shippingAddress.phone}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-ash-200">No address supplied.</p>
              )}
              {order.billingAddress ? (
                <div className="mt-4 flex flex-col gap-1 border-t border-line pt-4">
                  <p className="ap-eyebrow mb-1 text-ash-300">
                    Billing address
                  </p>
                  <p className="font-medium">{order.billingAddress.fullName}</p>
                  <p className="text-ash-200">
                    {order.billingAddress.line1}
                    {order.billingAddress.line2
                      ? `, ${order.billingAddress.line2}`
                      : ""}
                  </p>
                  <p className="text-ash-200">
                    {order.billingAddress.city}
                    {order.billingAddress.state
                      ? `, ${order.billingAddress.state}`
                      : ""}
                    {order.billingAddress.postalCode
                      ? ` ${order.billingAddress.postalCode}`
                      : ""}
                  </p>
                  <p className="text-ash-200">
                    {order.billingAddress.country}
                  </p>
                  {order.billingAddress.phone ? (
                    <p className="text-ash-200">
                      {order.billingAddress.phone}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payment" />
            <div className="flex flex-col gap-2 px-5 py-4 text-sm">
              {order.paymentStatus === "paid" && order.status === "cancelled" ? (
                <p className="flex items-start gap-2 rounded-sm bg-powder-800 px-3 py-2.5 text-xs text-powder-200">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  Paid after cancellation — refund this payment in the provider
                  dashboard.
                </p>
              ) : null}
              {order.paymentMethod === "online" &&
              order.paymentStatus === "failed" &&
              order.status === "placed" ? (
                <p className="flex items-start gap-2 rounded-sm bg-powder-800 px-3 py-2.5 text-xs text-powder-200">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  Customer&apos;s payment failed. They can retry from their order page,
                  or you can cancel the order.
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-ash-200">Method</span>
                <span>{paymentMethodLabel(order.paymentMethod)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ash-200">Status</span>
                <Badge status={paymentStatusLabel(order.paymentStatus)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ash-200">Provider</span>
                <span>
                  {order.paymentProvider === "razorpay"
                    ? "Razorpay"
                    : order.paymentProvider === "stripe"
                      ? "Stripe"
                      : "—"}
                </span>
              </div>
              {order.providerPaymentId ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ash-200">Payment ID</span>
                  <span className="truncate font-mono text-xs">
                    {order.providerPaymentId}
                  </span>
                </div>
              ) : null}
              {order.providerOrderId ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ash-200">Provider order</span>
                  <span className="truncate text-xs">{order.providerOrderId}</span>
                </div>
              ) : null}
              {order.paymentReference ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ash-200">Reference</span>
                  <span className="truncate text-xs">{order.paymentReference}</span>
                </div>
              ) : null}
              {order.paidAt ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ash-200">Paid at</span>
                  <span>{formatDateTime(order.paidAt)}</span>
                </div>
              ) : null}
              {order.paymentProvider === "razorpay" &&
              order.providerPaymentId ? (
                <div className="flex items-center justify-end">
                  <a
                    href={`https://dashboard.razorpay.com/app/payments/${encodeURIComponent(order.providerPaymentId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-burnt-400 hover:text-burnt-300"
                  >
                    Open in Razorpay
                  </a>
                </div>
              ) : null}
              {order.paymentProvider === "stripe" &&
              order.providerPaymentId?.startsWith("pi_") ? (
                <div className="flex items-center justify-end">
                  <a
                    href={`https://dashboard.stripe.com/payments/${encodeURIComponent(order.providerPaymentId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-burnt-400 hover:text-burnt-300"
                  >
                    Open in Stripe
                  </a>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Status history" />
          <div className="px-5 py-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ash-200">Current:</span>
              <Badge status={statusLabel} />
              {cancellable ? (
                <button
                  type="button"
                  onClick={() => setCancelling(true)}
                  className="ml-auto rounded-sm border border-line px-3 py-1.5 text-xs text-ash-200 transition-colors hover:bg-cotton-500 hover:text-cotton-100"
                >
                  Cancel order
                </button>
              ) : null}
            </div>
            <ol className="mt-4 flex flex-col gap-3">
              {order.statusHistory.length > 0 ? (
                order.statusHistory.map((entry, index) => (
                  <li
                    key={`${entry.status}-${index}`}
                    className="border-l-2 border-line pl-3"
                  >
                    <p className="font-medium">{toBadge(entry.status)}</p>
                    <p className="text-xs text-ash-200">
                      {formatDateTime(entry.at)} ·{" "}
                      {entry.by ? "Administrator" : "System"}
                      {entry.note ? ` — ${entry.note}` : ""}
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-xs text-ash-200">No history recorded.</li>
              )}
            </ol>
          </div>
        </Card>

        <Card>
          <CardHeader title="Internal notes" />
          <div className="px-5 py-4 text-sm">
            {order.adminNotes && order.adminNotes.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {order.adminNotes.map((note) => (
                  <li key={note._id} className="rounded-sm bg-surface px-3 py-2">
                    <p>{note.text}</p>
                    <p className="mt-1 text-xs text-ash-300">{formatDate(note.at)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ash-200">No internal notes yet.</p>
            )}
            <form className="mt-4 flex flex-col gap-2" onSubmit={handleAddNote}>
              <label htmlFor="admin-note" className="text-xs text-ash-200">
                Add a note (visible to admins only)
              </label>
              <textarea
                id="admin-note"
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                rows={3}
                maxLength={2000}
                className="ap-input resize-y"
                placeholder="Customer called about delivery timing…"
              />
              {noteError ? (
                <p className="text-xs text-powder-300" role="alert">
                  {noteError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={noteBusy || !noteText.trim()}
                className="self-start rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400 disabled:opacity-60"
              >
                {noteBusy ? "Saving…" : "Add note"}
              </button>
            </form>
          </div>
        </Card>
      </div>

      {cancelling ? (
        <Modal
          ariaLabel="Confirm cancel order"
          panelClassName="w-full max-w-sm rounded-sm border border-line bg-floral-500 p-5 shadow-xl"
        >
            <h2 className="mb-3 text-xl">Cancel order?</h2>
            <p className="text-sm">
              Order <span className="font-medium">{order.orderNumber}</span> will
              be cancelled and its item stock restored. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelling(false)}
                disabled={cancelBusy}
                className="rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelBusy}
                className="inline-flex items-center gap-2 rounded-sm bg-powder-400 px-4 py-2 text-sm font-medium text-powder-100 transition-colors hover:bg-powder-300 disabled:opacity-60"
              >
                {cancelBusy ? (
                  <Spinner className="border-powder-800 border-t-powder-100" />
                ) : null}
                Cancel order
              </button>
            </div>
        </Modal>
      ) : null}
    </>
  );
}

export function NotFound({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <Card className="mx-auto max-w-md px-5 py-8 text-center">
      <h1 className="text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-ash-200">{description}</p>
      <Link
        href={backHref}
        className="mt-5 inline-block rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400"
      >
        {backLabel}
      </Link>
    </Card>
  );
}
