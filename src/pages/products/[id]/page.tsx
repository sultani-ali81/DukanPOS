import { notFound } from "next/navigation"
import { ProductDetailClient } from "@/components/product-detail-client"
import { products } from "@/lib/data"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = products.find((p) => p.id === id)

  if (!product) {
    notFound()
  }

  return <ProductDetailClient product={product} />
}
