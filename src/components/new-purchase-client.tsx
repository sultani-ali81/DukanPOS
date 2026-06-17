"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { contacts, formatCurrency, inventories, products } from "@/lib/data";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Package,
  Plus,
  Trash2,
  Truck,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

type LineItem = {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
};

let lineCounter = 0;
function newLine(): LineItem {
  lineCounter += 1;
  return {
    id: `line-${lineCounter}`,
    productId: products[0]?.id ?? "",
    quantity: 1,
    price: products[0]?.purchasePrice ?? 0,
  };
}

export function NewPurchaseClient() {
  const navigate = useNavigate();
  const suppliers = contacts.filter((c) => c.type === "supplier");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [inventoryId, setInventoryId] = useState(inventories[0]?.id ?? "");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [status, setStatus] = useState<"draft" | "done">("draft");

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        // Auto-fill default purchase price when product changes.
        if (patch.productId) {
          const prod = products.find((p) => p.id === patch.productId);
          if (prod) {
            next.price = prod.purchasePrice;
            next.variantId = undefined; // Reset variant when product changes
          }
        }
        return next;
      }),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(id: string) {
    setLines((prev) =>
      prev.length > 1 ? prev.filter((l) => l.id !== id) : prev,
    );
  }

  const totalItems = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0),
    0,
  );
  const total = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.price) || 0),
    0,
  );

  function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    setStatus("draft");
    toast.success("Purchase saved as draft", {
      description: "You can complete it later from the purchases list.",
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (totalItems <= 0) {
      toast.error("No products", {
        description: "Add at least one product with a quantity.",
      });
      return;
    }
    setStatus("done");
    toast.success("Purchase marked as done", {
      description: `Stock it in when ready.`,
    });
  }

  return (
    <form onSubmit={handleSave}>
      <PageHeader
        title="New Purchase"
        description="Add products and assign them to an inventory."
      >
        <Button
          type="button"
          variant="outline"
          render={<Link ref="/purchases" />}
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: line items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Products</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
              >
                <Plus className="size-4" /> Add Product
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-44">Product</TableHead>
                      <TableHead className="w-24 text-right">Qty</TableHead>
                      <TableHead className="w-32 text-right">
                        Unit Price
                      </TableHead>
                      <TableHead className="w-32 text-right">
                        Subtotal
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const product = products.find(
                        (p) => p.id === line.productId,
                      );
                      const hasVariants =
                        product?.variants && product.variants.length > 0;
                      return (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div className="space-y-2">
                              <select
                                value={line.productId}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    productId: e.target.value,
                                  })
                                }
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  quantity: Number(e.target.value),
                                })
                              }
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={line.price}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  price: Number(e.target.value),
                                })
                              }
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(
                              (Number(line.quantity) || 0) *
                                (Number(line.price) || 0),
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLine(line.id)}
                              aria-label="Remove product"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Action card below the products list */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-xs text-muted-foreground">
                Save as draft to complete later, or save and mark as done when
                ready.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" size="lg" className="h-12 w-auto">
                  Save &amp; Mark as Done
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 w-auto"
                  onClick={handleSaveDraft}
                >
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: flow + details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-0">
                {[
                  {
                    label: "Draft",
                    sublabel: "Purchase created",
                    icon: Circle,
                    state: status === "draft" ? "active" : "done",
                  },
                  {
                    label: "Done",
                    sublabel: "Marked as complete",
                    icon: CheckCircle2,
                    state: status === "done" ? "active" : "pending",
                  },
                  {
                    label: "Stock-In",
                    sublabel: "Items received",
                    icon: Package,
                    state: "pending",
                  },
                ].map((step, idx, arr) => {
                  const Icon = step.icon;
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={step.label} className="flex items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`flex size-10 items-center justify-center rounded-full border-2 transition-all ${
                            step.state === "done"
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : step.state === "active"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 text-muted-foreground/30"
                          }`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-xs font-semibold ${
                              step.state === "done"
                                ? "text-emerald-600"
                                : step.state === "active"
                                  ? "text-primary"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {step.sublabel}
                          </p>
                        </div>
                      </div>
                      {!isLast && (
                        <div
                          className={`mb-6 h-0.5 w-16 sm:w-24 ${
                            arr[idx + 1].state !== "pending"
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/20"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="supplier" className="flex items-center gap-1.5">
                  <Truck className="size-3.5" /> Supplier
                </Label>
                <select
                  id="supplier"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="inventory"
                  className="flex items-center gap-1.5"
                >
                  <Warehouse className="size-3.5" /> Assign to Inventory
                </Label>
                <select
                  id="inventory"
                  value={inventoryId}
                  onChange={(e) => setInventoryId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {inventories.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="po-date">Date</Label>
                <Input
                  id="po-date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">Total items</span>
                <span className="font-medium text-foreground">
                  {totalItems}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(total)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
