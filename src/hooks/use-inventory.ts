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
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

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

export function useInventory(): UseInventoryReturn {
  // ── List state ────────────────────────────────────────────────────────────
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    currentPage: 1,
    itemsPerPage: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedInventoryId = searchParams.get("id");

  const [selectedInventory, setSelectedInventory] =
    useState<InventoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const { page, setPage, resetToPage1, goToPage } = usePagination({
    initialPage: 1,
    initialItemsPerPage: ITEMS_PER_PAGE,
  });

  const {
    search: listSearch,
    debouncedSearch: listSearchDebounced,
    handleSearch: setListSearch,
    clearSearch: clearListSearch,
  } = useSearch({ debounceMs: 400, onSearch: resetToPage1 });
  const [listSearchOpen, setListSearchOpen] = useState(false);

  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [inventoryDialogTarget, setInventoryDialogTarget] =
    useState<Inventory | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<InventoryProduct | null>(null);
  const [productDetail, setProductDetail] = useState<Product | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  const listSearchDebouncedRef = useRef(listSearchDebounced);
  useEffect(() => {
    listSearchDebouncedRef.current = listSearchDebounced;
  }, [listSearchDebounced]);

  const fetchInventories = (opts?: { page?: number }) => {
    setLoading(true);
    setError(null);

    const targetPage = opts?.page ?? page;

    getInventories({
      page: targetPage,
      itemsPerPage: ITEMS_PER_PAGE,
      search: listSearchDebouncedRef.current || undefined,
    })
      .then(({ data, meta }) => {
        setInventories(data);
        setPaginationMeta(meta);
      })
      .catch(
        (err: {
          response?: { data?: { message?: string } };
          message?: string;
        }) => {
          setError(
            err?.response?.data?.message ??
              err.message ??
              "Failed to load inventories",
          );
        },
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInventories({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, listSearchDebounced]);

  const fetchInventoryDetail = (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedInventory(null);

    getInventory(id)
      .then((detail) => {
        setSelectedInventory(detail);
      })
      .catch(
        (err: {
          response?: { data?: { message?: string } };
          message?: string;
        }) => {
          setDetailError(
            err?.response?.data?.message ??
              err.message ??
              "Failed to load inventory detail",
          );
        },
      )
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    if (selectedInventoryId) {
      fetchInventoryDetail(selectedInventoryId);
    }
  }, []);

  const openAddInventoryDialog = () => {
    setInventoryDialogTarget(null);
    setInventoryDialogOpen(true);
  };

  const openEditInventoryDialog = (inv: Inventory) => {
    setInventoryDialogTarget(inv);
    setInventoryDialogOpen(true);
  };

  const closeInventoryDialog = () => {
    setInventoryDialogOpen(false);
    setInventoryDialogTarget(null);
  };

  const openProductDialog = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setProductDialogOpen(true);
    setProductDetail(null);
    setProductDetailLoading(true);

    getProductById(product.id)
      .then((detail: Product | void) => {
        setProductDetail(detail?.id ? detail : null);
      })
      .catch((err) => {
        console.error("Failed to load product details:", err);
      })
      .finally(() => {
        setProductDetailLoading(false);
      });
  };

  const closeProductDialog = () => {
    setProductDialogOpen(false);
    setSelectedProduct(null);
    setProductDetail(null);
  };

  const handleInventoryAdded = () => {
    closeInventoryDialog();
    fetchInventories();
  };

  const handleInventoryUpdated = (id: string) => {
    closeInventoryDialog();
    fetchInventories();
    fetchInventoryDetail(id);
  };

  const handleInventoryDeleted = () => {
    closeInventoryDialog();
    setPage(1);
    fetchInventories({ page: 1 });
    switchInventory(null);
  };

  const handleItemAdded = () => {
    setItemDialogOpen(false);
    if (selectedInventoryId !== null) {
      fetchInventoryDetail(selectedInventoryId);
    }
  };

  const switchInventory = (id: string | null) => {
    if (id === null) {
      setSearchParams({});
    } else {
      setSearchParams({ id });
    }
    setStatus("all");
    setSearch("");
    setSelectedRow(null);

    if (id !== null) {
      fetchInventoryDetail(id);
    } else {
      setSelectedInventory(null);
      setDetailError(null);
    }
  };

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
        status === "all" ||
        (status === "In Stock" && product.quantity > 10) ||
        (status === "Low Stock" &&
          product.quantity > 0 &&
          product.quantity <= 10) ||
        (status === "Out of Stock" && product.quantity === 0);

      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.id.toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [selectedInventory, status, search]);

  return {
    inventories,
    paginationMeta,
    loading,
    error,

    selectedInventory,
    detailLoading,
    detailError,
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
    listSearchOpen,
    setListSearchOpen,

    inventoryDialogOpen,
    inventoryDialogTarget,
    openAddInventoryDialog,
    openEditInventoryDialog,
    closeInventoryDialog,

    productDialogOpen,
    selectedProduct,
    productDetail,
    productDetailLoading,
    openProductDialog,
    closeProductDialog,

    itemDialogOpen,
    setItemDialogOpen,

    status,
    setStatus,
    search,
    setSearch,
    searchOpen,
    setSearchOpen,
    selectedRow,
    setSelectedRow,

    handleInventoryAdded,
    handleInventoryUpdated,
    handleInventoryDeleted,
    handleItemAdded,
    switchInventory,

    selectedInventoryId,
  };
}
