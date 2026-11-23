export const CATEGORY_SUGGESTIONS = ["Women", "Men", "Kids"];

/** Product images cap — the first image is the storefront cover. */
export const IMAGE_MAX = 6;
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // matches backend routes/uploads.ts
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const META_TITLE_MAX = 200;
export const META_DESCRIPTION_MAX = 500;
export const META_KEYWORDS_MAX = 500;
export const IMAGE_ALT_MAX = 200;
