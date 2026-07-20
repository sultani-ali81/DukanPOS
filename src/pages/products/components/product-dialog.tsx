import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import { extractError } from "@/lib/error";
import {
  MAX_PRODUCT_IMAGE_COUNT,
  validateProductImageFiles,
} from "@/lib/product-image-files";
import { saveProductWithImages } from "@/lib/product-image-workflow";
import { cn } from "@/lib/utils";
import {
  deleteProductImage,
  getProductById,
  uploadProductImage,
  uploadProductImages,
} from "@/queries/products";
import type {
  Product,
  ProductFormSubmitValues,
  ProductFormValues,
  ProductImage,
} from "@/types/product";
import {
  AlertCircle,
  ImageOff,
  Loader2,
  Plus,
  RotateCcw,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

import { CategoryDialog } from "@/pages/categories/components/category-dialog";
import { ProductBarcode } from "@/pages/products/components/product-barcode";
// ^ adjust this path to match where category-dialog.tsx actually lives in your project

interface ProductDialogProps {
  open: boolean;
  editingProduct?: Product | null;
  categories: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    values: ProductFormSubmitValues,
    id?: string,
  ) => Promise<{ id?: string } | void>;
  onSaved?: (product?: Product) => Promise<void> | void;
  onCategoryCreated?: (category: { id: string; name: string }) => void;
}

// ─── Product Dialog ────────────────────────────────────────────────────────────

