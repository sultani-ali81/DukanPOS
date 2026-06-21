import { PurchaseDetailClient } from "@/pages/purchases/components/purchase-detail-client";
import { useParams } from "react-router-dom";

export default function ViewPurchase() {
  const { id } = useParams();
  return <PurchaseDetailClient purchaseId={id} />;
}
