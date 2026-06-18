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
}

// ── Raw shapes from the API ───────────────────────────────────────────────────

interface RawPosImage {
  id: string;
  imageUrl: string;
  imageUrlSigned?: string;
  signedUrl?: string;
}

interface RawPosCategory {
  id: string;
  name: string;
}

interface RawPosProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sequence?: string | null;
  categories?: RawPosCategory[];
  images?: RawPosImage[];
}

interface RawPosInventory {
  id: string;
  name: string;
  address?: string;
  products: RawPosProduct[];
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapPosProduct(p: RawPosProduct): PosProduct {
  const images: PosProductImage[] = (p.images ?? []).map((img) => ({
    id: img.id,
    imageUrl: img.imageUrl,
    signedUrl: img.signedUrl ?? img.imageUrlSigned ?? "",
  }));

  return {
    id: p.id,
    name: p.name,
    price: p.price,
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
export async function getPosInventory(id: string): Promise<PosInventoryDetail> {
  const res = await api.get<RawPosInventory>(`/inventory/${id}`);
  const raw = res.data;
  return {
    id: raw.id,
    name: raw.name,
    address: raw.address ?? "",
    products: raw.products.map(mapPosProduct),
  };
}
