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
  const reference = isStockIn ? stockIn!.purchase : stockOut!.sale;
  const sequenceLabel = movement.sequence
    ? `${movement.sequence.prefix}${movement.sequence.lastIndex}`
    : movement.id;

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          {isStockIn ? "Stock In" : "Stock Out"} #{sequenceLabel}
        </span>
        <span>Status: {movement.status}</span>
        {movement.inventory && (
          <span>Inventory: {movement.inventory.name}</span>
        )}
        {reference && (
          <span>
            {isStockIn ? "Purchase" : "Sale"}: {reference.id}
          </span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="p-1 ml-2 font-semibold">Product</th>
            <th className="p-1 mr-2 font-semibold text-left">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {movement.items.map((item) => (
            <tr key={item.id}>
              <td className="p-1 ml-2">{item.product.name}</td>
              <td className="p-1 mr-2 text-left">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
