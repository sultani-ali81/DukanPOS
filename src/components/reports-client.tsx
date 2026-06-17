import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  formatCurrency,
  getCategoryName,
  products,
  purchases,
  sales,
} from "@/lib/data";
import {
  Boxes,
  DollarSign,
  Download,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

export function ReportsClient() {
  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  const totalProfit = sales.reduce((s, x) => s + x.profit, 0);
  const totalPurchases = purchases.reduce((s, x) => s + x.total, 0);
  const stockValue = products.reduce(
    (s, p) => s + p.stock * p.purchasePrice,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Understand how your business is performing."
      >
        <Button variant="outline">
          <Download className="size-4" /> Export
        </Button>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Sales"
          value={formatCurrency(totalSales)}
          icon={DollarSign}
          accent="primary"
        />
        <StatCard
          label="Total Profit"
          value={formatCurrency(totalProfit)}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label="Total Purchases"
          value={formatCurrency(totalPurchases)}
          icon={ShoppingBag}
          accent="amber"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(stockValue)}
          icon={Boxes}
          accent="rose"
        />
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchase">Purchase</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.invoiceNo}
                      </TableCell>
                      <TableCell>{s.customer}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.date}
                      </TableCell>
                      <TableCell className="text-right">{s.items}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(s.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.reference}
                      </TableCell>
                      <TableCell>{p.supplier}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.date}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(p.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.invoiceNo}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(s.total)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {formatCurrency(s.profit)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {Math.round((s.profit / s.total) * 100)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {getCategoryName(p.categoryId)}
                      </TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(p.stock * p.purchasePrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
