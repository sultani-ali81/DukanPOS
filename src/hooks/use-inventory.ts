import { usePagination } from "@/hooks/use-pagination";

import { useSearch } from "@/hooks/use-search";

import { getInventories, getInventory } from "@/queries/inventory";

import { getProductById } from "@/queries/products";

import type {
  Inventory,
  InventoryDetail,
  InventoryItem,
  InventoryProduct,
  PaginationMeta,
  StockStatus,
} from "@/types/inventory";

import type { Product } from "@/types/product";

import { useMemo, useState } from "react";

import useSWR from "swr";

export type {
  Inventory,
  InventoryDetail,
  InventoryItem,
  InventoryProduct,
  StockStatus,
};

export interface UseInventoryReturn {
  inventories: Inventory[];

  paginationMeta: PaginationMeta;

  loading: boolean;

  error: string | null;

  selectedInventory: InventoryDetail | null;

  detailLoading: boolean;

  detailError: string | null;

  stats: Array<{ label: string; value: string; date: string; sub: string }>;

  filtered: InventoryProduct[];

  page: number;

  itemsPerPage: number;

  totalPages: number;

  totalItems: number;

  goToPage: (page: number) => void;

  listSearch: string;

  setListSearch: (value: string) => void;

  clearListSearch: () => void;

  listSearchOpen: boolean;

  setListSearchOpen: (open: boolean) => void;

  inventoryDialogOpen: boolean;

  inventoryDialogTarget: Inventory | null;

  openAddInventoryDialog: () => void;

  openEditInventoryDialog: (inv: Inventory) => void;

  closeInventoryDialog: () => void;

  productDialogOpen: boolean;

  selectedProduct: InventoryProduct | null;

  productDetail: Product | null;

  productDetailLoading: boolean;

  openProductDialog: (product: InventoryProduct) => void;

  closeProductDialog: () => void;

  itemDialogOpen: boolean;

  setItemDialogOpen: (open: boolean) => void;

  status: string;

  setStatus: (status: string) => void;

  search: string;

  setSearch: (value: string) => void;

  searchOpen: boolean;

  setSearchOpen: (open: boolean) => void;

  selectedRow: string | null;

  setSelectedRow: (id: string | null) => void;

  handleInventoryAdded: (newId: string) => void;

  handleInventoryUpdated: (id: string) => void;

  handleInventoryDeleted: () => void;

  handleItemAdded: () => void;

  switchInventory: (id: string | null) => void;

  selectedInventoryId: string | null;
}

const ITEMS_PER_PAGE = 10;

// ── Local UI state only (no data) ──────────────────────────────────────────────

interface UseInventoryUIState {
  selectedInventoryId: string | null;

  setSelectedInventoryId: (id: string | null) => void;

  listSearchOpen: boolean;

  setListSearchOpen: (open: boolean) => void;

  inventoryDialogOpen: boolean;

  inventoryDialogTarget: Inventory | null;

  setInventoryDialogOpen: (open: boolean) => void;

  setInventoryDialogTarget: (inv: Inventory | null) => void;

  itemDialogOpen: boolean;

  setItemDialogOpen: (open: boolean) => void;

  productDialogOpen: boolean;

  selectedProduct: InventoryProduct | null;

  productDetail: Product | null;

  setProductDialogOpen: (open: boolean) => void;

  setSelectedProduct: (product: InventoryProduct | null) => void;

  setProductDetail: (product: Product | null) => void;

  status: string;

  setStatus: (status: string) => void;

  search: string;

  setSearch: (value: string) => void;

  searchOpen: boolean;

  setSearchOpen: (open: boolean) => void;

  selectedRow: string | null;

  setSelectedRow: (id: string | null) => void;
}

