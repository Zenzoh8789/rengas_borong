"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadedDesignFile = uploadedDesignFile;
exports.imagePath = imagePath;
exports.deleteUploadedDesignFile = deleteUploadedDesignFile;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const storage_1 = require("../storage");
function uploadedDesignFile(url, includeProducts = false) {
    const rootUpload = /^\/uploads\/\d+-\d+\.jpg$/.test(url);
    const productUpload = includeProducts && /^\/uploads\/products\/[a-zA-Z0-9_-]+-\d+-\d+\.(?:jpg|jpeg|png|webp)$/.test(url);
    return rootUpload || productUpload ? url.slice(9) : null;
}
function imagePath(value) {
    if (!value)
        return "";
    try {
        return decodeURIComponent(new URL(value, "https://local.invalid").pathname);
    }
    catch {
        return value;
    }
}
async function deleteUploadedDesignFile(url, includeProducts = false) {
    const filename = uploadedDesignFile(url, includeProducts);
    if (!filename)
        return;
    const root = await (0, promises_1.realpath)((0, storage_1.getUploadDirectory)());
    const target = (0, node_path_1.join)(root, filename);
    try {
        const info = await (0, promises_1.lstat)(target);
        if (!info.isFile() || info.isSymbolicLink())
            return;
        const expectedParent = filename.startsWith("products/") ? (0, node_path_1.join)(root, "products") : root;
        if (await (0, promises_1.realpath)(expectedParent) !== expectedParent)
            return;
        if ((0, node_path_1.dirname)(await (0, promises_1.realpath)(target)) !== expectedParent)
            return;
        await (0, promises_1.unlink)(target);
    }
    catch (error) {
        if (error.code !== "ENOENT")
            throw error;
    }
}
//# sourceMappingURL=design-files.js.map