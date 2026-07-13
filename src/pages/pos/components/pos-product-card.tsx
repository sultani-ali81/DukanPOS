import type { PosProduct } from "@/queries/pos-inventory";
import { formatCurrency } from "@/lib/data";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface PosProductCardProps {
  product: PosProduct;
  cartQuantity: number;
  onAdd: (product: PosProduct) => void;
}

export function PosProductCard({
  product,
  cartQuantity,
  onAdd,
}: PosProductCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images =
    product.images.length > 0
      ? product.images.map((img) => img.signedUrl)
      : ["/photos/NotFound2.avif"];

  const hasMultiple = images.length > 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i + 1) % images.length);
  };

  const outOfStock = product.quantity <= 0;
  const unavailable = !product.hasPrice;
  const atStockLimit = cartQuantity >= product.quantity && !outOfStock;

  return (
    <div
      onClick={() =>
        !outOfStock && !atStockLimit && !unavailable && onAdd(product)
      }
      className={[
        "overflow-hidden rounded-xl border border-gray-200 transition-all duration-150 select-none",
        outOfStock || atStockLimit || unavailable
          ? " cursor-not-allowed"
          : "cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.98]",
      ].join(" ")}
    >
      {/* Image */}
      <div className="relative aspect-square w-full h-20 w-20 sm:h-60 sm:w-full group">
        <img
          src={images[currentIndex]}
          alt={product.name}
          className="h-full w-full object-cover px-2 pt-2 rounded-xl"
        />

        {/* Cart badge */}
        {cartQuantity > 0 && (
          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow">
            {cartQuantity}
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
            <span className="text-sm font-semibold text-red-500 bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-200">
              Out of stock
            </span>
          </div>
        )}

        {!outOfStock && unavailable && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl">
            <span className="text-sm font-semibold text-red-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-red-200">
              Price unavailable
            </span>
          </div>
        )}

        {/* Max stock reached overlay */}
        {atStockLimit && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
            <span className="text-sm font-semibold text-orange-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-orange-200">
              Max: {product.quantity}
            </span>
          </div>
        )}

        {/* Multi-image chevrons */}
        {hasMultiple && !outOfStock && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 text-white items-center justify-center hidden group-hover:flex hover:bg-black/60 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 text-white items-center justify-center hidden group-hover:flex hover:bg-black/60 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all ${
                  i === currentIndex
                    ? "w-2 h-2 bg-white"
                    : "w-1.5 h-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 min-h-[36px]">
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 break-words leading-tight">
            {product.name}
          </h3>
          <span className="text-sm font-semibold text-green-600 shrink-0 whitespace-nowrap">
            {product.hasPrice ? formatCurrency(product.price) : "No price"}
          </span>
        </div>
        {/* Stock indicator */}
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[11px] text-gray-600">
            Stock: {product.quantity}
          </span>
        </div>
      </div>
    </div>
  );
}
