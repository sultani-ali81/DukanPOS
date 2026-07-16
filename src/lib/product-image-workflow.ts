import {
  MAX_PRODUCT_IMAGE_COUNT,
  validateProductImageFiles,
} from "@/lib/product-image-files";
import type { Product, ProductFormSubmitValues } from "@/types/product";

export class ProductImageValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(errors.join(" "));
    this.name = "ProductImageValidationError";
    this.errors = errors;
  }
}

export interface ProductImageWorkflowDependencies {
  uploadSingle: (file: File) => Promise<{ id: string }>;
  uploadMany: (files: File[]) => Promise<{ ids: string[] }>;
  deleteImage: (imageId: string) => Promise<unknown>;
  getProduct: (productId: string) => Promise<Product | void>;
  invalidateProduct: (productId?: string) => Promise<unknown>;
  onRecoveryProduct?: (product?: Product) => void;
}

export interface SaveProductWithImagesInput {
  productId?: string;
  values: ProductFormSubmitValues;
  newFiles: File[];
  deletedImageIds: string[];
  submitProduct: (
    values: ProductFormSubmitValues,
    productId?: string,
  ) => Promise<{ id?: string } | void>;
}

export interface SaveProductWithImagesResult {
  productId?: string;
  product?: Product;
  failedDeletionIds: string[];
  deletionErrors: unknown[];
}

async function refreshProduct(
  productId: string,
  dependencies: ProductImageWorkflowDependencies,
): Promise<Product | undefined> {
  let product: Product | undefined;
  try {
    product = (await dependencies.getProduct(productId)) ?? undefined;
  } finally {
    try {
      await dependencies.invalidateProduct(productId);
    } catch {
      // The explicit refetch is authoritative; cache revalidation can retry.
    }
  }
  return product;
}

async function refreshProductWithoutMaskingError(
  productId: string,
  dependencies: ProductImageWorkflowDependencies,
): Promise<void> {
  try {
    const product = await refreshProduct(productId, dependencies);
    dependencies.onRecoveryProduct?.(product);
  } catch {
    // Preserve the upload/claim error that caused this recovery refetch.
  }
}

export async function saveProductWithImages(
  input: SaveProductWithImagesInput,
  dependencies: ProductImageWorkflowDependencies,
): Promise<SaveProductWithImagesResult> {
  const validation = validateProductImageFiles(input.newFiles);
  if (input.newFiles.length > MAX_PRODUCT_IMAGE_COUNT) {
    validation.errors.push("You can upload at most 100 new images at once.");
  }
  if (validation.errors.length > 0) {
    throw new ProductImageValidationError(validation.errors);
  }

  let attachmentIds: string[] = [];
  if (input.newFiles.length === 1) {
    const uploaded = await dependencies.uploadSingle(input.newFiles[0]);
    if (!uploaded.id) throw new Error("Image upload returned no attachment ID.");
    attachmentIds = [uploaded.id];
  } else if (input.newFiles.length > 1) {
    const uploaded = await dependencies.uploadMany(input.newFiles);
    if (uploaded.ids.length !== input.newFiles.length) {
      throw new Error("Image upload returned an unexpected attachment count.");
    }
    attachmentIds = uploaded.ids;
  }

  const values: ProductFormSubmitValues = { ...input.values };
  if (attachmentIds.length > 0) values.attachmentIds = attachmentIds;

  const shouldSubmitProduct =
    !input.productId || Object.keys(values).length > 0;
  let submitted: { id?: string } | void = undefined;

  if (shouldSubmitProduct) {
    try {
      submitted = await input.submitProduct(values, input.productId);
    } catch (error) {
      if (input.productId) {
        await refreshProductWithoutMaskingError(input.productId, dependencies);
      }
      throw error;
    }
  }

  const productId = input.productId ?? submitted?.id;
  const deletionResults = await Promise.allSettled(
    input.deletedImageIds.map((imageId) =>
      dependencies.deleteImage(imageId),
    ),
  );
  const failedDeletionIds: string[] = [];
  const deletionErrors: unknown[] = [];

  deletionResults.forEach((result, index) => {
    if (result.status === "rejected") {
      failedDeletionIds.push(input.deletedImageIds[index]);
      deletionErrors.push(result.reason);
    }
  });

  const product = productId
    ? await refreshProduct(productId, dependencies)
    : undefined;

  if (!productId) {
    try {
      await dependencies.invalidateProduct();
    } catch {
      // A later list revalidation can recover when create returns no ID.
    }
  }

  return { productId, product, failedDeletionIds, deletionErrors };
}
