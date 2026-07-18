import { Badge } from "@/components/ui/badge";
import type {
  PurchasePaymentStatus,
  PurchaseStatus,
} from "@/types/purchases";

const PURCHASE_STATUS_STYLES: Record<PurchaseStatus, string> = {
  Draft: "border-border bg-muted/60 text-muted-foreground",
  Done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  Cancelled: "border-red-500/30 bg-red-500/10 text-red-600",
};

const PAYMENT_STATUS: Record<
  PurchasePaymentStatus,
  { label: string; className: string }
> = {
  fully_paid: {
    label: "Fully paid",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  },
  partially_paid: {
    label: "Partially paid",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  },
  unpaid: {
    label: "Unpaid",
    className: "border-red-500/30 bg-red-500/10 text-red-600",
  },
};

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return (
    <Badge variant="outline" className={PURCHASE_STATUS_STYLES[status]}>
      {status}
    </Badge>
  );
}

export function PurchasePaymentStatusBadge({
  status,
}: {
  status: PurchasePaymentStatus;
}) {
  const config = PAYMENT_STATUS[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
