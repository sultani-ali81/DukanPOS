import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import {
  deleteProductImage,
  uploadProductImage,
  uploadProductImages,
} from "@/queries/products";

vi.mock("@/lib/axios", () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("product image API requests", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads one image using the single endpoint and fields", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: "attachment-1" } });
    const file = new File(["one"], "one.jpg", { type: "image/jpeg" });

    await uploadProductImage(file);

    expect(api.post).toHaveBeenCalledWith(
      "/attachments/upload/single",
      expect.any(FormData),
    );
    const formData = vi.mocked(api.post).mock.calls[0][1] as FormData;
    expect(formData.get("image")).toBe(file);
    expect(formData.get("entityType")).toBe("product");
    expect(vi.mocked(api.post).mock.calls[0]).toHaveLength(2);
  });

  it("uploads several images under repeated images fields", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { ids: ["attachment-1", "attachment-2"] },
    });
    const one = new File(["one"], "one.jpg", { type: "image/jpeg" });
    const two = new File(["two"], "two.png", { type: "image/png" });

    await uploadProductImages([one, two]);

    expect(api.post).toHaveBeenCalledWith(
      "/attachments/upload",
      expect.any(FormData),
    );
    const formData = vi.mocked(api.post).mock.calls[0][1] as FormData;
    expect(formData.getAll("images")).toEqual([one, two]);
    expect(formData.get("entityType")).toBe("product");
    expect(vi.mocked(api.post).mock.calls[0]).toHaveLength(2);
  });

  it("deletes by ProductImage ID", async () => {
    vi.mocked(api.delete).mockResolvedValue({
      data: { message: "Image deleted successfully" },
    });

    await deleteProductImage("product-image-id");

    expect(api.delete).toHaveBeenCalledWith(
      "/products/images/product-image-id",
    );
  });
});
