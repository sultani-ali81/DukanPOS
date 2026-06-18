import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCategoryName,
  getInventoryName,
  inventories as initialInventories,
  stockMovements as initialMovements,
  products,
  type Inventory,
  type Product,
  type StockMovement,
} from "@/lib/data";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  MapPin,
  Package,
  Plus,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function InventoryClient() {
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [inventoryList, setInventoryList] =
    useState<Inventory[]>(initialInventories);
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);

  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const stockValue = products.reduce(
    (sum, p) => sum + p.stock * p.purchasePrice,
    0,
  );
  const pendingStockIn = movements.filter(
    (m) => m.type === "in" && m.status === "Pending",
  ).length;

  function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Stock adjusted", {
      description: `${adjusting?.name} stock has been updated.`,
    });
    setAdjusting(null);
  }

  function handleAddInventory(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("inv-name") as HTMLInputElement)
      .value;
    const location = (
      form.elements.namedItem("inv-location") as HTMLInputElement
    ).value;
    setInventoryList((prev) => [
      ...prev,
      {
        id: `inv${prev.length + 1}-${Date.now()}`,
        name,
        location,
        productCount: 0,
        totalUnits: 0,
      },
    ]);
    toast.success("Inventory created", {
      description: `${name} is ready to receive stock.`,
    });
    setAddOpen(false);
  }

  function receiveStockIn(id: string) {
    setMovements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "Done" as const } : m)),
    );
    toast.success("Stock received", {
      description: "Inventory, journal, and reports have been updated.",
    });
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage warehouses, stock levels, and stock movements."
      >
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Add Inventory
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddInventory}>
              <DialogHeader>
                <DialogTitle>Add Inventory</DialogTitle>
                <DialogDescription>
                  Create a new store, warehouse, or branch to hold stock.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="inv-name">Inventory Name</Label>
                  <Input
                    id="inv-name"
                    name="inv-name"
                    placeholder="e.g. Back Warehouse"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inv-location">Location</Label>
                  <Input
                    id="inv-location"
                    name="inv-location"
                    placeholder="e.g. Storage room, Kabul"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Inventory</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Units in Stock"
          value={totalUnits.toLocaleString()}
          icon={Warehouse}
          accent="primary"
        />
        <StatCard
          label="Stock Value"
          value={`AFN ${stockValue.toLocaleString()}`}
          icon={Package}
          accent="emerald"
        />
        <StatCard
          label="Low Stock Items"
          value={lowStock.length.toString()}
          icon={AlertTriangle}
          accent="rose"
        />
        <StatCard
          label="Pending Stock-In"
          value={pendingStockIn.toString()}
          icon={ArrowDownToLine}
          accent="amber"
        />
      </div>

      <Tabs defaultValue="inventories">
        <TabsList className="flex-wrap">
          <TabsTrigger value="inventories">
            Inventories ({inventoryList.length})
          </TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="levels">Stock Levels</TabsTrigger>
        </TabsList>

        {/* Inventories */}
        <TabsContent value="inventories" className="mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inventoryList.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Warehouse className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">
                        {inv.name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {inv.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                      {inv.productCount} products
                    </span>
                    <span className="font-semibold text-foreground">
                      {inv.totalUnits} units
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Stock Movements: stock-in (pending until received) + stock-out (auto on sale) */}
        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.type === "in" ? (
                          <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                            <ArrowDownToLine className="size-4" /> Stock-In
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 font-medium text-blue-600">
                            <ArrowUpFromLine className="size-4" /> Stock-Out
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {m.reference}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getInventoryName(m.inventoryId)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.product}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.date}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            m.status === "Done" ? "secondary" : "destructive"
                          }
                        >
                          {m.status === "Done" ? "Done" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {m.type === "in" && m.status === "Pending" ? (
                          <Button
                            size="sm"
                            onClick={() => receiveStockIn(m.id)}
                          >
                            <Check className="size-4" /> Receive
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">
            Stock-In is created from purchases and stays pending until received.
            Stock-Out is recorded automatically when a sale is completed in the
            POS.
          </p>
        </TabsContent>

        {/* Stock Levels */}
        <TabsContent value="levels" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">
                        Current Stock
                      </TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="text-right">Adjust</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => {
                      const low = p.stock <= p.lowStockThreshold;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getCategoryName(p.categoryId)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {p.stock}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {p.lowStockThreshold}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={low ? "destructive" : "secondary"}>
                              {low ? "Low" : "In Stock"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAdjusting(p)}
                            >
                              Adjust
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
        </TabsContent>
      </Tabs>

      <Dialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent>
          <form onSubmit={handleAdjust}>
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
              <DialogDescription>{adjusting?.name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="adjust-qty">New Quantity</Label>
                <Input
                  id="adjust-qty"
                  type="number"
                  defaultValue={adjusting?.stock}
                  min="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adjust-reason">Reason</Label>
                <select
                  id="adjust-reason"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>Stock count correction</option>
                  <option>Damaged goods</option>
                  <option>Returned items</option>
                  <option>New delivery</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjusting(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Adjustment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
