export interface CreateStockMovementPayload {
  sourceInventoryId: string;
  destinationInventoryId: string;
  items: StockMovementItem[];
}

export interface StockMovementItem {
  productId: string;
  quantity: number;
}

export interface StockMovementResponse {
  stockMovementId: string;
  message: string;
}

export interface UpdateStockMovement {
  status: string;
}
