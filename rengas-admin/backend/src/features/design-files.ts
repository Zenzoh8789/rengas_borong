import { lstat, realpath, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getUploadDirectory } from "../storage";

// Only files produced by the single-image uploader belong to this cleanup.
export function uploadedDesignFile(url: string, includeProducts = false): string | null {
  const rootUpload = /^\/uploads\/\d+-\d+\.jpg$/.test(url);
  const productUpload = includeProducts && /^\/uploads\/products\/[a-zA-Z0-9_-]+-\d+-\d+\.(?:jpg|jpeg|png|webp)$/.test(url);
  return rootUpload || productUpload ? url.slice(9) : null;
}

export function imagePath(value: string | null | undefined): string {
  if (!value) return "";
  try { return decodeURIComponent(new URL(value, "https://local.invalid").pathname); }
  catch { return value; }
}

export async function deleteUploadedDesignFile(url: string, includeProducts = false): Promise<void> {
  const filename = uploadedDesignFile(url, includeProducts);
  if (!filename) return;
  const root = await realpath(getUploadDirectory());
  const target = join(root, filename);
  try {
    const info = await lstat(target);
    if (!info.isFile() || info.isSymbolicLink()) return;
    const expectedParent = filename.startsWith("products/") ? join(root, "products") : root;
    if (await realpath(expectedParent) !== expectedParent) return;
    if (dirname(await realpath(target)) !== expectedParent) return;
    await unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

