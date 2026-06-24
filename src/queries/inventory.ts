// src/queries/inventory.ts
import api from "@/lib/axios";
import type {
  GetInventoriesParams,
  Inventory,
  InventoryDetail,
  InventoryItem,
  InventoryProduct,
  PaginatedInventories,
  PaginationMeta,
  RawInventory,
  RawInventoryDetail,
  RawInventoryItem,
} from "@/types/inventory";

export type {
  GetInventoriesParams,
  Inventory,
  InventoryDetail,
  InventoryItem,
  InventoryProduct,
  PaginatedInventories,
  PaginationMeta,
};

// ── Mapping helpers ───────────────────────────────────────────────────────────

function mapInventories(raw: unknown[]): Inventory[] {
  return (raw as RawInventory[]).map(
    (inv): Inventory => ({
      id: inv.id,
      name: inv.name,
      address: inv.address ?? "",
      items: (inv.items ?? inv.products ?? []).map(
        (item: RawInventoryItem): InventoryItem => ({
          id: item.id,
          name: item.name,
          category: item.category ?? "",
          quantity: item.quantity ?? 0,
          unit: item.unit ?? "",
          price: item.price ?? 0,
          status: item.status ?? "In Stock",
          lastUpdated:
            item.lastUpdated ?? item.updatedAt ?? item.createdAt ?? "",
        }),
      ),
    }),
  );
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const getInventories = (
  params: GetInventoriesParams = {},
): Promise<PaginatedInventories> => {
  const { page = 1, itemsPerPage = 10, search } = params;
  const query: Record<string, string | number> = { page, itemsPerPage };
  if (search) query.search = search;

  return api.get("/inventory", { params: query }).then((r) => {
    if (Array.isArray(r.data)) {
      const mapped = mapInventories(r.data);
      return {
        data: mapped,
        meta: {
          currentPage: 1,
          itemsPerPage: mapped.length,
          totalItems: mapped.length,
          totalPages: 1,
          totalCount: mapped.length,
        },
      };
    }

    const raw: unknown[] = r.data.data ?? r.data.inventories ?? [];
    const serverMeta: Record<string, unknown> = r.data.meta ?? {};
    const totalItems: number =
      (serverMeta.totalItems as number | undefined) ??
      (serverMeta.total as number | undefined) ??
      raw.length;

    const meta: PaginationMeta = {
      currentPage:
        (serverMeta.currentPage as number | undefined) ??
        (serverMeta.page as number | undefined) ??
        1,
      itemsPerPage:
        (serverMeta.itemsPerPage as number | undefined) ?? itemsPerPage,
      totalItems,
      totalPages:
        (serverMeta.totalPages as number | undefined) ??
        Math.ceil(totalItems / itemsPerPage) ??
        1,
      totalCount:
        (serverMeta.totalCount as number | undefined) ??
        (serverMeta.total as number | undefined) ??
        raw.length,
      search: serverMeta.search as string | undefined,
      filters: serverMeta.filters as
        | Record<string, string | string[]>
        | undefined,
      sorts: serverMeta.sorts as Record<string, "asc" | "desc"> | undefined,
    };

    return { data: mapInventories(raw), meta };
  });
};

export const getInventory = (id: string): Promise<InventoryDetail> =>
  api.get<RawInventoryDetail>(`/inventory/${id}`).then((r) => {
    const raw = r.data;
    const detail: InventoryDetail = {
      id: raw.id,
      name: raw.name,
      address: raw.address ?? "",
      products: raw.products.map(
        (p): InventoryProduct => ({
          id: p.id,
          name: p.name,
          price: p.price,
          quantity: p.quantity,
          barcode: p.barcode ?? null,
          sequence: p.sequence ?? null,
          categories: p.categories ?? [],
          images: p.images ?? [],
        }),
      ),
    };
    return detail;
  });

export const createInventory = (data: {
  name: string;
  address: string;
}): Promise<{ id: string }> => api.post("/inventory", data).then((r) => r.data);

export const updateInventory = (
  id: string,
  data: { name: string; address: string },
): Promise<{ message: string }> =>
  api.put(`/inventory/${id}`, data).then((r) => r.data);

export const deleteInventory = (id: string): Promise<{ message: string }> =>
  api.delete(`/inventory/${id}`).then((r) => r.data);
