export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_COUNT = 100;

const ACCEPTED_PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export interface ProductImageFileValidation {
  validFiles: File[];
  errors: string[];
}

export function validateProductImageFiles(
  files: File[],
): ProductImageFileValidation {
  const validFiles: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!ACCEPTED_PRODUCT_IMAGE_TYPES.has(file.type)) {
      errors.push(`${file.name}: use JPG, PNG, GIF, or WebP.`);
      continue;
    }

    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      errors.push(`${file.name}: the maximum file size is 5 MB.`);
      continue;
    }

    validFiles.push(file);
  }

  return { validFiles, errors };
}
