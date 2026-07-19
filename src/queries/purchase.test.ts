import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import {
  addPurchasePayment,
  createPurchase,
  getPurchases,
  updatePurchaseStatus,
} from "./purchase";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("purchase API requests", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists purchases with backend-supported pagination and search params", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [],
        meta: {
          currentPage: 1,
          itemsPerPage: 20,
          totalItems: 0,
          totalPages: 0,
          totalCount: 0,
        },
      },
    });

    await getPurchases({ search: "rice" });

    expect(api.get).toHaveBeenCalledWith("/purchase", {
      params: { page: 1, itemsPerPage: 20, search: "rice" },
    });
  });

  it("posts the backend create payload unchanged", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { purchaseId: "purchase-1", message: "Created" },
    });
    const payload = {
      customerId: "supplier-1",
      inventoryId: "inventory-1",
      customDate: "2026-07-18",
      note: "Supplier invoice #42",
      paymentStatus: "partially_paid" as const,
      amount: 125.5,
      items: [{ productId: "product-1", quantity: 2, unitPrice: 62.75 }],
    };

    await createPurchase(payload);

    expect(api.post).toHaveBeenCalledWith("/purchase", payload);
    const requestBody = vi.mocked(api.post).mock.calls[0]?.[1] as {
      amount: unknown;
    };
    expect(typeof requestBody.amount).toBe("number");
  });

  it("sends only a status for a status transition", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { message: "Updated" } });

    await updatePurchaseStatus("purchase-1", { status: "Done" });

    expect(api.put).toHaveBeenCalledWith("/purchase/purchase-1", {
      status: "Done",
    });
  });

  it("sends both required fields for an additional payment", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { message: "Updated" } });

    await addPurchasePayment("purchase-1", {
      amount: 150,
      paymentStatus: "partially_paid",
    });

    expect(api.put).toHaveBeenCalledWith("/purchase/purchase-1", {
      amount: 150,
      paymentStatus: "partially_paid",
    });
  });
});
