import { describe, expect, it, vi } from "vitest";
import {
  ProductImageValidationError,
  saveProductWithImages,
  type ProductImageWorkflowDependencies,
} from "@/lib/product-image-workflow";
import type { Product } from "@/types/product";

function file(name = "new.jpg", type = "image/jpeg") {
  return new File(["image"], name, { type });
}

function product(images: Product["images"] = []): Product {
  return {
    id: "product-1",
    name: "Rice",
    price: 100,
    category: "Food",
    images,
  };
}

function dependencies(
  calls: string[],
  currentProduct = product(),
): ProductImageWorkflowDependencies {
  return {
    uploadSingle: vi.fn(async () => {
      calls.push("upload-single");
      return { id: "attachment-new" };
    }),
    uploadMany: vi.fn(async () => {
      calls.push("upload-many");
      return { ids: ["attachment-1", "attachment-2"] };
    }),
    deleteImage: vi.fn(async (imageId) => {
      calls.push(`delete:${imageId}`);
    }),
    getProduct: vi.fn(async () => {
      calls.push("refetch");
      return currentProduct;
    }),
    invalidateProduct: vi.fn(async () => {
      calls.push("invalidate");
    }),
  };
}

describe("saveProductWithImages", () => {
  it("safely replaces an image and claims only the new attachment ID", async () => {
    const calls: string[] = [];
    const deps = dependencies(
      calls,
      product([
        {
          id: "new-product-image",
          imageUrl: "storage/new.jpg",
          imageUrlSigned: "https://signed/new.jpg",
        },
      ]),
    );
    const submitProduct = vi.fn(async (values) => {
      calls.push("update");
      expect(values).toEqual({
        name: "Updated Rice",
        attachmentIds: ["attachment-new"],
      });
    });

    const result = await saveProductWithImages(
      {
        productId: "product-1",
        values: { name: "Updated Rice" },
        newFiles: [file()],
        deletedImageIds: ["old-product-image"],
        submitProduct,
      },
      deps,
    );

    expect(calls).toEqual([
      "upload-single",
      "update",
      "delete:old-product-image",
      "refetch",
      "invalidate",
    ]);
    expect(result.failedDeletionIds).toEqual([]);
  });

  it("uses the multiple uploader for several new images", async () => {
    const calls: string[] = [];
    const deps = dependencies(calls);
    const submitProduct = vi.fn(async (values) => {
      calls.push("update");
      expect(values.attachmentIds).toEqual([
        "attachment-1",
        "attachment-2",
      ]);
    });

    await saveProductWithImages(
      {
        productId: "product-1",
        values: {},
        newFiles: [file("one.jpg"), file("two.png", "image/png")],
        deletedImageIds: [],
        submitProduct,
      },
      deps,
    );

    expect(calls.slice(0, 2)).toEqual(["upload-many", "update"]);
    expect(deps.uploadSingle).not.toHaveBeenCalled();
  });

  it("deletes selected images without sending attachmentIds: []", async () => {
    const calls: string[] = [];
    const deps = dependencies(calls);
    const submitProduct = vi.fn();

    await saveProductWithImages(
      {
        productId: "product-1",
        values: {},
        newFiles: [],
        deletedImageIds: ["image-1", "image-2"],
        submitProduct,
      },
      deps,
    );

    expect(submitProduct).not.toHaveBeenCalled();
    expect(deps.deleteImage).toHaveBeenCalledTimes(2);
    expect(calls).toEqual([
      "delete:image-1",
      "delete:image-2",
      "refetch",
      "invalidate",
    ]);
  });

  it("updates product fields without uploading or deleting images", async () => {
    const calls: string[] = [];
    const deps = dependencies(calls);
    const submitProduct = vi.fn(async (values) => {
      calls.push("update");
      expect(values).toEqual({ price: 120 });
    });

    await saveProductWithImages(
      {
        productId: "product-1",
        values: { price: 120 },
        newFiles: [],
        deletedImageIds: [],
        submitProduct,
      },
      deps,
    );

    expect(calls).toEqual(["update", "refetch", "invalidate"]);
  });

  it("stops before update and deletion when upload fails", async () => {
    const calls: string[] = [];
    const deps = dependencies(calls);
    vi.mocked(deps.uploadSingle).mockRejectedValueOnce(
      new Error("Upload failed"),
    );
    const submitProduct = vi.fn();

    await expect(
      saveProductWithImages(
        {
          productId: "product-1",
          values: { name: "Updated" },
          newFiles: [file()],
          deletedImageIds: ["old-image"],
          submitProduct,
        },
        deps,
      ),
    ).rejects.toThrow("Upload failed");
    expect(submitProduct).not.toHaveBeenCalled();
    expect(deps.deleteImage).not.toHaveBeenCalled();
    expect(deps.getProduct).not.toHaveBeenCalled();
  });

  it("refetches and never deletes old images when claiming fails", async () => {
    const calls: string[] = [];
    const deps = dependencies(calls);
    const claimError = {
      response: {
        status: 422,
        data: { message: "Attachment not found or already claimed" },
      },
    };
    const submitProduct = vi.fn(async () => {
      calls.push("update");
      throw claimError;
    });

    await expect(
      saveProductWithImages(
        {
          productId: "product-1",
          values: {},
          newFiles: [file()],
          deletedImageIds: ["old-image"],
          submitProduct,
        },
        deps,
      ),
    ).rejects.toBe(claimError);
    expect(deps.deleteImage).not.toHaveBeenCalled();
    expect(calls).toEqual([
      "upload-single",
      "update",
      "refetch",
      "invalidate",
    ]);
  });

  it("returns failed deletions after attempting all and refetching", async () => {
    const calls: string[] = [];
    const deps = dependencies(calls);
    vi.mocked(deps.deleteImage).mockImplementation(async (imageId) => {
      calls.push(`delete:${imageId}`);
      if (imageId === "image-1") throw new Error("Delete failed");
    });

    const result = await saveProductWithImages(
      {
        productId: "product-1",
        values: {},
        newFiles: [],
        deletedImageIds: ["image-1", "image-2"],
        submitProduct: vi.fn(),
      },
      deps,
    );

    expect(deps.deleteImage).toHaveBeenCalledTimes(2);
    expect(result.failedDeletionIds).toEqual(["image-1"]);
    expect(calls.slice(-2)).toEqual(["refetch", "invalidate"]);
  });

  it("rejects invalid files before making any request", async () => {
    const calls: string[] = [];
    const deps = dependencies(calls);

    await expect(
      saveProductWithImages(
        {
          productId: "product-1",
          values: {},
          newFiles: [file("vector.svg", "image/svg+xml")],
          deletedImageIds: [],
          submitProduct: vi.fn(),
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(ProductImageValidationError);
    expect(calls).toEqual([]);
  });
});
