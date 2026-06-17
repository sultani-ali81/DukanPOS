import api from "@/lib/axios";
import type { Product } from "@/pages/product/components/product-list";
import type { OrderFoodPayload } from "@/types";

export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  search?: string;
  filters?: Record<string, string>;
  sorts?: Record<string, string>;
}

export const getProducts = (params?: {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  categoryName?: string;
}): Promise<{ data: Product[]; meta: PaginationMeta }> =>
  api
    .get("/products", {
      params: {
        page: params?.page ?? 1,
        itemsPerPage: params?.itemsPerPage ?? 20,
        // Both text search and category filter use the same ?search= param
        ...(params?.categoryName
          ? { search: params.categoryName }
          : params?.search
            ? { search: params.search }
            : {}),
      },
    })
    .then((r) => {
      const raw: any[] = Array.isArray(r.data)
        ? r.data
        : (r.data.data ?? r.data.products ?? []);
      const meta: PaginationMeta = r.data.meta ?? {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: raw.length,
        totalPages: 1,
      };
      const data = raw.map(
        (p): Product => ({
          id: p.id,
          name: p.name,
          price: p.price,
          category: p.categories?.[0]?.name,
          categoryId: p.categories?.[0]?.id,
          inStock: p.inStock,
          image: p.images?.[0]?.imageUrlSigned ?? "/placeholder.png",
          images:
            p.images
              ?.filter((img: any) => img.imageUrlSigned)
              .map((img: any) => ({ id: img.id, url: img.imageUrlSigned })) ??
            [],
        }),
      );
      return { data, meta };
    });

/**
 * Step 1 — Upload images to MinIO via the attachments controller.
 * POST /attachments/upload
 * Body: multipart/form-data  { images: File[], entityType: "product" }
 * Returns: { ids: string[] }
 */
export const getProductById = (id: string): Promise<Product | void> =>
  api.get(`/products/${id}`).then((r) => {
    const p: any = r.data?.data ?? r.data ?? null;
    if (!p) return;
    const product: Product = {
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.categories?.[0]?.name,
      categoryId: p.categories?.[0]?.id,
      inStock: p.inStock,
      image: p.images?.[0]?.imageUrlSigned ?? "/placeholder.png",
      images:
        p.images
          ?.filter((img: { imageUrlSigned: string }) => img.imageUrlSigned)
          .map((img: { id: string; imageUrlSigned: string }) => ({
            id: img.id,
            url: img.imageUrlSigned,
          })) ?? [],
    };
    return product;
  });

export const uploadProductImages = (
  files: File[],
): Promise<{ ids: string[] }> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  // The AttachmentController validates this enum value on the backend
  formData.append("entityType", "product");
  return api
    .post("/attachments/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

/**
 * Step 2 — Create the product record (no images yet).
 * POST /products
 * Returns: { id: string }
 */
export const createProduct = (data: {
  name: string;
  price: number;
  categoryName: string;
  inStock?: boolean;
}): Promise<{ id: string }> => api.post("/products", data).then((r) => r.data);

/**
 * Step 3 — Claim the uploaded attachment IDs to the newly created product.
 * POST /products/images/claim   (your existing products claim endpoint)
 * Body: { ids: string[], productId: string }
 *
 * This hits your ProductsController which internally calls
 * attachmentService.claimAttachments(ids, productId, "product").
 */
export const claimProductImages = (
  ids: string[],
  productId: string,
): Promise<void> =>
  api
    .post("/attachments/claim", {
      ids,
      entityId: productId,
      entityType: "product",
    })
    .then((r) => r.data);

/** Update an existing product by id */
export const updateProduct = (
  id: string,
  data: {
    name: string;
    price: number;
    categoryName: string;
    inStock?: boolean;
  },
): Promise<{ message: string }> =>
  api.put(`/products/${id}`, data).then((r) => r.data);

/** Delete a product by id */
export const deleteProduct = (id: string): Promise<{ message: string }> =>
  api.delete(`/products/${id}`).then((r) => r.data);

/**
 * Delete a single product image (attachment) by its attachment id.
 * DELETE /products/images/:imageId  — hits your products controller which
 * delegates to attachmentService.deleteAttachment internally.
 */
export const deleteProductImage = (
  imageId: string,
): Promise<{ message: string }> =>
  api.delete(`/products/images/${imageId}`).then((r) => r.data);

export const orderFood = (payload: OrderFoodPayload) => {
  return { message: "Order placed successfully!", payload: payload };
};
