import { BadRequestException } from "@nestjs/common";
import { extname } from "node:path";
import yauzl = require("yauzl");
import {
  MAX_IMAGE_BYTES,
  MAX_ZIP_ENTRIES,
  MAX_ZIP_UNCOMPRESSED_BYTES,
} from "./upload-validation";

export type SafeZipEntry = { fileName: string; data: Buffer };

export function readImageZip(buffer: Buffer): Promise<SafeZipEntry[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true, decodeStrings: true },
      (openError, zip) => {
        if (openError || !zip) return reject(new BadRequestException("The product images ZIP is invalid"));
        const results: SafeZipEntry[] = [];
        let entries = 0;
        let totalSize = 0;
        const fail = (message: string) => {
          zip.close();
          reject(new BadRequestException(message));
        };

        zip.on("error", () => fail("The product images ZIP is invalid"));
        zip.on("end", () => resolve(results));
        zip.on("entry", (entry) => {
          entries += 1;
          if (entries > MAX_ZIP_ENTRIES) return fail(`The ZIP may contain at most ${MAX_ZIP_ENTRIES} entries`);
          const name = entry.fileName.replaceAll("\\", "/");
          if (name.includes("\0") || name.startsWith("/") || name.split("/").includes("..")) {
            return fail("The ZIP contains an unsafe file path");
          }
          if (/\/$/.test(name)) return zip.readEntry();

          totalSize += entry.uncompressedSize;
          if (totalSize > MAX_ZIP_UNCOMPRESSED_BYTES) return fail("ZIP expands beyond the 100 MB safety limit");
          if (entry.uncompressedSize > MAX_IMAGE_BYTES) return fail(`${name} is larger than 5 MB`);
          if (![".jpg", ".jpeg", ".png", ".webp"].includes(extname(name).toLowerCase())) {
            return zip.readEntry();
          }

          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) return fail(`Unable to read ${name}`);
            const chunks: Buffer[] = [];
            let bytes = 0;
            stream.on("data", (chunk: Buffer) => {
              bytes += chunk.length;
              if (bytes > MAX_IMAGE_BYTES) stream.destroy(new Error("entry too large"));
              else chunks.push(chunk);
            });
            stream.on("error", () => fail(`${name} exceeds the image safety limit`));
            stream.on("end", () => {
              results.push({ fileName: name, data: Buffer.concat(chunks) });
              zip.readEntry();
            });
          });
        });
        zip.readEntry();
      },
    );
  });
}
