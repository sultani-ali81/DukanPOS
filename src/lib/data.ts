export const CURRENCY = "AFN ";

export function formatCurrency(amount: number | null): string {
  if (!amount) amount = 0;
  return `${CURRENCY}${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export type ContactType = "customer" | "supplier";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  type: ContactType;
  address?: string;
  balance: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export type PurchaseStatus = "draft" | "done" | "stocked_in" | "cancelled";

export interface PurchaseLine {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
}

export interface Purchase {
  id: string;
  reference: string;
  supplier: string;
  supplierId: string;
  inventoryId: string;
  date: string;
  lines: PurchaseLine[];
  total: number;
  status: PurchaseStatus;
  stockedIn: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  barcode?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  variants?: ProductVariant[];
}

export interface Inventory {
  id: string;
  name: string;
  location: string;
  productCount: number;
  totalUnits: number;
}

export type JournalEntry = {
  id: string;
  date: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
};

export type StockMovementStatus = "Pending" | "Done";

export interface StockMovement {
  id: string;
  type: "in" | "out";
  reference: string;
  inventoryId: string;
  product: string;
  quantity: number;
  date: string;
  status: StockMovementStatus;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: "Admin" | "Cashier";
  active: boolean;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customer: string;
  date: string;
  items: number;
  total: number;
  profit: number;
}

export const contacts: Contact[] = [
  {
    id: "c1",
    name: "Ahmad Wali",
    phone: "0700 123 456",
    type: "customer",
    balance: 0,
  },
  {
    id: "c2",
    name: "Fatima Karimi",
    phone: "0701 234 567",
    type: "customer",
    balance: 1500,
  },
  {
    id: "c3",
    name: "Gul Ahmad",
    phone: "0702 345 678",
    type: "customer",
    balance: 0,
  },
  {
    id: "c4",
    name: "Zahra Haq",
    phone: "0703 456 789",
    type: "customer",
    balance: 3200,
  },
  {
    id: "sup1",
    name: "Khan Trading Co.",
    phone: "0780 111 222",
    type: "supplier",
    address: "Shahr-e Naw, Kabul",
    balance: 0,
  },
  {
    id: "sup2",
    name: "Balkh Supplies",
    phone: "0781 222 333",
    type: "supplier",
    address: "Mazar-i-Sharif",
    balance: 0,
  },
  {
    id: "sup3",
    name: "Herat Dry Fruits",
    phone: "0782 333 444",
    type: "supplier",
    address: "Herat City",
    balance: 0,
  },
];

export const categories: Category[] = [
  { id: "cat1", name: "Beverages", color: "#3b82f6" },
  { id: "cat2", name: "Snacks", color: "#f59e0b" },
  { id: "cat3", name: "Dairy", color: "#10b981" },
  { id: "cat4", name: "Grains", color: "#8b5cf6" },
  { id: "cat5", name: "Cleaning", color: "#06b6d4" },
  { id: "cat6", name: "Personal Care", color: "#ec4899" },
];

export const products: Product[] = [
  {
    id: "p1",
    name: "Coca-Cola 500ml",
    barcode: "4902102112756",
    categoryId: "cat1",
    purchasePrice: 25,
    sellingPrice: 35,
    stock: 120,
    lowStockThreshold: 20,
    variants: [
      {
        id: "v1a",
        name: "500ml",
        sku: "COCA-500",
        purchasePrice: 25,
        sellingPrice: 35,
        stock: 80,
        barcode: "4902102112756",
      },
      {
        id: "v1b",
        name: "1.5L",
        sku: "COCA-1.5L",
        purchasePrice: 45,
        sellingPrice: 65,
        stock: 40,
        barcode: "4902102112757",
      },
    ],
  },
  {
    id: "p2",
    name: "Lay's Classic Chips",
    barcode: "0028400445569",
    categoryId: "cat2",
    purchasePrice: 40,
    sellingPrice: 55,
    stock: 85,
    lowStockThreshold: 15,
    variants: [
      {
        id: "v2a",
        name: "Small 45g",
        sku: "LAYS-S",
        purchasePrice: 40,
        sellingPrice: 55,
        stock: 50,
        barcode: "0028400445569",
      },
      {
        id: "v2b",
        name: "Large 150g",
        sku: "LAYS-L",
        purchasePrice: 90,
        sellingPrice: 130,
        stock: 35,
        barcode: "0028400445570",
      },
    ],
  },
  {
    id: "p3",
    name: "Fresh Milk 1L",
    barcode: "7613034622884",
    categoryId: "cat3",
    purchasePrice: 80,
    sellingPrice: 110,
    stock: 60,
    lowStockThreshold: 10,
  },
  {
    id: "p4",
    name: "Basmati Rice 5kg",
    barcode: "8901038637617",
    categoryId: "cat4",
    purchasePrice: 600,
    sellingPrice: 750,
    stock: 25,
    lowStockThreshold: 5,
    variants: [
      {
        id: "v4a",
        name: "2kg",
        sku: "RICE-2KG",
        purchasePrice: 250,
        sellingPrice: 320,
        stock: 10,
        barcode: "8901038637618",
      },
      {
        id: "v4b",
        name: "5kg",
        sku: "RICE-5KG",
        purchasePrice: 600,
        sellingPrice: 750,
        stock: 15,
        barcode: "8901038637617",
      },
    ],
  },
  {
    id: "p5",
    name: "Dawn Dish Soap 750ml",
    barcode: "0111120056781",
    categoryId: "cat5",
    purchasePrice: 55,
    sellingPrice: 80,
    stock: 40,
    lowStockThreshold: 10,
  },
  {
    id: "p6",
    name: "Head & Shoulders Shampoo",
    barcode: "037000856536",
    categoryId: "cat6",
    purchasePrice: 120,
    sellingPrice: 170,
    stock: 30,
    lowStockThreshold: 5,
    variants: [
      {
        id: "v6a",
        name: "Classic Clean 200ml",
        sku: "HNS-CL200",
        purchasePrice: 120,
        sellingPrice: 170,
        stock: 15,
        barcode: "037000856536",
      },
      {
        id: "v6b",
        name: "Classic Clean 400ml",
        sku: "HNS-CL400",
        purchasePrice: 200,
        sellingPrice: 280,
        stock: 10,
        barcode: "037000856537",
      },
      {
        id: "v6c",
        name: "Anti Dandruff 200ml",
        sku: "HNS-AD200",
        purchasePrice: 130,
        sellingPrice: 185,
        stock: 5,
        barcode: "037000856538",
      },
    ],
  },
  {
    id: "p7",
    name: "Pepsi 500ml",
    barcode: "4902102112758",
    categoryId: "cat1",
    purchasePrice: 25,
    sellingPrice: 35,
    stock: 95,
    lowStockThreshold: 20,
  },
  {
    id: "p8",
    name: "Oreo Cookies Pack",
    barcode: "044000000561",
    categoryId: "cat2",
    purchasePrice: 30,
    sellingPrice: 45,
    stock: 110,
    lowStockThreshold: 20,
  },
  {
    id: "p9",
    name: "Yogurt Cup 200g",
    barcode: "8076809513753",
    categoryId: "cat3",
    purchasePrice: 35,
    sellingPrice: 50,
    stock: 8,
    lowStockThreshold: 15,
  },
  {
    id: "p10",
    name: "Wheat Flour 10kg",
    barcode: "8901038637620",
    categoryId: "cat4",
    purchasePrice: 400,
    sellingPrice: 520,
    stock: 12,
    lowStockThreshold: 5,
  },
];

export const inventories: Inventory[] = [
  {
    id: "inv1",
    name: "Main Warehouse",
    location: "Kabul",
    productCount: 10,
    totalUnits: 570,
  },
  {
    id: "inv2",
    name: "Branch Store",
    location: "Mazar-i-Sharif",
    productCount: 6,
    totalUnits: 220,
  },
];

export const stockMovements: StockMovement[] = [
  {
    id: "sm1",
    type: "in",
    reference: "PO-2024-001",
    inventoryId: "inv1",
    product: "Coca-Cola 500ml",
    quantity: 50,
    date: "2024-01-10",
    status: "Done",
  },
  {
    id: "sm2",
    type: "in",
    reference: "PO-2024-002",
    inventoryId: "inv1",
    product: "Basmati Rice 5kg",
    quantity: 20,
    date: "2024-01-12",
    status: "Pending",
  },
  {
    id: "sm3",
    type: "out",
    reference: "INV-001",
    inventoryId: "inv1",
    product: "Coca-Cola 500ml",
    quantity: 10,
    date: "2024-01-13",
    status: "Done",
  },
  {
    id: "sm4",
    type: "in",
    reference: "PO-2024-003",
    inventoryId: "inv2",
    product: "Fresh Milk 1L",
    quantity: 30,
    date: "2024-01-14",
    status: "Done",
  },
  {
    id: "sm5",
    type: "out",
    reference: "INV-002",
    inventoryId: "inv2",
    product: "Yogurt Cup 200g",
    quantity: 5,
    date: "2024-01-15",
    status: "Done",
  },
];

export const users: User[] = [
  {
    id: "u1",
    name: "Sayed Jamal",
    phone: "0780 555 111",
    role: "Admin",
    active: true,
  },
  {
    id: "u2",
    name: "Mariam Karimi",
    phone: "0780 555 222",
    role: "Cashier",
    active: true,
  },
  {
    id: "u3",
    name: "Rahim Faqiri",
    phone: "0780 555 333",
    role: "Cashier",
    active: true,
  },
  {
    id: "u4",
    name: "Nadia Hakimi",
    phone: "0780 555 444",
    role: "Cashier",
    active: false,
  },
];

export const journalEntries: JournalEntry[] = [
  {
    id: "j1",
    date: "Today",
    account: "Cash",
    description: "Daily sales deposit",
    debit: 2960,
    credit: 0,
  },
  {
    id: "j2",
    date: "Today",
    account: "Sales Revenue",
    description: "Daily sales deposit",
    debit: 0,
    credit: 2960,
  },
  {
    id: "j3",
    date: "Yesterday",
    account: "Inventory",
    description: "Purchase from Herat Foods",
    debit: 3200,
    credit: 0,
  },
  {
    id: "j4",
    date: "Yesterday",
    account: "Accounts Payable",
    description: "Purchase from Herat Foods",
    debit: 0,
    credit: 3200,
  },
  {
    id: "j5",
    date: "2 days ago",
    account: "Rent Expense",
    description: "Monthly shop rent",
    debit: 5000,
    credit: 0,
  },
  {
    id: "j6",
    date: "2 days ago",
    account: "Cash",
    description: "Monthly shop rent",
    debit: 0,
    credit: 5000,
  },
];

export const sales: Sale[] = [
  {
    id: "s1",
    invoiceNo: "INV-001",
    customer: "Ahmad Wali",
    date: "2024-01-13",
    items: 5,
    total: 1750,
    profit: 350,
  },
  {
    id: "s2",
    invoiceNo: "INV-002",
    customer: "Walk-in",
    date: "2024-01-14",
    items: 3,
    total: 890,
    profit: 178,
  },
  {
    id: "s3",
    invoiceNo: "INV-003",
    customer: "Fatima Karimi",
    date: "2024-01-14",
    items: 8,
    total: 2340,
    profit: 468,
  },
  {
    id: "s4",
    invoiceNo: "INV-004",
    customer: "Walk-in",
    date: "2024-01-15",
    items: 2,
    total: 620,
    profit: 124,
  },
  {
    id: "s5",
    invoiceNo: "INV-005",
    customer: "Zahra Haq",
    date: "2024-01-15",
    items: 6,
    total: 1580,
    profit: 316,
  },
  {
    id: "s6",
    invoiceNo: "INV-006",
    customer: "Walk-in",
    date: "2024-01-16",
    items: 4,
    total: 920,
    profit: 184,
  },
];

export const salesTrend = [
  { day: "Mon", sales: 1200 },
  { day: "Tue", sales: 1900 },
  { day: "Wed", sales: 1500 },
  { day: "Thu", sales: 2100 },
  { day: "Fri", sales: 2800 },
  { day: "Sat", sales: 3200 },
  { day: "Sun", sales: 2400 },
];

export const purchases: Purchase[] = [
  {
    id: "pur1",
    reference: "PO-2024-001",
    supplier: "Khan Trading Co.",
    supplierId: "sup1",
    inventoryId: "inv1",
    date: "2024-01-10",
    lines: [
      {
        productId: "p1",
        productName: "Coca-Cola 500ml",
        variantId: "v1a",
        variantName: "500ml",
        quantity: 100,
        price: 25,
      },
      { productId: "p7", productName: "Pepsi 500ml", quantity: 100, price: 25 },
    ],
    total: 5000,
    status: "stocked_in",
    stockedIn: true,
  },
  {
    id: "pur2",
    reference: "PO-2024-002",
    supplier: "Balkh Supplies",
    supplierId: "sup2",
    inventoryId: "inv1",
    date: "2024-01-12",
    lines: [
      {
        productId: "p4",
        productName: "Basmati Rice 5kg",
        variantId: "v4b",
        variantName: "5kg",
        quantity: 20,
        price: 600,
      },
      {
        productId: "p10",
        productName: "Wheat Flour 10kg",
        quantity: 15,
        price: 400,
      },
    ],
    total: 18000,
    status: "done",
    stockedIn: false,
  },
  {
    id: "pur3",
    reference: "PO-2024-003",
    supplier: "Herat Dry Fruits",
    supplierId: "sup3",
    inventoryId: "inv2",
    date: "2024-01-14",
    lines: [
      {
        productId: "p3",
        productName: "Fresh Milk 1L",
        quantity: 50,
        price: 80,
      },
      {
        productId: "p9",
        productName: "Yogurt Cup 200g",
        quantity: 30,
        price: 35,
      },
    ],
    total: 5050,
    status: "draft",
    stockedIn: false,
  },
  {
    id: "pur4",
    reference: "PO-2024-004",
    supplier: "Khan Trading Co.",
    supplierId: "sup1",
    inventoryId: "inv1",
    date: "2024-01-15",
    lines: [
      {
        productId: "p2",
        productName: "Lay's Classic Chips",
        variantId: "v2a",
        variantName: "Small 45g",
        quantity: 50,
        price: 40,
      },
    ],
    total: 2000,
    status: "cancelled",
    stockedIn: false,
  },
];

export interface ProductInventoryStock {
  inventoryId: string;
  inventoryName: string;
  location: string;
  stock: number;
}

export function getProductTotalStock(product: Product): number {
  return product.variants
    ? product.variants.reduce((s, v) => s + v.stock, 0)
    : product.stock;
}

export function getProductInventoryStock(
  product: Product,
): ProductInventoryStock[] {
  const total = getProductTotalStock(product);
  // Deterministic split across our inventories (≈65% main warehouse).
  const mainShare = Math.round(total * 0.65);
  const branchShare = total - mainShare;
  return inventories.map((inv, idx) => ({
    inventoryId: inv.id,
    inventoryName: inv.name,
    location: inv.location,
    stock: idx === 0 ? mainShare : branchShare,
  }));
}

export interface ProductSale {
  id: string;
  invoiceNo: string;
  customer: string;
  date: string;
  quantity: number;
  total: number;
}

export function getProductRecentSales(product: Product): ProductSale[] {
  const customers = [
    "Ahmad Wali",
    "Walk-in",
    "Fatima Karimi",
    "Zahra Haq",
    "Gul Ahmad",
  ];
  const dates = ["2024-01-16", "2024-01-15", "2024-01-14", "2024-01-13"];
  const seed = product.id.charCodeAt(product.id.length - 1);
  return dates.map((date, i) => {
    const quantity = ((seed + i * 3) % 5) + 1;
    return {
      id: `${product.id}-sale-${i}`,
      invoiceNo: `INV-${String(100 + ((seed * 7 + i * 11) % 90)).padStart(3, "0")}`,
      customer: customers[(seed + i) % customers.length],
      date,
      quantity,
      total: quantity * product.sellingPrice,
    };
  });
}

export function getCategoryName(categoryId: string): string {
  return categories.find((c) => c.id === categoryId)?.name ?? "Unknown";
}

export function getInventoryName(inventoryId: string): string {
  return inventories.find((i) => i.id === inventoryId)?.name ?? "Unknown";
}

export function getContactName(contactId: string): string {
  return contacts.find((c) => c.id === contactId)?.name ?? "Unknown";
}
