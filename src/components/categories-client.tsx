"use client"

import { useState } from "react"
import { Plus, Package } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { categories, products } from "@/lib/data"

export function CategoriesClient() {
  const [open, setOpen] = useState(false)

  function countProducts(categoryId: string) {
    return products.filter((p) => p.categoryId === categoryId).length
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    toast.success("Category added", { description: "Your new category is ready to use." })
    setOpen(false)
  }

  return (
    <div>
      <PageHeader title="Categories" description="Organize your products into categories.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" /> Add Category
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>Add Category</DialogTitle>
                <DialogDescription>Create a new product category.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-4">
                <Label htmlFor="catname">Category Name</Label>
                <Input id="catname" placeholder="e.g. Dairy" required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Category</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className="flex size-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
              >
                <Package className="size-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{cat.name}</p>
                <p className="text-sm text-muted-foreground">
                  {countProducts(cat.id)} products
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
