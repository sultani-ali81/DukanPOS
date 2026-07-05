import { formatValue, getChangedFields } from "@/lib/audit-diff";
import type { AuditLog } from "@/types/audit";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function LogDiffDialog({ log }: { log: AuditLog }) {
  const diffs = getChangedFields(log.before, log.after);

  if (diffs.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View changes
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {log.entityType} — {log.actionType}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {diffs.map((diff) => (
            <div key={diff.field} className="text-sm border-b pb-2">
              <div className="font-medium capitalize">{diff.field}</div>
              <div className="flex gap-2 mt-1">
                <span className="text-red-500 line-through">
                  {formatValue(diff.oldValue)}
                </span>
                <span>→</span>
                <span className="text-green-600">
                  {formatValue(diff.newValue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
