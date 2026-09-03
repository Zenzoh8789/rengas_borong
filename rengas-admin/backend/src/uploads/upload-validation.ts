import { BadRequestException } from "@nestjs/common";
import { extname } from "node:path";
import * as sharpModule from "sharp";

const sharpFactory = ((sharpModule as any).default ?? sharpModule) as any;

export const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024;
export const MAX_SPREADSHEET_ROWS = 10_000;
export const MAX_ZIP_BYTES = 25 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 500;
export const MAX_ZIP_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 25_000_000;

const spreadsheetTypes = new Set([
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

export function validateSpreadsheetUpload(
  file?: Express.Multer.File,
): asserts file is Express.Multer.File {
  if (!file?.buffer?.length) {
    throw new BadRequestException("Select a CSV or Excel file.");
  }
  if (file.buffer.length > MAX_SPREADSHEET_BYTES) {
    throw new BadRequestException("Spreadsheet must be 5 MB or smaller.");
  }

  const extension = extname(file.originalname || "").toLowerCase();
  if (![".csv", ".xlsx"].includes(extension)) {
    throw new BadRequestException("Only CSV and XLSX files are supported.");
  }
  if (file.mimetype && !spreadsheetTypes.has(file.mimetype.toLowerCase())) {
    throw new BadRequestException("The uploaded spreadsheet type is not allowed.");
  }

  const isZip = file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (extension === ".xlsx" && !isZip) {
    throw new BadRequestException("The XLSX file signature is invalid.");
  }
  if (extension === ".csv" && file.buffer.includes(0)) {
    throw new BadRequestException("The CSV file contains invalid binary data.");
  }

}

export function validateZipUpload(file?: Express.Multer.File): void {
  if (!file?.buffer?.length) return;
  if (extname(file.originalname || "").toLowerCase() !== ".zip") {
    throw new BadRequestException("Product images must be provided as a ZIP file.");
  }
  if (file.buffer.length > MAX_ZIP_BYTES) {
    throw new BadRequestException("Product images ZIP must be 25 MB or smaller.");
  }
  if (!file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    throw new BadRequestException("The product images ZIP signature is invalid.");
  }
}

export async function validateImageBuffer(buffer: Buffer): Promise<void> {
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new BadRequestException("Each image must be 5 MB or smaller.");
  }
  try {
    const metadata = await sharpFactory(buffer, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "")) {
      throw new Error("unsupported image format");
    }
    if (!metadata.width || !metadata.height) throw new Error("missing dimensions");
  } catch {
    throw new BadRequestException("The uploaded file is not a safe JPG, PNG, or WEBP image.");
  }
}

export function assertSpreadsheetRowLimit(rowCount: number): void {
  if (rowCount > MAX_SPREADSHEET_ROWS) {
    throw new BadRequestException(
      `Spreadsheet may contain at most ${MAX_SPREADSHEET_ROWS.toLocaleString()} rows.`,
    );
  }
}
