"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CloseIcon,
  PlusIcon,
  StarIcon,
} from "@/components/icons";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import {
  ALLOWED_MIME_TYPES,
  CATEGORY_SUGGESTIONS,
  IMAGE_ALT_MAX,
  IMAGE_MAX,
  MAX_FILE_BYTES,
  META_DESCRIPTION_MAX,
  META_KEYWORDS_MAX,
  META_TITLE_MAX,
} from "@/lib/constants/products";
import { uploadImages, type UploadProgress } from "@/lib/services/uploads.service";
import type { Product, ProductInput } from "@/lib/types/product";

interface FormValues {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
  sizes: string;
  images: string[];
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  imageAlt: string;
}

function toFormValues(product?: Product | null): FormValues {
  return {
    name: product?.name ?? "",
    category: product?.category ?? "",
    price: product ? String(product.price) : "",
    stock: product ? String(product.stock) : "0",
    description: product?.description ?? "",
    sizes: product?.sizes.join(", ") ?? "",
    // Existing images are carried over as-is so editing never drops them;
    // removals and reordering are explicit choices in the grid below.
    images: product?.images ? [...product.images] : [],
    isActive: product?.isActive ?? true,
    metaTitle: product?.metaTitle ?? "",
    metaDescription: product?.metaDescription ?? "",
    metaKeywords: product?.metaKeywords ?? "",
    imageAlt: product?.imageAlt ?? "",
  };
}

function parseMultiLine(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (values.name.trim().length === 0) {
    errors.name = "Name is required";
  } else if (values.name.trim().length > 200) {
    errors.name = "Name must be at most 200 characters";
  }

  if (values.category.trim().length === 0) {
    errors.category = "Category is required";
  } else if (values.category.trim().length > 100) {
    errors.category = "Category must be at most 100 characters";
  }

  const price = Number(values.price.trim());
  if (values.price.trim().length === 0) {
    errors.price = "Price is required";
  } else if (
    !Number.isFinite(price) ||
    price < 0 ||
    price > 10000000
  ) {
    errors.price = "Price must be a number between 0 and 1,00,00,000";
  }

  const stock = Number(values.stock.trim());
  if (
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 10000000
  ) {
    errors.stock = "Stock must be a whole number of 0 or more";
  }

  if (values.description.length > 5000) {
    errors.description = "Description must be at most 5000 characters";
  }

  const sizes = parseMultiLine(values.sizes);
  if (sizes.length > 20 || sizes.some((size) => size.length > 30)) {
    errors.sizes = "Up to 20 sizes, each at most 30 characters";
  }

  const images = values.images;
  if (images.length > IMAGE_MAX) {
    errors.images = `Up to ${IMAGE_MAX} images`;
  } else if (images.some((url) => url.length > 2048 || !isHttpUrl(url))) {
    errors.images = "Each image must be an http(s) URL";
  }

  if (values.metaTitle.length > META_TITLE_MAX) {
    errors.metaTitle = `Meta title must be at most ${META_TITLE_MAX} characters`;
  }

  if (values.metaDescription.length > META_DESCRIPTION_MAX) {
    errors.metaDescription = `Meta description must be at most ${META_DESCRIPTION_MAX} characters`;
  }

  if (values.metaKeywords.length > META_KEYWORDS_MAX) {
    errors.metaKeywords = `Meta keywords must be at most ${META_KEYWORDS_MAX} characters`;
  }

  if (values.imageAlt.length > IMAGE_ALT_MAX) {
    errors.imageAlt = `Image alt text must be at most ${IMAGE_ALT_MAX} characters`;
  }

  return errors;
}

