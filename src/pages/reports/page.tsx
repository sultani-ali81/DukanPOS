import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/data";
import {
  getStatusClassName,
  getStatusLabel,
  getStatusVariant,
} from "@/lib/status";
import type {
  CashMovementReportRow,
  InventoryReportRow,
  ReportColumn,
  ReportType,
  SaleReportRow,
  StockReportRow,
} from "@/types/reports";
import { ReportPanel } from "./components/report-panel";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---- Sale columns ----
const saleColumns: ReportColumn<SaleReportRow>[] = [
  {
    header: "Sale #",
    cell: (row) => {
      const seqId = row.sequence
        ? `${row.sequence.prefix}-${String(row.sequence.lastIndex).padStart(4, "0")}`
        : "—";
      return <span className="font-mono text-sm font-medium">{seqId}</span>;
    },
  },
  {
    header: "Customer",
    cell: (row) => row.customer.name,
  },
  {
    header: "Status",
    cell: (row) => (
      <Badge
        variant={getStatusVariant(row.status)}
        className={getStatusClassName(row.status)}
      >
        {getStatusLabel(row.status)}
      </Badge>
    ),
  },
  {
    header: "Items",
    className: "text-center items-center",
    cell: (row) => (
      <span className="block text-center items-center">{row.items.length}</span>
    ),
  },
  {
    header: "Total",
    className: "text-center items-center",
    cell: (row) => (
      <span className="block text-center items-center font-semibold">
        {formatCurrency(
          row.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
        )}
      </span>
    ),
  },
  {
    header: "Date",
    cell: (row) => (
      <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>
    ),
  },
];

