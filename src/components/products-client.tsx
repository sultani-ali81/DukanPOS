"use client";

import { PageHeader } from "@/components/page-header";
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
import {
  categories,
  formatCurrency,
  getCategoryName,
  products,
  type Product,
} from "@/lib/data";
import { Barcode, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function ProductsClient() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.barcode.includes(query),
      ),
    [query],
  );

  function openDetail(product: Product) {
    navigate(`/products/${product.id}`);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Product saved", {
      description: "Your product has been added to the catalog.",
    });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog, prices, and stock."
      >
        <div className="w-80">
          <span className="relative block">
            <Search className="absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name or barcode..."
              className="pl-9"
            />
          </span>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          {/* Changed 'render={<Button />}' to standard 'asChild' to follow shadcn/radix best practices */}
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>Add Product</DialogTitle>
                <DialogDescription>
                  Enter the details for the new product.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Basmati Rice 5kg"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input id="barcode" placeholder="Scan or enter barcode" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="purchase">Purchase Price</Label>
                    <Input
                      id="purchase"
                      type="number"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="selling">Selling Price</Label>
                    <Input
                      id="selling"
                      type="number"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card className="overflow-hidden border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Added 'border-collapse' logic via standard shadcn table layouts */}
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 text-lg py-3 pl-3">
                    Product
                  </TableHead>
                  <TableHead className="h-11 text-lg py-3">Category</TableHead>
                  <TableHead className="h-11 text-lg py-3">Barcode</TableHead>
                  <TableHead className="h-11 text-lg py-3">Purchase</TableHead>
                  <TableHead className="h-11 text-lg py-3">Selling</TableHead>
                  <TableHead className="h-11 text-lg py-3">Stock</TableHead>
                  <TableHead className="h-11 text-lg py-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const totalStock = p.variants
                    ? p.variants.reduce((s, v) => s + v.stock, 0)
                    : p.stock;
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50 border-b last:border-0"
                      onClick={() => openDetail(p)}
                    >
                      <TableCell className="py-3.5 vertical-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground tracking-tight">
                            {p.name}
                          </span>
                          {p.variants && p.variants.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {p.variants.length} variants
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 vertical-middle">
                        <Badge variant="secondary" className="font-medium">
                          {getCategoryName(p.categoryId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 vertical-middle">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <Barcode className="size-3.5 text-muted-foreground/70" />
                          {p.barcode}
                        </span>
                      </TableCell>
                      <TableCell className=" text-muted-foreground py-3.5 vertical-middle font-mono">
                        {formatCurrency(p.purchasePrice)}
                      </TableCell>
                      <TableCell className=" font-semibold py-3.5 vertical-middle font-mono text-primary">
                        {formatCurrency(p.sellingPrice)}
                      </TableCell>
                      <TableCell className=" py-3.5 vertical-middle">
                        <Badge
                          variant={
                            totalStock <= p.lowStockThreshold
                              ? "destructive"
                              : "secondary"
                          }
                          className="min-w-8 justify-center"
                        >
                          {totalStock}
                        </Badge>
                      </TableCell>
                      <TableCell className=" py-3.5 vertical-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 hover:bg-muted"
                          aria-label="Edit product"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(p);
                          }}
                        >
                          <Pencil className="size-4 text-muted-foreground hover:text-foreground" />
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
    </div>
  );
}
