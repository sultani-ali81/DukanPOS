export interface CashMovementPayload {
  type: "cash_in" | "cash_out";
  amount: number;
  note?: string;
}
