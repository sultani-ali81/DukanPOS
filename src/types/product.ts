export interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  inStock?: boolean;
  category?: string;
  categoryId?: string;
  categories?: ProductCategory[];
  images?: ProductImage[];
  image?: string;
  primaryImage?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface ProductFormSubmitValues extends ProductFormValues {
  attachmentIds?: string[];
}

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
export interface ProductFormValues {
  name: string;
  price: number;
  categoryName: string;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  imageUrlSigned?: string;
}