export function ProductDialog({
  product,
  onClose,
  onSubmit,
}: {
  product: Product | null;
  onClose: () => void;
  onSubmit: (input: ProductInput, product: Product | null) => Promise<void>;
}) {
  const [values, setValues] = useState<FormValues>(() =>
    toFormValues(product),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [backendError, setBackendError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageNote, setImageNote] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null,
  );

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function noteImageError(message: string) {
    setImageNote(message);
    setErrors((prev) => ({ ...prev, images: message }));
  }

  function clearImageError() {
    setImageNote(null);
    setErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
  }

  function addImageUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    if (values.images.length >= IMAGE_MAX) {
      noteImageError(`Up to ${IMAGE_MAX} images`);
      return;
    }
    if (url.length > 2048) {
      noteImageError("URL must be at most 2048 characters");
      return;
    }
    if (!isHttpUrl(url)) {
      noteImageError("Each image must be an http(s) URL");
      return;
    }
    setImageUrl("");
    clearImageError();
    setValues((prev) => ({ ...prev, images: [...prev.images, url] }));
  }

  function removeImage(index: number) {
    setValues((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    clearImageError();
  }

  /** Swaps an image with its neighbour; the first slot is the cover slot. */
  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.images.length) return;
    setValues((prev) => {
      const images = [...prev.images];
      [images[index], images[target]] = [images[target], images[index]];
      return { ...prev, images };
    });
    clearImageError();
  }

  /** Promotes an image to slot 0, the storefront cover. */
  function makeCover(index: number) {
    if (index === 0) return;
    setValues((prev) => {
      const images = [...prev.images];
      const [chosen] = images.splice(index, 1);
      images.unshift(chosen);
      return { ...prev, images };
    });
    clearImageError();
  }

  // Client-side pre-checks mirror the backend's rules so mistakes surface
  // instantly; anything that slips through still gets a server error.
  function rejectInvalidFiles(files: File[]): string | null {
    const oversize = files.filter((file) => file.size > MAX_FILE_BYTES);
    if (oversize.length > 0) {
      return `${oversize
        .map((file) => file.name)
        .join(", ")} — each image must be 5 MB or smaller.`;
    }
    const unsupported = files.filter(
      (file) => !ALLOWED_MIME_TYPES.includes(file.type),
    );
    if (unsupported.length > 0) {
      return `${unsupported
        .map((file) => file.name)
        .join(", ")} — use JPEG, PNG, WebP, AVIF or GIF.`;
    }
    return null;
  }

  async function handleImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const fileList = input.files;
    if (!fileList || fileList.length === 0) return;

    const remaining = IMAGE_MAX - values.images.length;
    if (remaining <= 0) {
      input.value = "";
      noteImageError(`Up to ${IMAGE_MAX} images`);
      return;
    }
    const selected = Array.from(fileList);
    const files = selected.slice(0, remaining);

    const invalid = rejectInvalidFiles(files);
    if (invalid) {
      input.value = "";
      noteImageError(invalid);
      return;
    }

    setUploading(true);
    setImageNote(null);
    setUploadProgress({ phase: "sending", percent: 0 });
    let succeeded = false;
    try {
      const urls = await uploadImages(files, setUploadProgress);
      setValues((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      succeeded = true;
    } catch (err) {
      setImageNote(
        err instanceof Error ? err.message : "Upload failed — please try again.",
      );
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (succeeded && files.length < selected.length) {
        setImageNote(
          `Only the first ${files.length} file(s) were uploaded (${IMAGE_MAX}-image limit).`,
        );
      }
      input.value = "";
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setBackendError(null);
    try {
      await onSubmit(
        {
          name: values.name.trim(),
          description: values.description,
          price: Number(values.price.trim()),
          category: values.category.trim(),
          images: values.images,
          stock: Number(values.stock.trim() || "0"),
          sizes: parseMultiLine(values.sizes),
          isActive: values.isActive,
          metaTitle: values.metaTitle.trim(),
          metaDescription: values.metaDescription.trim(),
          metaKeywords: values.metaKeywords.trim(),
          imageAlt: values.imageAlt.trim(),
        },
        product,
      );
    } catch (err) {
      setBackendError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const remainingSlots = IMAGE_MAX - values.images.length;

  return (
    <Modal
      ariaLabel={product ? "Edit product" : "Add product"}
      containerClassName="fixed inset-0 z-50 overflow-y-auto bg-ash-100/60 p-4 py-10 sm:py-16"
      panelClassName="relative mx-auto w-full max-w-xl rounded-sm border border-line bg-floral-500 shadow-xl"
    >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg">
            {product ? "Edit product" : "Add product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1.5 hover:bg-surface"
            disabled={submitting}
          >
            <CloseIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-5 py-5">
          <FormField label="Name" error={errors.name} htmlFor="product-name">
            <input
              id="product-name"
              className={`ap-input ${errors.name ? "border-powder-400" : ""}`}
              maxLength={200}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Category"
              error={errors.category}
              htmlFor="product-category"
            >
              <input
                id="product-category"
                className={`ap-input ${errors.category ? "border-powder-400" : ""}`}
                maxLength={100}
                list="category-suggestions"
                value={values.category}
                onChange={(e) => set("category", e.target.value)}
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </FormField>
            <FormField
              label="Price (₹)"
              error={errors.price}
              htmlFor="product-price"
            >
              <input
                id="product-price"
                inputMode="decimal"
                className={`ap-input ${errors.price ? "border-powder-400" : ""}`}
                value={values.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="e.g. 1890"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Stock"
              error={errors.stock}
              htmlFor="product-stock"
            >
              <input
                id="product-stock"
                inputMode="numeric"
                className={`ap-input ${errors.stock ? "border-powder-400" : ""}`}
                value={values.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </FormField>
            <FormField
              label="Sizes (comma separated)"
              error={errors.sizes}
              htmlFor="product-sizes"
            >
              <input
                id="product-sizes"
                className={`ap-input ${errors.sizes ? "border-powder-400" : ""}`}
                value={values.sizes}
                onChange={(e) => set("sizes", e.target.value)}
                placeholder="S, M, L"
              />
            </FormField>
          </div>
          <FormField
            label="Description"
            error={errors.description}
            htmlFor="product-description"
          >
            <textarea
              id="product-description"
              rows={4}
              maxLength={5000}
              className={`ap-input resize-y ${errors.description ? "border-powder-400" : ""}`}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </FormField>

          {/* --- Images: upload, reorder, remove ------------------------- */}
          <fieldset>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="product-image-url" className="ap-eyebrow block text-ash-300">
                Images ({values.images.length}/{IMAGE_MAX})
                <span className="ml-1 normal-case tracking-normal text-ash-200">
                  — first image is the cover
                </span>
              </label>
              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-line px-3 py-1.5 text-xs transition-colors hover:bg-surface"
                title={
                  remainingSlots > 0
                    ? `Add up to ${remainingSlots} more image(s)`
                    : `Image limit reached (${IMAGE_MAX})`
                }
              >
                {uploading ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-current" />
                ) : (
                  <PlusIcon className="h-3.5 w-3.5" />
                )}
                {uploading ? "Uploading…" : "Upload images"}
                <input
                  type="file"
                  accept={ALLOWED_MIME_TYPES.join(",")}
                  multiple
                  className="sr-only"
                  disabled={uploading || remainingSlots <= 0}
                  onChange={handleImageInputChange}
                />
              </label>
            </div>

            {uploading && uploadProgress ? (
              <div className="mb-2" aria-live="polite">
                <div className="h-1.5 w-full overflow-hidden rounded-sm bg-line">
                  <div
                    className={`h-full bg-burnt-500 transition-[width] duration-150 ${
                      uploadProgress.phase === "processing"
                        ? "animate-pulse"
                        : ""
                    }`}
                    style={{
                      width:
                        uploadProgress.phase === "sending"
                          ? `${uploadProgress.percent}%`
                          : "100%",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-ash-200">
                  {uploadProgress.phase === "sending"
                    ? `Uploading ${uploadProgress.percent}%`
                    : "Processing images…"}
                </p>
              </div>
            ) : null}

            {values.images.length > 0 ? (
              <ul className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {values.images.map((url, index) => (
                  <li
                    key={`${url}-${index}`}
                    className="group relative overflow-hidden rounded-sm border border-line bg-surface"
                  >
                    <img
                      src={url}
                      alt={
                        index === 0
                          ? "Cover image"
                          : `Product image ${index + 1}`
                      }
                      className="aspect-square w-full object-cover"
                    />
                    {index === 0 ? (
                      <span className="ap-eyebrow absolute left-0 top-0 bg-ash-100/90 px-1 py-0.5 text-[10px] text-floral">
                        Cover
                      </span>
                    ) : null}
                    <button
                      type="button"
                      title="Remove image"
                      onClick={() => removeImage(index)}
                      disabled={uploading}
                      className="absolute right-0 top-0 rounded-bl-sm bg-ash-100/90 p-1 text-ink transition-colors hover:bg-powder-800 hover:text-powder-200 disabled:opacity-60"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                      <span className="sr-only">Remove image {index + 1}</span>
                    </button>
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-floral-500/90 p-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                      <button
                        type="button"
                        title="Move earlier"
                        onClick={() => moveImage(index, -1)}
                        disabled={uploading || index === 0}
                        className="rounded-sm p-1 text-ash-200 transition-colors hover:bg-floral-400 hover:text-ink disabled:opacity-40"
                      >
                        <ArrowLeftIcon className="h-3.5 w-3.5" />
                        <span className="sr-only">
                          Move image {index + 1} earlier
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Make cover"
                        onClick={() => makeCover(index)}
                        disabled={uploading || index === 0}
                        className="rounded-sm p-1 text-ash-200 transition-colors hover:bg-floral-400 hover:text-ink disabled:opacity-40"
                      >
                        <StarIcon className="h-3.5 w-3.5" />
                        <span className="sr-only">
                          Make image {index + 1} the cover
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Move later"
                        onClick={() => moveImage(index, 1)}
                        disabled={uploading || index === values.images.length - 1}
                        className="rounded-sm p-1 text-ash-200 transition-colors hover:bg-floral-400 hover:text-ink disabled:opacity-40"
                      >
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                        <span className="sr-only">Move image {index + 1} later</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-2 text-xs text-ash-200">
                No images yet. Upload files or add a URL below (up to {IMAGE_MAX}).
              </p>
            )}

            <div className="flex gap-2">
              <input
                id="product-image-url"
                className={`ap-input ${errors.images ? "border-powder-400" : ""}`}
                value={imageUrl}
                maxLength={2048}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Add image by URL (https://…)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImageUrl();
                  }
                }}
              />
              <button
                type="button"
                onClick={addImageUrl}
                disabled={uploading}
                className="shrink-0 rounded-sm border border-line px-3 text-sm transition-colors hover:bg-surface disabled:opacity-60"
              >
                Add
              </button>
            </div>
            {imageNote ? (
              <p role="alert" className="mt-1 text-xs text-powder-300">
                {imageNote}
              </p>
            ) : null}
          </fieldset>

          {/* --- SEO ------------------------------------------------------ */}
          <details className="rounded-sm border border-line px-4 py-3">
            <summary className="ap-eyebrow cursor-pointer select-none text-ash-300">
              SEO &amp; search listing
            </summary>
            <div className="mt-3 flex flex-col gap-4">
              <FormField
                label="Meta title"
                hint={`${values.metaTitle.length}/${META_TITLE_MAX} — search engines show roughly the first 60 characters`}
                error={errors.metaTitle}
                htmlFor="product-meta-title"
              >
                <input
                  id="product-meta-title"
                  className={`ap-input ${errors.metaTitle ? "border-powder-400" : ""}`}
                  maxLength={META_TITLE_MAX}
                  value={values.metaTitle}
                  onChange={(e) => set("metaTitle", e.target.value)}
                  placeholder={`${values.name || "Product name"} | AllPastels`}
                />
              </FormField>
              <FormField
                label="Meta description"
                hint={`${values.metaDescription.length}/${META_DESCRIPTION_MAX} — search engines show roughly the first 160 characters`}
                error={errors.metaDescription}
                htmlFor="product-meta-description"
              >
                <textarea
                  id="product-meta-description"
                  rows={2}
                  maxLength={META_DESCRIPTION_MAX}
                  className={`ap-input resize-y ${errors.metaDescription ? "border-powder-400" : ""}`}
                  value={values.metaDescription}
                  onChange={(e) => set("metaDescription", e.target.value)}
                  placeholder="One or two sentences describing the piece, as it should appear in search results."
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Meta keywords"
                  hint={`Comma separated, ${values.metaKeywords.length}/${META_KEYWORDS_MAX}`}
                  error={errors.metaKeywords}
                  htmlFor="product-meta-keywords"
                >
                  <input
                    id="product-meta-keywords"
                    className={`ap-input ${errors.metaKeywords ? "border-powder-400" : ""}`}
                    maxLength={META_KEYWORDS_MAX}
                    value={values.metaKeywords}
                    onChange={(e) => set("metaKeywords", e.target.value)}
                    placeholder="linen dress, summer, breathable"
                  />
                </FormField>
                <FormField
                  label="Image alt text"
                  hint={`Describes the images for screen readers and image search, ${values.imageAlt.length}/${IMAGE_ALT_MAX}`}
                  error={errors.imageAlt}
                  htmlFor="product-image-alt"
                >
                  <input
                    id="product-image-alt"
                    className={`ap-input ${errors.imageAlt ? "border-powder-400" : ""}`}
                    maxLength={IMAGE_ALT_MAX}
                    value={values.imageAlt}
                    onChange={(e) => set("imageAlt", e.target.value)}
                    placeholder="Front view of the piece on a model"
                  />
                </FormField>
              </div>
            </div>
          </details>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="h-4 w-4 accent-burnt-500"
            />
            Active on storefront
          </label>

          {backendError ? (
            <p
              role="alert"
              className="rounded-sm bg-powder-800 px-3 py-2 text-sm text-powder-200"
            >
              {backendError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400 disabled:opacity-60"
            >
              {submitting ? (
                <Spinner className="border-line border-t-floral" />
              ) : null}
              {product ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
