type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  className: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  // ✅ Done / success — green
  done: {
    label: "Done",
    variant: "outline",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  completed: {
    label: "Completed",
    variant: "outline",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  approved: {
    label: "Approved",
    variant: "outline",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  stocked_in: {
    label: "Stocked In",
    variant: "outline",
    className:
      "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-400",
  },
  "stocked in": {
    label: "Stocked In",
    variant: "outline",
    className:
      "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-400",
  },

  // 🕐 In-progress — amber
  pending: {
    label: "Pending",
    variant: "outline",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400",
  },

  // 📝 Draft — muted/gray
  draft: {
    label: "Draft",
    variant: "outline",
    className: "border-border bg-muted/60 text-muted-foreground",
  },

  // ❌ Cancelled — red
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    className: "",
  },
  canceled: {
    label: "Cancelled",
    variant: "destructive",
    className: "",
  },
  cancel: {
    label: "Cancelled",
    variant: "destructive",
    className: "",
  },
};

export function getStatusVariant(status?: string): BadgeVariant {
  if (!status) return "outline";
  return STATUS_CONFIG[status.toLowerCase()]?.variant ?? "outline";
}

export function getStatusClassName(status?: string): string {
  if (!status) return "";
  return STATUS_CONFIG[status.toLowerCase()]?.className ?? "";
}

export function getStatusLabel(status?: string): string {
  if (!status) return "—";
  return STATUS_CONFIG[status.toLowerCase()]?.label ?? status;
}
