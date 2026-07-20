import { Button } from "@/components/ui/button";
import { printProductLabel, renderProductBarcode } from "@/lib/product-barcode";
import { cn } from "@/lib/utils";
import { Printer } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ProductBarcodeProps {
  productCode?: string;
  productName: string;
  className?: string;
}

export function ProductBarcode({
  productCode,
  productName,
  className,
}: ProductBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!productCode || !svgRef.current) return;
    renderProductBarcode(svgRef.current, productCode);
  }, [productCode]);

  if (!productCode) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        Product code is unavailable.
      </div>
    );
  }

  function handlePrint() {
    const opened = printProductLabel({
      productCode: productCode!,
      productName,
    });
    if (!opened) {
      toast.error("Could not open the print dialog", {
        description: "Allow pop-ups for this site and try again.",
      });
    }
  }

  return (
    <section className={cn("rounded-lg border bg-white m-6 p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Product Barcode</p>
          <p className="text-xs text-muted-foreground">
            Code 128 · {productCode}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={handlePrint}
        >
          <Printer className="size-4" />
          Print Label
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md bg-white p-2">
        <svg
          ref={svgRef}
          role="img"
          aria-label={`Code 128 barcode for ${productCode}`}
          className="mx-auto block h-auto max-w-full"
        />
      </div>
    </section>
  );
}
