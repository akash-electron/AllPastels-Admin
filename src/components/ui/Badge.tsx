const statusTone: Record<string, string> = {
  Delivered: "bg-ash-800 text-ash-200",
  Paid: "bg-burnt-900 text-burnt-300",
  Pending: "bg-floral-400 text-floral-100",
  "Payment pending": "bg-floral-400 text-floral-100",
  "Payment failed": "bg-powder-800 text-powder-200",
  "Payment Failed": "bg-powder-800 text-powder-200",
  Shipped: "bg-cotton-800 text-cotton-200",
  Cancelled: "bg-cotton-500 text-cotton-100",
  Refunded: "bg-powder-800 text-powder-200",
  Active: "bg-ash-800 text-ash-200",
  Draft: "bg-floral-400 text-floral-100",
  Archived: "bg-line text-ash-200",
  New: "bg-powder-800 text-powder-200",
  Replied: "bg-cotton-800 text-cotton-200",
  Closed: "bg-line text-ash-200",
  Expired: "bg-cotton-500 text-cotton-100",
  Scheduled: "bg-floral-400 text-floral-100",
  "Low stock": "bg-cotton-800 text-cotton-200",
  "Out of stock": "bg-cotton-500 text-cotton-100",
  "In stock": "bg-ash-800 text-ash-200",
  Confirmed: "bg-burnt-900 text-burnt-300",
  Processing: "bg-floral-400 text-floral-100",
  Inactive: "bg-line text-ash-200",
  Due: "bg-floral-400 text-floral-100",
};

export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium tracking-wide ${statusTone[status] ?? "bg-line text-ash-200"}`}
    >
      {status}
    </span>
  );
}
