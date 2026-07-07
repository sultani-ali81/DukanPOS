import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StockInDetails, StockOutDetails } from "@/types/audit";

interface StockMovementDetailsProps {
  stockIn?: StockInDetails | null;
  stockOut?: StockOutDetails | null;
}

export function StockMovementDetails({
  stockIn,
  stockOut,
}: StockMovementDetailsProps) {
  const movement = stockIn ?? stockOut;
  if (!movement) return null;

  const isStockIn = !!stockIn;
  const sequenceLabel = movement.sequence
    ? `${movement.sequence.prefix}${movement.sequence.lastIndex}`
    : movement.id;

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap gap-12 text-sm text-muted-foreground">
        <span className="font-semibold bg-gray-200 px-2 py-1 rounded-md">
          {isStockIn ? "Stock In:" : "Stock Out:"} #{sequenceLabel}
        </span>
        <span className="font-semibold bg-gray-200 px-2 py-1 rounded-md">
          Status: {movement.status}
        </span>
        {movement.inventory && (
          <span className="font-semibold bg-gray-200 px-2 py-1 rounded-md">
            Inventory: {movement.inventory.name}
          </span>
        )}
      </div>
      <Table className="w-auto">
        <TableHeader>
          <TableRow className="text-muted-foreground">
            <TableHead className="text-left w-48 p-1 ml-2 font-semibold">
              Product
            </TableHead>
            <TableHead className="text-left p-1 mr-2 font-semibold ">
              Quantity
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movement.items.map((item) => (
            <tr key={item.id}>
              <td className="text-left p-1 ml-2">{item.product.name}</td>
              <td className="p-1 mr-2 text-left">{item.quantity}</td>
            </tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
