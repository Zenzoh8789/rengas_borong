"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_IMAGE_PIXELS = exports.MAX_IMAGE_BYTES = exports.MAX_ZIP_UNCOMPRESSED_BYTES = exports.MAX_ZIP_ENTRIES = exports.MAX_ZIP_BYTES = exports.MAX_SPREADSHEET_ROWS = exports.MAX_SPREADSHEET_BYTES = void 0;
exports.validateSpreadsheetUpload = validateSpreadsheetUpload;
exports.validateZipUpload = validateZipUpload;
exports.validateImageBuffer = validateImageBuffer;
exports.assertSpreadsheetRowLimit = assertSpreadsheetRowLimit;
const common_1 = require("@nestjs/common");
const node_path_1 = require("node:path");
const sharpModule = require("sharp");
const sharpFactory = (sharpModule.default ?? sharpModule);
exports.MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024;
exports.MAX_SPREADSHEET_ROWS = 10_000;
exports.MAX_ZIP_BYTES = 25 * 1024 * 1024;
exports.MAX_ZIP_ENTRIES = 500;
exports.MAX_ZIP_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
exports.MAX_IMAGE_BYTES = 5 * 1024 * 1024;
exports.MAX_IMAGE_PIXELS = 25_000_000;
const spreadsheetTypes = new Set([
    "text/csv",
    "text/plain",
    "application/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
]);
function validateSpreadsheetUpload(file) {
    if (!file?.buffer?.length) {
        throw new common_1.BadRequestException("Select a CSV or Excel file.");
    }
    if (file.buffer.length > exports.MAX_SPREADSHEET_BYTES) {
        throw new common_1.BadRequestException("Spreadsheet must be 5 MB or smaller.");
    }
    const extension = (0, node_path_1.extname)(file.originalname || "").toLowerCase();
    if (![".csv", ".xlsx"].includes(extension)) {
        throw new common_1.BadRequestException("Only CSV and XLSX files are supported.");
    }
    if (file.mimetype && !spreadsheetTypes.has(file.mimetype.toLowerCase())) {
        throw new common_1.BadRequestException("The uploaded spreadsheet type is not allowed.");
    }
    const isZip = file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    if (extension === ".xlsx" && !isZip) {
        throw new common_1.BadRequestException("The XLSX file signature is invalid.");
    }
    if (extension === ".csv" && file.buffer.includes(0)) {
        throw new common_1.BadRequestException("The CSV file contains invalid binary data.");
    }
}
function validateZipUpload(file) {
    if (!file?.buffer?.length)
        return;
    if ((0, node_path_1.extname)(file.originalname || "").toLowerCase() !== ".zip") {
        throw new common_1.BadRequestException("Product images must be provided as a ZIP file.");
    }
    if (file.buffer.length > exports.MAX_ZIP_BYTES) {
        throw new common_1.BadRequestException("Product images ZIP must be 25 MB or smaller.");
    }
    if (!file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
        throw new common_1.BadRequestException("The product images ZIP signature is invalid.");
    }
}
async function validateImageBuffer(buffer) {
    if (!buffer.length || buffer.length > exports.MAX_IMAGE_BYTES) {
        throw new common_1.BadRequestException("Each image must be 5 MB or smaller.");
    }
    try {
        const metadata = await sharpFactory(buffer, {
            failOn: "error",
            limitInputPixels: exports.MAX_IMAGE_PIXELS,
        }).metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format || "")) {
            throw new Error("unsupported image format");
        }
        if (!metadata.width || !metadata.height)
            throw new Error("missing dimensions");
    }
    catch {
        throw new common_1.BadRequestException("The uploaded file is not a safe JPG, PNG, or WEBP image.");
    }
}
function assertSpreadsheetRowLimit(rowCount) {
    if (rowCount > exports.MAX_SPREADSHEET_ROWS) {
        throw new common_1.BadRequestException(`Spreadsheet may contain at most ${exports.MAX_SPREADSHEET_ROWS.toLocaleString()} rows.`);
    }
}
//# sourceMappingURL=upload-validation.js.map