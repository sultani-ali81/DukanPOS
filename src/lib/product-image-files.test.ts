import { describe, expect, it } from "vitest";
import {
  MAX_PRODUCT_IMAGE_SIZE,
  validateProductImageFiles,
} from "@/lib/product-image-files";

function imageFile(name: string, type: string, size = 10) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateProductImageFiles", () => {
  it.each([
    ["photo.jpg", "image/jpeg"],
    ["photo.png", "image/png"],
    ["photo.gif", "image/gif"],
    ["photo.webp", "image/webp"],
  ])("accepts %s", (name, type) => {
    const file = imageFile(name, type);
    expect(validateProductImageFiles([file])).toEqual({
      validFiles: [file],
      errors: [],
    });
  });

  it("accepts an image exactly at the 5 MB limit", () => {
    const file = imageFile(
      "maximum.jpg",
      "image/jpeg",
      MAX_PRODUCT_IMAGE_SIZE,
    );
    expect(validateProductImageFiles([file]).errors).toEqual([]);
  });

  it("rejects unsupported image formats", () => {
    const result = validateProductImageFiles([
      imageFile("vector.svg", "image/svg+xml"),
    ]);
    expect(result.validFiles).toEqual([]);
    expect(result.errors[0]).toContain("JPG, PNG, GIF, or WebP");
  });

  it("rejects images larger than 5 MB", () => {
    const result = validateProductImageFiles([
      imageFile(
        "large.png",
        "image/png",
        MAX_PRODUCT_IMAGE_SIZE + 1,
      ),
    ]);
    expect(result.validFiles).toEqual([]);
    expect(result.errors[0]).toContain("maximum file size is 5 MB");
  });
});
