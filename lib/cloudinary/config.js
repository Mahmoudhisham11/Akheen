/** Default cloud account used by unsigned uploads; override with CLOUDINARY_CLOUD_NAME. */
export const CLOUDINARY_CLOUD_NAME = 'drtdv4iyr';

export const CLOUDINARY_UPLOAD_PRESET = 'cashat_abod';

/** Server-only: signed Cloudinary API (e.g. destroy) uses env cloud name or this default. */
export function resolveCloudinaryCloudName() {
  const fromEnv = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  return fromEnv || CLOUDINARY_CLOUD_NAME;
}
