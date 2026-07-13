// Add this function to your existing queries/inventory.ts
// It replaces / extends getInventory() with full image + category data for POS

import api from "@/lib/axios";

// ── POS-specific types ────────────────────────────────────────────────────────

export interface PosProductImage {
  id: string;
  imageUrl: string;
  signedUrl: string;
}

export interface PosProductCategory {
  id: string;
  name: string;
}

export interface PosProduct {
  id: string;
  name: string;
  price: number;
  hasPrice: boolean;
  quantity: number;
  sequence: string | null;
  categories: PosProductCategory[];
  images: PosProductImage[];
  /** Convenience: first signed URL or empty string */
  primaryImage: string;
}

export interface PosInventoryDetail {
  id: string;
  name: string;
  address: string;
  products: PosProduct[];
  productsMeta: PosInventoryProductsMeta;
}

export interface PosInventoryProductsMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PosInventoryQuery {
  page?: number;
  itemsPerPage?: number;
}

// ── Raw shapes from the API ───────────────────────────────────────────────────

interface RawPosImage {
  id: string;
  imageUrl?: string;
  imageUrlSigned?: string | null;
  signedUrl?: string | null;
}

interface RawPosCategory {
  id: string;
  name: string;
}

interface RawPosProduct {
  id: string;
  name?: string;
  price?: number;
  quantity: number;
  sequence?: string | null;
  categories?: RawPosCategory[];
  images?: RawPosImage[];
}

interface RawPosInventory {
  id: string;
  name: string;
  address?: string;
  products:
    | RawPosProduct[]
    | {
        data: RawPosProduct[];
        meta?: {
          currentPage: number;
          itemsPerPage: number;
          totalItems: number;
          totalPages: number;
        };
      };
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapPosProduct(p: RawPosProduct): PosProduct {
  const images: PosProductImage[] = (p.images ?? [])
    .map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl ?? "",
      signedUrl: img.signedUrl ?? img.imageUrlSigned ?? "",
    }))
    .filter((image) => Boolean(image.signedUrl));
  const hasPrice = Number.isFinite(p.price) && Number(p.price) >= 0;

  return {
    id: p.id,
    name: p.name?.trim() || "Unnamed product",
    price: hasPrice ? Number(p.price) : 0,
    hasPrice,
    quantity: p.quantity,
    sequence: p.sequence ?? null,
    categories: (p.categories ?? []).map((c) => ({ id: c.id, name: c.name })),
    images,
    primaryImage: images[0]?.signedUrl ?? "",
  };
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * GET /inventory/:id
 *
 * Full inventory detail for the POS — includes product images and categories.
 * Add this alongside the existing getInventory() in queries/inventory.ts.
 */
export async function getPosInventory(
  id: string,
  query: PosInventoryQuery = {},
): Promise<PosInventoryDetail> {
  const { page = 1, itemsPerPage = 20 } = query;
  const res = await api.get<RawPosInventory>(`/inventory/${id}`, {
    params: { page, itemsPerPage },
  });
  const raw = res.data;
  const products = Array.isArray(raw.products)
    ? raw.products
    : raw.products?.data ?? [];
  const productsMeta = !Array.isArray(raw.products)
    ? raw.products.meta
    : undefined;

  return {
    id: raw.id,
    name: raw.name,
    address: raw.address ?? "",
    products: products.map(mapPosProduct),
    productsMeta: {
      currentPage: productsMeta?.currentPage ?? page,
      itemsPerPage: productsMeta?.itemsPerPage ?? itemsPerPage,
      totalItems: productsMeta?.totalItems ?? products.length,
      totalPages:
        productsMeta?.totalPages ?? (products.length > 0 ? 1 : 0),
    },
  };
}