function renderSaleExpanded(row: SaleReportRow) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 text-xs">Product</TableHead>
          <TableHead className="h-8 text-left text-xs">Qty</TableHead>
          <TableHead className="h-8 text-center items-center text-xs">
            Unit Price
          </TableHead>
          <TableHead className="h-8 text-center items-center text-xs">
            Subtotal
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {row.items.map((item) => (
          <TableRow key={item.id} className="hover:bg-transparent">
            <TableCell className="text-sm">{item.product.name}</TableCell>
            <TableCell className="text-left text-sm">{item.quantity}</TableCell>
            <TableCell className="text-center items-center text-sm">
              {formatCurrency(item.unitPrice)}
            </TableCell>
            <TableCell className="text-center items-center text-sm font-medium">
              {formatCurrency(item.quantity * item.unitPrice)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---- Inventory columns ----
const inventoryColumns: ReportColumn<InventoryReportRow>[] = [
  {
    header: "Inventory",
    cell: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    header: "Address",
    cell: (row) => <span className="text-muted-foreground">{row.address}</span>,
  },
  {
    header: "Products",
    className: "text-center items-center",
    cell: (row) => (
      <span className="block text-center items-center">
        {row.products.length}
      </span>
    ),
  },
  {
    header: "Total Units",
    className: "text-center items-center",
    cell: (row) => (
      <span className="block text-center items-center">
        {row.stockQuantities.reduce((s, sq) => s + sq.quantity, 0)}
      </span>
    ),
  },
  {
    header: "Stock Value",
    className: "text-center items-center",
    cell: (row) => (
      <span className="block text-center items-center font-semibold">
        {formatCurrency(
          row.stockQuantities.reduce(
            (s, sq) => s + sq.quantity * (sq.product.price ?? 0),
            0,
          ),
        )}
      </span>
    ),
  },
];

function renderInventoryExpanded(row: InventoryReportRow) {
  if (row.stockQuantities.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        No stock recorded yet.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 text-xs">Product</TableHead>
          <TableHead className="h-8 text-center items-center text-xs">
            Unit Price
          </TableHead>
          <TableHead className="h-8 text-center items-center text-xs">
            Quantity
          </TableHead>
          <TableHead className="h-8 text-center items-center text-xs">
            Value
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {row.stockQuantities.map((sq) => (
          <TableRow key={sq.id} className="hover:bg-transparent">
            <TableCell className="text-sm">{sq.product.name}</TableCell>
            <TableCell className="text-center items-center text-sm">
              {formatCurrency(sq.product.price ?? 0)}
            </TableCell>
            <TableCell className="text-center items-center text-sm">
              {sq.quantity}
            </TableCell>
            <TableCell className="text-center items-center text-sm font-medium">
              {formatCurrency(sq.quantity * (sq.product.price ?? 0))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---- Stock In / Stock Out columns (shared shape) ----
function makeStockColumns(prefix: string): ReportColumn<StockReportRow>[] {
  return [
    {
      header: `${prefix} #`,
      cell: (row) => {
        const seqId = row.sequence
          ? `${row.sequence.prefix}-${String(row.sequence.lastIndex).padStart(4, "0")}`
          : "—";
        return <span className="font-mono text-sm font-medium">{seqId}</span>;
      },
    },
    {
      header: "Inventory",
      cell: (row) => row.inventory.name,
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge
          variant={getStatusVariant(row.status)}
          className={getStatusClassName(row.status)}
        >
          {getStatusLabel(row.status)}
        </Badge>
      ),
    },
    {
      header: "Items",
      className: "text-center items-center",
      cell: (row) => (
        <span className="block text-center items-center">
          {row.items.length}
        </span>
      ),
    },
    {
      header: "Total Qty",
      className: "text-center items-center",
      cell: (row) => (
        <span className="block text-center items-center">
          {row.items.reduce((s, i) => s + i.quantity, 0)}
        </span>
      ),
    },
    {
      header: "Date",
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ];
}

function renderStockExpanded(row: StockReportRow) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 text-xs">Product</TableHead>
          <TableHead className="h-8 text-center items-center text-xs">
            Quantity
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {row.items.map((item) => (
          <TableRow key={item.id} className="hover:bg-transparent">
            <TableCell className="text-sm">{item.product.name}</TableCell>
            <TableCell className="text-center items-center text-sm font-medium">
              {item.quantity}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---- Cash Movement columns ----
const cashMovementColumns: ReportColumn<CashMovementReportRow>[] = [
  {
    header: "Type",
    className: "w-36",
    cell: (row) => {
      const isCashIn = row.type === "cash_in";
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            isCashIn
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
          }`}
        >
          {isCashIn ? (
            <ArrowDownCircle className="size-4" />
          ) : (
            <ArrowUpCircle className="size-4" />
          )}
          {isCashIn ? "Cash In" : "Cash Out"}
        </span>
      );
    },
  },
  {
    header: "Amount",
    className: "w-36 text-center items-center",
    cell: (row) => {
      const isCashIn = row.type === "cash_in";
      return (
        <span
          className={`block text-center items-center font-semibold tabular-nums ${
            isCashIn
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
          }`}
        >
          {isCashIn ? "+" : "-"}
          {formatCurrency(row.amount)}
        </span>
      );
    },
  },
  {
    header: "Note",
    cell: (row) => (
      <span className="text-muted-foreground">{row.note ?? "—"}</span>
    ),
  },
  {
    header: "Created By",
    cell: (row) => row.createdBy.name,
  },
  {
    header: "Status",
    cell: (row) => (
      <Badge
        variant={getStatusVariant(row.status)}
        className={getStatusClassName(row.status)}
      >
        {getStatusLabel(row.status)}
      </Badge>
    ),
  },
  {
    header: "Date",
    cell: (row) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.createdAt)}
      </span>
    ),
  },
];

// ---- Tab config ----
const REPORT_TABS: { value: ReportType; label: string }[] = [
  { value: "sale", label: "Sales" },
  { value: "purchase", label: "Purchases" },
  { value: "inventory", label: "Inventory" },
  { value: "stock_in", label: "Stock In" },
  { value: "stock_out", label: "Stock Out" },
  { value: "cash_movement", label: "Cash Movement" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>("sale");

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Understand how your business is performing."
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ReportType)}
      >
        <div className="mb-5 flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit flex-wrap">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={[
                "h-6 rounded-lg px-3.5 text-sm font-medium cursor-pointer transition-colors",
                activeTab === tab.value
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <TabsContent value="sale" className="mt-4">
          <ReportPanel
            type="sale"
            columns={saleColumns}
            renderExpanded={renderSaleExpanded}
            emptyLabel="sales"
          />
        </TabsContent>

        <TabsContent value="purchase" className="mt-4">
          <ReportPanel
            type="purchase"
            columns={saleColumns}
            renderExpanded={renderSaleExpanded}
            emptyLabel="purchases"
          />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <ReportPanel
            type="inventory"
            columns={inventoryColumns}
            renderExpanded={renderInventoryExpanded}
            emptyLabel="inventories"
          />
        </TabsContent>

        <TabsContent value="stock_in" className="mt-4">
          <ReportPanel
            type="stock_in"
            columns={makeStockColumns("Stock In")}
            renderExpanded={renderStockExpanded}
            emptyLabel="stock ins"
          />
        </TabsContent>

        <TabsContent value="stock_out" className="mt-4">
          <ReportPanel
            type="stock_out"
            columns={makeStockColumns("Stock Out")}
            renderExpanded={renderStockExpanded}
            emptyLabel="stock outs"
          />
        </TabsContent>

        <TabsContent value="cash_movement" className="mt-4">
          <ReportPanel
            type="cash_movement"
            columns={cashMovementColumns}
            emptyLabel="cash movements"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
