import type { PosProduct } from "@/queries/pos-inventory";
import { PosProductCard } from "./pos-product-card";

interface PosProductListProps {
  products: PosProduct[];
  cartQuantities: Record<string, number>;
  onAdd: (product: PosProduct) => void;
}

export function PosProductList({
  products,
  cartQuantities,
  onAdd,
}: PosProductListProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[50vh] px-4 text-center">
        <img
          src="/photos/NotFound2.avif"
          alt="No products"
          className="max-w-40 max-h-40 object-contain"
        />
        <p className="text-base font-medium text-gray-700 mt-4">
          No products found
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Select an inventory or try a different product page.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map((product) => (
        <PosProductCard
          key={product.id}
          product={product}
          cartQuantity={cartQuantities[product.id] ?? 0}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
