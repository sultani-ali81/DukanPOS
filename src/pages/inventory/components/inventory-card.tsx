import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Inventory } from "@/types/inventory";
import {
  ArrowRight,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function InventoryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="size-11 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="mt-3 h-8 w-full animate-pulse rounded-lg bg-muted" />
      </CardContent>
    </Card>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface InventoryCardProps {
  inventory: Inventory;
  isDeleting: boolean;
  onEdit: (inv: Inventory) => void;
  onDelete: (inv: Inventory) => void;
}

export function InventoryCard({
  inventory,
  isDeleting,
  onEdit,
  onDelete,
}: InventoryCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary hover:shadow-md group"
      onClick={() => navigate(`/inventory/${inventory.id}`)}
    >
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Warehouse className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                {inventory.name}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{inventory.address}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(inventory);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(inventory);
              }}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm mb-2">
          <span className="text-muted-foreground">
            {inventory.productTypeCount}{" "}
            {inventory.productTypeCount === 1 ? "product" : "products"}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <Package className="size-3.5" />
          View stock levels
          <ArrowRight className="size-3.5" />
        </div>
      </CardContent>
    </Card>
  );
}
