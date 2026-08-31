import { existsSync, mkdirSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

/**
 * One directory shared by uploads, PDF generation,
 * and static-file serving.
 */
export function getUploadDirectory(): string {
  const configured = process.env.UPLOAD_DIR?.trim();

  const uploadDirectory = configured
    ? isAbsolute(configured)
      ? configured
      : resolve(process.cwd(), configured)
    : join(process.cwd(), "uploads");

  if (!existsSync(uploadDirectory)) {
    mkdirSync(uploadDirectory, { recursive: true });
  }

  const productsDirectory = join(uploadDirectory, "products");

  if (!existsSync(productsDirectory)) {
    mkdirSync(productsDirectory, { recursive: true });
  }

  return uploadDirectory;
}