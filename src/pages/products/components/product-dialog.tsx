"use client";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DialogContent as DialogContentRoot,
  DialogHeader as DialogHeaderRoot,
  Dialog as DialogRoot,
  DialogTitle as DialogTitleRoot,
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

import { cn } from "@/lib/utils";

import { createCategory } from "@/queries/category";

import { deleteProductImage, uploadProductImages } from "@/queries/products";

import type {
  Product,
  ProductFormSubmitValues,
  ProductFormValues,
  ProductImage,
} from "@/types/product";

import { AlertCircle, Loader2, Plus, UploadCloud, X } from "lucide-react";

import { useEffect, useRef, useState, type DragEvent } from "react";

import { Controller, useForm } from "react-hook-form";

import { toast } from "sonner";

interface ProductDialogProps {
  open: boolean;

  editingProduct?: Product | null;

  categories: { id: string; name: string }[];

  onOpenChange: (open: boolean) => void;

  onSubmit: (values: ProductFormSubmitValues, id?: string) => Promise<void>;

  onCategoryCreated?: (category: { id: string; name: string }) => void;
}

// ─── Inline Add Category Dialog ────────────────────────────────────────────────

function AddCategoryDialog({
  open,

  onOpenChange,

  onCreated,
}: {
  open: boolean;

  onOpenChange: (open: boolean) => void;

  onCreated: (category: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setLoading(true);

    setError("");

    try {
      const res = await createCategory({ name: name.trim() });

      onCreated({ id: res.id, name: name.trim() });

      setName("");

      onOpenChange(false);

      toast.success("Category created");
    } catch {
      setError("Could not create category. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContentRoot>
        <form onSubmit={handleSubmit}>
          <DialogHeaderRoot>
            <DialogTitleRoot>Add Category</DialogTitleRoot>
          </DialogHeaderRoot>

          <div className="space-y-3 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-cat-name">Category Name</Label>

              <Input
                id="new-cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Beverages"
                autoFocus
              />

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContentRoot>
    </DialogRoot>
  );
}

// ─── Product Dialog ────────────────────────────────────────────────────────────

export function ProductDialog({
  open,

  editingProduct,

  categories,

  onOpenChange,

  onSubmit,

  onCategoryCreated,
}: ProductDialogProps) {
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

  const [isDragging, setIsDragging] = useState(false);

  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);

  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);

  // Reset form + image state every time the dialog opens.

  useEffect(() => {
    if (!open) return;

    reset({
      name: editingProduct?.name ?? "",

      price: editingProduct?.price ?? 0,

      categoryName: editingProduct?.category ?? "",
    });

    setExistingImages(editingProduct?.images ?? []);

    setUploadingImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl));

      return [];
    });
  }, [open, editingProduct, reset]);

  function addFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );

    if (!imageFiles.length) return;

    const entries = imageFiles.map((file) => ({
      key: crypto.randomUUID(),

      previewUrl: URL.createObjectURL(file),
    }));

    setUploadingImages((prev) => [
      ...prev,

      ...entries.map((e) => ({
        key: e.key,

        previewUrl: e.previewUrl,

        status: "uploading" as const,
      })),
    ]);

    uploadProductImages(imageFiles)
      .then(({ ids }) => {
        setUploadingImages((prev) =>
          prev.map((img) => {
            const idx = entries.findIndex((e) => e.key === img.key);

            return idx !== -1
              ? { ...img, id: ids[idx], status: "done" as const }
              : img;
          }),
        );
      })

      .catch(() => {
        setUploadingImages((prev) =>
          prev.map((img) =>
            entries.some((e) => e.key === img.key)
              ? { ...img, status: "error" as const }
              : img,
          ),
        );

        toast.error("Image upload failed", {
          description:
            imageFiles.length > 1
              ? `${imageFiles.length} images could not be uploaded.`
              : imageFiles[0].name,
        });
      });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();

    setIsDragging(false);

    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function removeExistingImage(image: ProductImage) {
    setExistingImages((prev) => prev.filter((img) => img.id !== image.id));

    deleteProductImage(image.id).catch(() => {
      toast.error("Could not remove image", {
        description: "Please try again.",
      });

      setExistingImages((prev) => [...prev, image]);
    });
  }

  function removeUploadingImage(key: string) {
    setUploadingImages((prev) => {
      const target = prev.find((img) => img.key === key);

      if (target) URL.revokeObjectURL(target.previewUrl);

      return prev.filter((img) => img.key !== key);
    });
  }

  const hasUploading = uploadingImages.some(
    (img) => img.status === "uploading",
  );

  async function submit(values: ProductFormValues) {
    if (hasUploading) {
      toast.error("Please wait for images to finish uploading");

      return;
    }

    const attachmentIds = uploadingImages

      .filter((img) => img.status === "done" && img.id)

      .map((img) => img.id as string);

    let payload: ProductFormSubmitValues;

    if (isEdit) {
      const originalImageIds =
        editingProduct?.images?.map((img) => img.id) ?? [];

      const imagesChanged =
        attachmentIds.length !== originalImageIds.length ||
        !attachmentIds.every((id) => originalImageIds.includes(id));

      payload = {};

      if (dirtyFields.name) payload.name = values.name;

      if (dirtyFields.price) payload.price = values.price;

      if (dirtyFields.categoryName) payload.categoryName = values.categoryName;

      if (imagesChanged) payload.attachmentIds = attachmentIds;

      if (Object.keys(payload).length === 0) {
        onOpenChange(false);

        return;
      }
    } else {
      payload = { ...values };

      if (attachmentIds.length) payload.attachmentIds = attachmentIds;
    }

    await onSubmit(payload, editingProduct?.id);

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        onPointerDownOutside={(e) => {
          if (
            (e.target as HTMLElement | null)?.closest(
              '[data-slot="select-content"]',
            )
          ) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          if (
            (e.target as HTMLElement | null)?.closest(
              '[data-slot="select-content"]',
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <form onSubmit={handleSubmit(submit)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>

            <DialogDescription>
              {isEdit
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
                <Label htmlFor="p-category">
                  Category <span className="text-destructive">*</span>
                </Label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="p-category" className="w-full">
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

            <div className="grid gap-2">
              <Label>Product Images</Label>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();

                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",

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
                  PNG or JPG, multiple images allowed
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files);

                    e.target.value = "";
                  }}
                />
              </div>

              {(existingImages.length > 0 || uploadingImages.length > 0) && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border"
                    >
                      <img
                        src={img.imageUrlSigned ?? img.imageUrl}
                        alt="Product"
                        className="size-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeExistingImage(img)}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}

                  {uploadingImages.map((img) => (
                    <div
                      key={img.key}
                      className="group relative aspect-square overflow-hidden rounded-lg border"
                    >
                      <img
                        src={img.previewUrl}
                        alt="Uploading"
                        className="size-full object-cover"
                      />

                      {img.status === "uploading" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Loader2 className="size-4 animate-spin text-white" />
                        </div>
                      )}

                      {img.status === "error" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/60">
                          <AlertCircle className="size-4 text-white" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeUploadingImage(img.key)}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remove image"
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting || hasUploading}>
              {(isSubmitting || hasUploading) && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {isEdit ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AddCategoryDialog
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
        onCreated={(category) => {
          setLocalCategories((prev) => [...prev, category]);

          setValue("categoryName", category.name);

          onCategoryCreated?.(category);
        }}
      />
    </Dialog>
  );
}

interface UploadingImage {
  key: string;

  previewUrl: string;

  id?: string;

  status: "uploading" | "done" | "error";
}
