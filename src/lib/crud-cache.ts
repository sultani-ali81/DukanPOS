export type CrudFamily =
  | "categories"
  | "customers"
  | "inventories"
  | "products"
  | "users"
  | "purchases";

export function createCrudFamilyMatcher(family: CrudFamily, id?: string) {
  return (key: unknown): boolean => {
    if (family === "categories") {
      return Array.isArray(key) && key[0] === "categories";
    }

    if (family === "customers") {
      return (
        (typeof key === "string" && key.startsWith("/customer?")) ||
        (Array.isArray(key) && key[0] === "pos-walk-in-customer")
      );
    }

    if (family === "inventories") {
      return (
        (Array.isArray(key) && key[0] === "inventories") ||
        (!!id &&
          Array.isArray(key) &&
          (key[0] === "inventory-detail" || key[0] === "pos-inventory") &&
          key[1] === id)
      );
    }

    if (family === "products") {
      return (
        (typeof key === "string" && key.startsWith("/products?")) ||
        (Array.isArray(key) && key[0] === "products") ||
        (!!id &&
          Array.isArray(key) &&
          key[0] === "product-detail" &&
          key[1] === id)
      );
    }

    if (family === "users") {
      return typeof key === "string" && key.startsWith("/employees?");
    }

    return (
      (typeof key === "string" && key.startsWith("/purchase?")) ||
      (!!id &&
        Array.isArray(key) &&
        key[0] === "purchase-detail" &&
        key[1] === id)
    );
  };
}
