export interface JournalAccount {
  id: string;
  name: string;
  type: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface JournalPurchaseProduct {
  id: string;
  name: string;
  scannerId: string | null;
  price: number;
  store: string;
}

export interface JournalPurchaseItem {
  id: string;
  purchase: string;
  product: JournalPurchaseProduct;
  quantity: number;
  received: number | null;
  unitPrice: number;
  createdAt: string;
}

export interface JournalPurchase {
  id: string;
  sequence: string;
  customer: string;
  store: string;
  customDate: string;
  status: string;
  createdAt?: string;
  updatedAt?: string | null;
  items?: JournalPurchaseItem[];
}

export interface JournalItem {
  id: string;
  journalEntry: string;
  purchase: JournalPurchase;
  account: JournalAccount;
  credit: number | null;
  debit: number | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface JournalSequence {
  id: string;
  entity: string;
  prefix: string;
  lastIndex: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface JournalEntry {
  id: string;
  sequence: JournalSequence;
  status: string;
  createdAt?: string;
  updatedAt?: string | null;
  items: JournalItem[];
  totalCurrBill?: number;
}
