import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { SaleReceipt } from "@/types/sale";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
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

const WALK_IN_PATTERNS = /walk[\s-]?in/i;
function displayCustomerName(name: string): string {
  if (!name || WALK_IN_PATTERNS.test(name)) return "---";
  return name;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Courier",
    fontSize: 10,
    color: "#111",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: 226,
  },

  center: { textAlign: "center" },
  storeName: {
    textAlign: "center",
    fontFamily: "Courier-Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  subtitle: {
    textAlign: "center",
    fontSize: 8,
    color: "#888",
    marginTop: 2,
  },

  dividerDashed: {
    borderTopWidth: 1,
    borderTopStyle: "dashed",
    borderTopColor: "#ccc",
    marginVertical: 8,
  },

  dividerSolid: {
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    marginVertical: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  label: { color: "#888", fontSize: 9 },
  value: { fontSize: 9 },
  valueBold: { fontFamily: "Courier-Bold", fontSize: 9 },

  colHeaders: {
    flexDirection: "row",
    marginBottom: 3,
  },

  colHeaderText: {
    fontSize: 8,
    fontFamily: "Courier-Bold",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  itemRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },

  colItem: { flex: 1, paddingRight: 4 },
  colQty: { width: 24, textAlign: "right" },
  colUnit: { width: 36, textAlign: "right" },
  colTotal: { width: 40, textAlign: "right" },
  itemName: { fontSize: 9, fontFamily: "Courier-Bold" },
  itemNum: { fontSize: 9 },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },

  totalLabel: { fontFamily: "Courier-Bold", fontSize: 11 },
  totalValue: { fontFamily: "Courier-Bold", fontSize: 11 },

  footerThank: {
    textAlign: "center",
    fontSize: 8,
    color: "#aaa",
    marginTop: 2,
  },

  footerId: {
    textAlign: "center",
    fontSize: 7,
    color: "#ccc",
    marginTop: 2,
  },
});

// ─── PDF Document Component ──────────────────────────────────────────────────

interface ReceiptPdfProps {
  receipt: SaleReceipt;
  createdAt?: string;
  customerDisplay: string;
}

function ReceiptPdf({ receipt, createdAt, customerDisplay }: ReceiptPdfProps) {
  return (
    <Document>
      <Page size={[226, 700]} style={styles.page}>
        {/* Store name */}
        <Text style={styles.storeName}>{receipt.storeName}</Text>
        <Text style={styles.subtitle}>Point of Sale Receipt</Text>
        <View style={styles.dividerDashed} />
        {/* Meta */}

        <View style={styles.row}>
          <Text style={styles.label}>Invoice</Text>
          <Text style={styles.valueBold}>#{receipt.sequenceId}</Text>
        </View>

        {customerDisplay !== "---" && (
          <View style={styles.row}>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{customerDisplay}</Text>
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDate(createdAt)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>{formatTime(createdAt)}</Text>
        </View>

        <View style={styles.dividerDashed} />

        {/* Column headers */}

        <View style={styles.colHeaders}>
          <View style={styles.colItem}>
            <Text style={styles.colHeaderText}>Item</Text>
          </View>

          <View style={styles.colQty}>
            <Text style={[styles.colHeaderText, { textAlign: "right" }]}>
              Qty
            </Text>
          </View>

          <View style={styles.colUnit}>
            <Text style={[styles.colHeaderText, { textAlign: "right" }]}>
              Unit
            </Text>
          </View>

          <View style={styles.colTotal}>
            <Text style={[styles.colHeaderText, { textAlign: "right" }]}>
              Total
            </Text>
          </View>
        </View>

        <View style={styles.dividerSolid} />

        {/* Items */}

        {receipt.items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.colItem}>
              <Text style={styles.itemName}>{item.productName}</Text>
            </View>

            <View style={styles.colQty}>
              <Text style={styles.itemNum}>{item.quantity}</Text>
            </View>

            <View style={styles.colUnit}>
              <Text style={styles.itemNum}>{item.unitPrice.toFixed(0)}</Text>
            </View>

            <View style={styles.colTotal}>
              <Text style={[styles.itemNum, { fontFamily: "Courier-Bold" }]}>
                {item.subTotal.toFixed(0)}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.dividerDashed} />

        {/* Total */}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>

          <Text style={styles.totalValue}>
            {receipt.totalAmount.toFixed(2)} AFN
          </Text>
        </View>

        <View style={styles.dividerDashed} />

        <Text style={styles.footerThank}>Thank you for your purchase!</Text>

        <Text style={styles.footerId}>{receipt.receiptId}</Text>
      </Page>
    </Document>
  );
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

export function PosReceiptDialog({
  open,

  onOpenChange,

  receipt,

  createdAt,
}: PosReceiptDialogProps) {
  if (!receipt) return null;

  const customerDisplay = displayCustomerName(receipt.customerName);

  const handlePrint = async () => {
    const blob = await pdf(
      <ReceiptPdf
        receipt={receipt}
        createdAt={createdAt}
        customerDisplay={customerDisplay}
      />,
    ).toBlob();

    const url = URL.createObjectURL(blob);

    const win = window.open(url, "_blank");

    // Free the object URL after the new tab has loaded it

    if (win) {
      win.addEventListener("load", () => URL.revokeObjectURL(url));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0 shadow-none border border-gray-200">
        {/* Dialog header */}

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

        {/* Scrollable receipt preview */}

        <div className="overflow-y-auto max-h-[70vh] px-5 py-4">
          <div className="font-mono text-xs text-gray-900">
            <p className="text-center font-bold text-base tracking-wide uppercase">
              {receipt.storeName}
            </p>

            <p className="text-center text-gray-500 text-[11px] mt-0.5">
              Point of Sale Receipt
            </p>

            <div className="border-t border-dashed border-gray-300 my-3" />

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

            {/* Column headers — fixed widths matching data rows */}

            <div className="grid grid-cols-[1fr_48px_44px_48px] gap-x-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              <span>Item</span>

              <span className="text-right pr-0.5">Qty</span>

              <span className="text-right pr-0.5">Unit</span>

              <span className="text-right pr-0.5">Total</span>
            </div>

            <div className="border-t border-gray-200 mb-2" />

            {/* Data rows — same fixed widths as headers */}

            <div className="space-y-1.5">
              {receipt.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_48px_44px_48px] gap-x-3 items-start"
                >
                  <span className="font-medium leading-tight break-words">
                    {item.productName}
                  </span>

                  <span className="text-right pr-0.5 tabular-nums">
                    {item.quantity}
                  </span>

                  <span className="text-right pr-0.5 tabular-nums">
                    {item.unitPrice.toFixed(0)}
                  </span>

                  <span className="text-right pr-0.5 font-semibold tabular-nums">
                    {item.subTotal.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

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
