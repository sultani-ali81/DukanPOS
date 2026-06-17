"use client";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency, purchases, type PurchaseStatus } from "@/lib/data";
import { Plus, Truck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function StatusBadge({ status }: { status: PurchaseStatus }) {
  const config: Record<
    PurchaseStatus,
    {
      label: string;
      variant: "secondary" | "default" | "destructive" | "outline";
    }
  > = {
    draft: { label: "Draft", variant: "outline" },
    done: { label: "Done", variant: "default" },
    stocked_in: { label: "Stocked In", variant: "secondary" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PurchasesClient() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>("all");

  const filtered =
    tab === "all" ? purchases : purchases.filter((p) => p.status === tab);

  const countByStatus = (s: PurchaseStatus | "all") =>
    s === "all"
      ? purchases.length
      : purchases.filter((p) => p.status === s).length;

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Record stock purchases from your suppliers."
      >
        <Button onClick={() => navigate("/purchases/new")}>
          <Plus className="size-4" /> New Purchase
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({countByStatus("all")})</TabsTrigger>
          <TabsTrigger value="draft">
            Draft ({countByStatus("draft")})
          </TabsTrigger>
          <TabsTrigger value="done">Done ({countByStatus("done")})</TabsTrigger>
          <TabsTrigger value="stocked_in">
            Stocked In ({countByStatus("stocked_in")})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({countByStatus("cancelled")})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Date</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No purchases found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((p) => (
                        <TableRow
                          key={p.id}
                          className="cursor-pointer  transition-colors hover:bg-muted/50"
                          onClick={() => navigate(`/purchases/${p.id}`)}
                        >
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-2">
                              <Truck className="size-4 text-muted-foreground" />
                              {p.reference}
                            </span>
                          </TableCell>
                          <TableCell>{p.supplier}</TableCell>
                          <TableCell className="text-center">
                            {p.lines.reduce((s, l) => s + l.quantity, 0)}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {formatCurrency(p.total)}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {p.date}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={p.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