function useInventoryUI(): UseInventoryUIState {
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(
    null,
  );

  const [listSearchOpen, setListSearchOpen] = useState(false);

  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);

  const [inventoryDialogTarget, setInventoryDialogTarget] =
    useState<Inventory | null>(null);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);

  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<InventoryProduct | null>(null);

  const [productDetail, setProductDetail] = useState<Product | null>(null);

  const [status, setStatus] = useState("all");

  const [search, setSearch] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);

  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  return {
    selectedInventoryId,

    setSelectedInventoryId,

    listSearchOpen,

    setListSearchOpen,

    inventoryDialogOpen,

    inventoryDialogTarget,

    setInventoryDialogOpen,

    setInventoryDialogTarget,

    itemDialogOpen,

    setItemDialogOpen,

    productDialogOpen,

    selectedProduct,

    productDetail,

    setProductDialogOpen,

    setSelectedProduct,

    setProductDetail,

    status,

    setStatus,

    search,

    setSearch,

    searchOpen,

    setSearchOpen,

    selectedRow,

    setSelectedRow,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInventory(): UseInventoryReturn {
  const { page, setPage, goToPage, resetToPage1 } = usePagination({
    initialPage: 1,

    initialItemsPerPage: ITEMS_PER_PAGE,
  });

  const {
    search: listSearch,

    debouncedSearch: listSearchDebounced,

    handleSearch: setListSearch,

    clearSearch: clearListSearch,
  } = useSearch({ debounceMs: 400, onSearch: resetToPage1 });

  const ui = useInventoryUI();

  // ── SWR: inventories list ─────────────────────────────────────────────────

  const listKey = [
    "inventories",

    { page, itemsPerPage: ITEMS_PER_PAGE, search: listSearchDebounced },
  ] as const;

  const {
    data: listData,

    isLoading: listLoading,

    error: listError,

    mutate: mutateInventories,
  } = useSWR(listKey, ([, params]) => getInventories(params));

  const inventories = listData?.data ?? [];

  const paginationMeta: PaginationMeta = listData?.meta ?? {
    currentPage: 1,

    itemsPerPage: ITEMS_PER_PAGE,

    totalItems: 0,

    totalPages: 1,

    totalCount: 0,
  };

  const loading = listLoading && !listData;

  const error = listError
    ? (listError?.response?.data?.message ??
      listError?.message ??
      "Failed to load inventories")
    : null;

  // ── SWR: single inventory detail ───────────────────────────────────────────

  const detailKey = ui.selectedInventoryId
    ? (["inventory", ui.selectedInventoryId] as const)
    : null;

  const {
    data: selectedInventory,

    isLoading: detailLoading,

    error: detailError,

    mutate: mutateDetail,
  } = useSWR(detailKey, ([, id]) => getInventory(id));

  // ── SWR: product detail (only when dialog open with a product) ────────────

  const productKey =
    ui.productDialogOpen && ui.selectedProduct
      ? (["product", ui.selectedProduct.id] as const)
      : null;

  const {
    data: productDetail,

    isLoading: productDetailLoading,

    error: productDetailError,
  } = useSWR(productKey, ([, id]) => getProductById(id));

  // ── Derived stats + filter (memoized) ──────────────────────────────────────

  const stats = useMemo(() => {
    const products = selectedInventory?.products ?? [];

    const total = products.length;

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",

      day: "2-digit",

      month: "long",

      year: "numeric",
    });

    const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);

    const outOfStock = products.filter((p) => p.quantity === 0).length;

    const lowStock = products.filter(
      (p) => p.quantity > 0 && p.quantity <= 10,
    ).length;

    return [
      {
        label: "Total Products",

        value: String(total),

        date: today,

        sub: `${totalQty} units in stock`,
      },

      {
        label: "Low Stock Alerts",

        value: String(lowStock),

        date: today,

        sub: "Needs restocking",
      },

      {
        label: "Out of Stock",

        value: String(outOfStock),

        date: today,

        sub: "Urgent action needed",
      },
    ];
  }, [selectedInventory]);

  const filtered = useMemo((): InventoryProduct[] => {
    const products = selectedInventory?.products ?? [];

    return products.filter((product) => {
      const matchesStatus =
        ui.status === "all" ||
        (ui.status === "In Stock" && product.quantity > 10) ||
        (ui.status === "Low Stock" &&
          product.quantity > 0 &&
          product.quantity <= 10) ||
        (ui.status === "Out of Stock" && product.quantity === 0);

      const matchesSearch =
        !ui.search ||
        product.name.toLowerCase().includes(ui.search.toLowerCase()) ||
        product.id.toLowerCase().includes(ui.search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [selectedInventory, ui.status, ui.search]);

  // ── Dialog actions (SWR mutate replaces manual refetch) ────────────────────

  const openAddInventoryDialog = () => {
    ui.setInventoryDialogTarget(null);

    ui.setInventoryDialogOpen(true);
  };

  const openEditInventoryDialog = (inv: Inventory) => {
    ui.setInventoryDialogTarget(inv);

    ui.setInventoryDialogOpen(true);
  };

  const closeInventoryDialog = () => {
    ui.setInventoryDialogOpen(false);

    ui.setInventoryDialogTarget(null);
  };

  const openProductDialog = (product: InventoryProduct) => {
    ui.setSelectedProduct(product);

    ui.setProductDialogOpen(true);

    // product detail auto-fetches via productKey SWR
  };

  const closeProductDialog = () => {
    ui.setProductDialogOpen(false);

    ui.setSelectedProduct(null);

    ui.setProductDetail(null);
  };

  const handleInventoryAdded = (_newId: string) => {
    closeInventoryDialog();

    mutateInventories(); // SWR re-fetches the list
  };

  const handleInventoryUpdated = (id: string) => {
    closeInventoryDialog();

    mutateInventories();

    if (ui.selectedInventoryId === id) {
      mutateDetail();
    }
  };

  const handleInventoryDeleted = () => {
    closeInventoryDialog();

    setPage(1);

    mutateInventories();

    ui.setSelectedInventoryId(null);
  };

  const handleItemAdded = () => {
    ui.setItemDialogOpen(false);

    if (ui.selectedInventoryId) {
      mutateDetail();
    }
  };

  const switchInventory = (id: string | null) => {
    ui.setSelectedInventoryId(id);

    ui.setStatus("all");

    ui.setSearch("");

    ui.setSelectedRow(null);
  };

  return {
    inventories,

    paginationMeta,

    loading,

    error,

    selectedInventory: selectedInventory ?? null,

    detailLoading,

    detailError: detailError
      ? (detailError?.response?.data?.message ??
        detailError?.message ??
        "Failed to load inventory detail")
      : null,

    stats,

    filtered,

    page,

    itemsPerPage: ITEMS_PER_PAGE,

    totalPages: paginationMeta.totalPages,

    totalItems: paginationMeta.totalItems,

    goToPage,

    listSearch,

    setListSearch,

    clearListSearch,

    listSearchOpen: ui.listSearchOpen,

    setListSearchOpen: ui.setListSearchOpen,

    inventoryDialogOpen: ui.inventoryDialogOpen,

    inventoryDialogTarget: ui.inventoryDialogTarget,

    openAddInventoryDialog,

    openEditInventoryDialog,

    closeInventoryDialog,

    productDialogOpen: ui.productDialogOpen,

    selectedProduct: ui.selectedProduct,

    productDetail: productDetail ?? null,

    productDetailLoading,

    openProductDialog,

    closeProductDialog,

    itemDialogOpen: ui.itemDialogOpen,

    setItemDialogOpen: ui.setItemDialogOpen,

    status: ui.status,

    setStatus: ui.setStatus,

    search: ui.search,

    setSearch: ui.setSearch,

    searchOpen: ui.searchOpen,

    setSearchOpen: ui.setSearchOpen,

    selectedRow: ui.selectedRow,

    setSelectedRow: ui.setSelectedRow,

    handleInventoryAdded,

    handleInventoryUpdated,

    handleInventoryDeleted,

    handleItemAdded,

    switchInventory,

    selectedInventoryId: ui.selectedInventoryId,
  };
}
