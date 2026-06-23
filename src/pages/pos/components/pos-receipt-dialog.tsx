import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SaleReceipt } from "@/types/sale";
import { Printer, X } from "lucide-react";

interface PosReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: SaleReceipt | null;
  createdAt?: string;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Walk-in customer names that should be anonymised on the receipt
const WALK_IN_PATTERNS = /walk[\s-]?in/i;

function displayCustomerName(name: string): string {
  if (!name || WALK_IN_PATTERNS.test(name)) return "---";
  return name;
}

export function PosReceiptDialog({
  open,
  onOpenChange,
  receipt,
  createdAt,
}: PosReceiptDialogProps) {
  if (!receipt) return null;

  const customerDisplay = displayCustomerName(receipt.customerName);

  const handlePrint = () => {
    const printContent = document.getElementById("pos-receipt-printable");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receipt.sequenceId}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              color: #000;
              background: #fff;
              padding: 16px;
              width: 300px;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .items-grid { display: grid; grid-template-columns: 1fr auto auto auto; gap: 0 8px; margin: 2px 0; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
            .col-header { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #666; }
            .text-right { text-align: right; }
            .small { font-size: 10px; color: #888; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
        {/* Dialog header — outside printable zone */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-semibold text-gray-900">
            Receipt
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </DialogHeader>

        {/* Scrollable receipt body */}
        <div className="overflow-y-auto max-h-[70vh] px-5 py-4">
          {/* Printable zone — only this div gets cloned into the print window */}
          <div
            id="pos-receipt-printable"
            className="font-mono text-xs text-gray-900"
          >
            {/* Store name */}
            <p className="text-center font-bold text-base tracking-wide uppercase">
              {receipt.storeName}
            </p>
            <p className="text-center text-gray-500 text-[11px] mt-0.5">
              Point of Sale Receipt
            </p>

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* Meta */}
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice</span>
                <span className="font-semibold">#{receipt.sequenceId}</span>
              </div>
              {customerDisplay !== "---" && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium truncate ml-4 text-right">
                    {customerDisplay}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{formatDate(createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span>{formatTime(createdAt)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit</span>
              <span className="text-right">Total</span>
            </div>
            <div className="border-t border-gray-200 mb-2" />

            {/* Items */}
            <div className="space-y-1.5">
              {receipt.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-start"
                >
                  <span className="font-medium leading-tight break-words">
                    {item.productName}
                  </span>
                  <span className="text-right tabular-nums">
                    {item.quantity}
                  </span>
                  <span className="text-right tabular-nums">
                    {item.unitPrice.toFixed(0)}
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {item.subTotal.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* Total only — no subtotal row */}
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="tabular-nums">
                {receipt.totalAmount.toFixed(2)} AFN
              </span>
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

            <p className="text-center text-[11px] text-gray-400">
              Thank you for your purchase!
            </p>
            <p className="text-center text-[10px] text-gray-300 mt-0.5">
              {receipt.receiptId}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl border-gray-200 text-sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            variant="default"
            className="flex-1 h-11 rounded-xl text-sm font-semibold flex items-center gap-2"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
