export interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  category?: string;
  categoryId?: string;
  categories?: ProductCategory[];
  images?: ProductImage[];
  image?: string;
  inventories?: ProductInventory[];
  totalStock?: number;
  primaryImage?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface ProductInventory {
  id: string;
  name: string;
  quantity: number;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  imageUrlSigned?: string;
}

export interface ProductFormValues {
  name: string;
  price: number;
  categoryName: string;
}

// Partial because edits only send dirty fields — see dirtyFields logic
// in ProductDialog. Create always sends the full set.
export type ProductFormSubmitValues = Partial<ProductFormValues> & {
  attachmentIds?: string[];
};

export interface CreateProductPayload {
  name: string;
  price: number;
  categoryName: string;
  attachmentIds?: string[];
}
export interface UpdateProductPayload {
  name?: string;
  price?: number;
  categoryName?: string;
  attachmentIds?: string[];
}
