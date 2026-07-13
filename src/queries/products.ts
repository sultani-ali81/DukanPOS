import api from "@/lib/axios";
import type { OrderFoodPayload } from "@/types";
import type {
  CreateProductPayload,
  Product,
  ProductCategory,
  ProductImage,
  ProductInventory,
  UpdateProductPayload,
} from "@/types/product";

export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  search?: string;
}

function mapProduct(raw: Record<string, unknown>): Product {
  const images: ProductImage[] = (
    (raw.images as ProductImage[] | undefined) ?? []
  ).map((img) => ({
    id: img.id,
    imageUrl: img.imageUrl,
    imageUrlSigned: img.imageUrlSigned,
  }));
  const categories: ProductCategory[] =
    (raw.categories as ProductCategory[] | undefined) ?? [];
  const inventories = raw.inventories as ProductInventory[] | undefined;
  const totalStock = inventories?.reduce(
    (sum, inv) => sum + (inv.quantity ?? 0),
    0,
  );

  return {
    id: raw.id as string,
    name: raw.name as string,
    price: raw.price as number,
    barcode:
      (raw.barcode as string | undefined) ??
      (raw.scannerId as string | undefined),
    categories,
    category: categories[0]?.name,
    categoryId: categories[0]?.id,
    images,
    primaryImage: images[0]?.imageUrlSigned ?? images[0]?.imageUrl ?? "",
    inventories,
    totalStock,
  };
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
        itemsPerPage: params?.itemsPerPage ?? 15,
        ...(params?.categoryName
          ? { search: params.categoryName }
          : params?.search
            ? { search: params.search }
            : {}),
      },
    })
    .then((r) => {
      const rawData: unknown[] = Array.isArray(r.data)
        ? r.data
        : (r.data.data ?? r.data.products ?? []);
      const raw = r.data as Record<string, unknown>;
      const meta: PaginationMeta = (raw.meta as PaginationMeta) ?? {
        currentPage: 1,
        itemsPerPage: 15,
        totalItems: rawData.length,
        totalPages: 1,
      };
      return {
        data: rawData.map((p) => mapProduct(p as Record<string, unknown>)),
        meta,
      };
    });

export const getProductById = (id: string): Promise<Product | void> =>
  api.get(`/products/${id}`).then((r) => {
    const p: unknown = r.data?.data ?? r.data ?? null;
    if (!p) return;
    return mapProduct(p as Record<string, unknown>);
  });

export const uploadProductImages = (
  files: File[],
): Promise<{ ids: string[] }> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  formData.append("entityType", "product");
  return api
    .post("/attachments/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const createProduct = (
  data: CreateProductPayload,
): Promise<{ id: string }> => api.post("/products", data).then((r) => r.data);

export const updateProduct = (
  id: string,
  data: UpdateProductPayload,
): Promise<{ message: string }> =>
  api.put(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id: string): Promise<{ message: string }> =>
  api.delete(`/products/${id}`).then((r) => r.data);

export const deleteProductImage = (
  imageId: string,
): Promise<{ message: string }> =>
  api.delete(`/products/images/${imageId}`).then((r) => r.data);

export const getCategories = () => api.get("/categories?itemsPerPage=12");

export const orderFood = (payload: OrderFoodPayload) => {
  return { message: "Order placed successfully!", payload: payload };
};