export function ProductDialog({
  open,
  editingProduct,
  categories,
  onOpenChange,
  onSubmit,
  onSaved,
  onCategoryCreated,
}: ProductDialogProps) {
  const { mutate: mutateCache } = useSWRConfig();
  const isEdit = !!editingProduct;

  const [localCategories, setLocalCategories] = useState<
    { id: string; name: string }[]
  >([]);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const allCategories = [...categories, ...localCategories];

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ProductFormValues>({
    defaultValues: { name: "", price: 0, categoryName: "" },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const localImagesRef = useRef<LocalProductImage[]>([]);
  const failedSignedUrlsRef = useRef(new Set<string>());
  const savingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [localImages, setLocalImages] = useState<LocalProductImage[]>([]);
  const [deletedExistingImageIds, setDeletedExistingImageIds] = useState<
    Set<string>
  >(new Set());
  const [imageError, setImageError] = useState("");

  function updateLocalImages(
    updater: (current: LocalProductImage[]) => LocalProductImage[],
  ) {
    setLocalImages((current) => {
      const next = updater(current);
      localImagesRef.current = next;
      return next;
    });
  }

  function clearLocalImages() {
    updateLocalImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  }

  // Reset form + image state every time the dialog opens.
  /* eslint-disable react-hooks/set-state-in-effect -- opening the dialog starts a new editing session from server state */
  useEffect(() => {
    if (!open) return;

    reset({
      name: editingProduct?.name ?? "",
      price: editingProduct?.price ?? 0,
      categoryName: editingProduct?.category ?? "",
    });

    setExistingImages(editingProduct?.images ?? []);
    setDeletedExistingImageIds(new Set());
    setImageError("");
    failedSignedUrlsRef.current.clear();
    clearLocalImages();
    // Product data is intentionally snapshotted when this dialog opens. Cache
    // revalidation while saving must not discard selected local files.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingProduct?.id, reset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(
    () => () => {
      localImagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl),
      );
    },
    [],
  );

  function addFiles(files: FileList | File[]) {
    const selectedFiles = Array.from(files);
    const validation = validateProductImageFiles(selectedFiles);
    const exceedsUploadLimit =
      localImages.length + selectedFiles.length > MAX_PRODUCT_IMAGE_COUNT;

    if (validation.errors.length > 0 || exceedsUploadLimit) {
      const errors = [...validation.errors];
      if (exceedsUploadLimit) {
        errors.push("You can upload at most 100 new images at once.");
      }
      const message = errors.join(" ");
      setImageError(message);
      toast.error("Invalid product image", { description: message });
      return;
    }

    if (!validation.validFiles.length) return;

    const entries = validation.validFiles.map((file) => ({
      key: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImageError("");
    updateLocalImages((current) => [...current, ...entries]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function toggleExistingImageRemoval(imageId: string) {
    setDeletedExistingImageIds((current) => {
      const next = new Set(current);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  }

  function removeLocalImage(key: string) {
    updateLocalImages((current) => {
      const target = current.find((img) => img.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((img) => img.key !== key);
    });
  }

  async function refreshExpiredSignedUrl(url: string) {
    if (!editingProduct || failedSignedUrlsRef.current.has(url)) return;
    failedSignedUrlsRef.current.add(url);
    try {
      const refreshed = await getProductById(editingProduct.id);
      if (refreshed) setExistingImages(refreshed.images ?? []);
      await mutateCache(
        createCrudFamilyMatcher("products", editingProduct.id),
      );
    } catch {
      // The save flow will surface API errors; a broken preview stays visible.
    }
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && isSubmitting) return;
    if (!nextOpen) {
      clearLocalImages();
      setDeletedExistingImageIds(new Set());
      setImageError("");
    }
    onOpenChange(nextOpen);
  }

  async function submit(values: ProductFormValues) {
    setImageError("");
    const payload: ProductFormSubmitValues = {};

    if (isEdit) {
      if (dirtyFields.name) payload.name = values.name;
      if (dirtyFields.price) payload.price = values.price;
      if (dirtyFields.categoryName) payload.categoryName = values.categoryName;

      if (
        Object.keys(payload).length === 0 &&
        localImages.length === 0 &&
        deletedExistingImageIds.size === 0
      ) {
        handleDialogOpenChange(false);
        return;
      }
    } else {
      Object.assign(payload, values);
    }

    try {
      const result = await saveProductWithImages(
        {
          productId: editingProduct?.id,
          values: payload,
          newFiles: localImages.map((image) => image.file),
          deletedImageIds: Array.from(deletedExistingImageIds),
          submitProduct: onSubmit,
        },
        {
          uploadSingle: uploadProductImage,
          uploadMany: uploadProductImages,
          deleteImage: deleteProductImage,
          getProduct: getProductById,
          invalidateProduct: (productId) =>
            mutateCache(createCrudFamilyMatcher("products", productId)),
          onRecoveryProduct: (recoveredProduct) => {
            if (!recoveredProduct) return;
            setExistingImages(recoveredProduct.images ?? []);

            const recoveredImageCount = recoveredProduct.images?.length ?? 0;
            const uploadedImagesAppearClaimed =
              localImages.length > 0 &&
              recoveredImageCount >= existingImages.length + localImages.length;

            if (uploadedImagesAppearClaimed) {
              clearLocalImages();
              reset({
                name: recoveredProduct.name,
                price: recoveredProduct.price,
                categoryName: recoveredProduct.category ?? "",
              });
            }
          },
        },
      );

      clearLocalImages();

      if (result.product) {
        setExistingImages(result.product.images ?? []);
        reset({
          name: result.product.name,
          price: result.product.price,
          categoryName: result.product.category ?? "",
        });
      }

      await onSaved?.(result.product);

      if (result.failedDeletionIds.length > 0) {
        const remainingIds = new Set(
          (result.product?.images ?? existingImages).map((image) => image.id),
        );
        setDeletedExistingImageIds(
          new Set(
            result.failedDeletionIds.filter((imageId) =>
              remainingIds.has(imageId),
            ),
          ),
        );
        const message = extractError(
          result.deletionErrors[0],
          "Some images could not be deleted. Review them and try again.",
        );
        setImageError(message);
        toast.error("Product saved, but image deletion failed", {
          description: message,
        });
        return;
      }

      toast.success(isEdit ? "Product updated" : "Product created", {
        description: isEdit
          ? `"${result.product?.name ?? values.name}" has been updated.`
          : `"${values.name}" has been added to the catalog.`,
      });
      handleDialogOpenChange(false);
    } catch (error: unknown) {
      const message = extractError(error, "Could not save the product.");
      setImageError(message);
      toast.error("Could not save product", { description: message });
    }
  }

  async function handleProductFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (savingRef.current) {
      event.preventDefault();
      return;
    }

    savingRef.current = true;
    try {
      await handleSubmit(submit)(event);
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange} modal={false}>
      {/*
        Manual backdrop: ProductDialog runs modal={false} so that a nested
        modal dialog (CategoryDialog) can open on top without the two
        competing focus traps fighting each other and force-closing this one.
        Giving up modal also means Radix won't render its own DialogOverlay
        here, so we render an equivalent blurred backdrop ourselves.
      */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      )}

      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (
            target?.closest('[data-slot="select-content"]') ||
            target?.closest('[role="dialog"]')
          ) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (
            target?.closest('[data-slot="select-content"]') ||
            target?.closest('[role="dialog"]')
          ) {
            e.preventDefault();
          }
        }}
      >
        <form onSubmit={handleProductFormSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct
                ? `Update details for "${editingProduct.name}".`
                : "Enter the product details to add it to your catalog."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="p-name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-name"
                placeholder="e.g. Basmati Rice 5kg"
                disabled={isSubmitting}
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setAddCategoryOpen(true)}
                >
                  <Plus className="size-3" />
                  Add
                </Button>
              </div>

              <Controller
                control={control}
                name="categoryName"
                rules={{ required: "Category is required" }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger aria-label="Category" className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              {errors.categoryName && (
                <p className="text-xs text-destructive">
                  {errors.categoryName.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="p-price">
                Selling Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-price"
                type="number"
                placeholder="0"
                min="0"
                disabled={isSubmitting}
                {...register("price", {
                  required: "Price is required",
                  valueAsNumber: true,
                  min: { value: 0, message: "Price must be 0 or more" },
                })}
              />
              {errors.price && (
                <p className="text-xs text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>

            {isEdit && (
              <ProductBarcode
                productCode={editingProduct.productCode}
                productName={editingProduct.name}
              />
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Product Images</Label>
                {existingImages.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => {
                      if (
                        deletedExistingImageIds.size === existingImages.length
                      ) {
                        setDeletedExistingImageIds(new Set());
                      } else {
                        setDeletedExistingImageIds(
                          new Set(existingImages.map((image) => image.id)),
                        );
                      }
                    }}
                  >
                    {deletedExistingImageIds.size === existingImages.length
                      ? "Keep all"
                      : "Remove all"}
                  </Button>
                )}
              </div>

              <div
                onClick={() => {
                  if (!isSubmitting) fileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
                  isSubmitting && "pointer-events-none opacity-60",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50 hover:bg-muted/50",
                )}
              >
                <UploadCloud className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-muted-foreground/70">
                  JPG, PNG, GIF, or WebP · 5 MB maximum per image
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  disabled={isSubmitting}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {imageError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              {(existingImages.length > 0 || localImages.length > 0) && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {existingImages.map((img) => {
                    const markedForDeletion = deletedExistingImageIds.has(
                      img.id,
                    );
                    return (
                      <div
                        key={img.id}
                        className={cn(
                          "group relative aspect-square overflow-hidden rounded-lg border",
                          markedForDeletion && "border-destructive/50",
                        )}
                      >
                        {img.imageUrlSigned ? (
                          <img
                            src={img.imageUrlSigned}
                            alt="Product"
                            onError={() =>
                              void refreshExpiredSignedUrl(img.imageUrlSigned!)
                            }
                            className={cn(
                              "size-full object-cover",
                              markedForDeletion && "opacity-30 grayscale",
                            )}
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                            <ImageOff className="size-5" />
                          </div>
                        )}
                        {markedForDeletion && (
                          <div className="pointer-events-none absolute inset-x-1 bottom-1 rounded bg-destructive/90 px-1 py-0.5 text-center text-[10px] font-medium text-white">
                            Will remove
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => toggleExistingImageRemoval(img.id)}
                          className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/65 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label={
                            markedForDeletion
                              ? "Keep existing image"
                              : "Remove existing image"
                          }
                        >
                          {markedForDeletion ? (
                            <RotateCcw className="size-3" />
                          ) : (
                            <X className="size-3" />
                          )}
                        </button>
                      </div>
                    );
                  })}

                  {localImages.map((img) => (
                    <div
                      key={img.key}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-primary/40"
                    >
                      <img
                        src={img.previewUrl}
                        alt={`New upload: ${img.file.name}`}
                        className="size-full object-cover"
                      />
                      <div className="pointer-events-none absolute bottom-1 left-1 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        New
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => removeLocalImage(img.key)}
                        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/65 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={`Remove new image ${img.file.name}`}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleDialogOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <CategoryDialog
        open={addCategoryOpen}
        editingCategory={null}
        onOpenChange={setAddCategoryOpen}
        onSubmit={async (values) => {
          const { createCategory } = await import("@/queries/category");
          const res = await createCategory(values);
          await mutateCache(createCrudFamilyMatcher("categories", res.id));
          return { id: res.id, name: values.name };
        }}
        onCreated={(category) => {
          setLocalCategories((prev) => [...prev, category]);
          setValue("categoryName", category.name);
          onCategoryCreated?.(category);
        }}
      />
    </Dialog>
  );
}

interface LocalProductImage {
  key: string;
  file: File;
  previewUrl: string;
}
