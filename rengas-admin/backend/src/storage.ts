import { isAbsolute, join, resolve } from "node:path";

/** One directory shared by upload, PDF generation and static serving. */
export function getUploadDirectory(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (!configured) return join(process.cwd(), "uploads");
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

