export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: { id: string; url: string }[];
  category?: string;
  categoryId?: string;
  inStock?: boolean;
}
