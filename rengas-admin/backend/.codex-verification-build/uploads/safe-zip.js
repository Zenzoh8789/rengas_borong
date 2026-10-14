"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readImageZip = readImageZip;
const common_1 = require("@nestjs/common");
const node_path_1 = require("node:path");
const yauzl = require("yauzl");
const upload_validation_1 = require("./upload-validation");
function readImageZip(buffer) {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true, decodeStrings: true }, (openError, zip) => {
            if (openError || !zip)
                return reject(new common_1.BadRequestException("The product images ZIP is invalid"));
            const results = [];
            let entries = 0;
            let totalSize = 0;
            const fail = (message) => {
                zip.close();
                reject(new common_1.BadRequestException(message));
            };
            zip.on("error", () => fail("The product images ZIP is invalid"));
            zip.on("end", () => resolve(results));
            zip.on("entry", (entry) => {
                entries += 1;
                if (entries > upload_validation_1.MAX_ZIP_ENTRIES)
                    return fail(`The ZIP may contain at most ${upload_validation_1.MAX_ZIP_ENTRIES} entries`);
                const name = entry.fileName.replaceAll("\\", "/");
                if (name.includes("\0") || name.startsWith("/") || name.split("/").includes("..")) {
                    return fail("The ZIP contains an unsafe file path");
                }
                if (/\/$/.test(name))
                    return zip.readEntry();
                totalSize += entry.uncompressedSize;
                if (totalSize > upload_validation_1.MAX_ZIP_UNCOMPRESSED_BYTES)
                    return fail("ZIP expands beyond the 100 MB safety limit");
                if (entry.uncompressedSize > upload_validation_1.MAX_IMAGE_BYTES)
                    return fail(`${name} is larger than 5 MB`);
                if (![".jpg", ".jpeg", ".png", ".webp"].includes((0, node_path_1.extname)(name).toLowerCase())) {
                    return zip.readEntry();
                }
                zip.openReadStream(entry, (streamError, stream) => {
                    if (streamError || !stream)
                        return fail(`Unable to read ${name}`);
                    const chunks = [];
                    let bytes = 0;
                    stream.on("data", (chunk) => {
                        bytes += chunk.length;
                        if (bytes > upload_validation_1.MAX_IMAGE_BYTES)
                            stream.destroy(new Error("entry too large"));
                        else
                            chunks.push(chunk);
                    });
                    stream.on("error", () => fail(`${name} exceeds the image safety limit`));
                    stream.on("end", () => {
                        results.push({ fileName: name, data: Buffer.concat(chunks) });
                        zip.readEntry();
                    });
                });
            });
            zip.readEntry();
        });
    });
}
//# sourceMappingURL=safe-zip.js.map