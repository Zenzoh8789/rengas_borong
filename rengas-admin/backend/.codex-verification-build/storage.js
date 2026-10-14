"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadDirectory = getUploadDirectory;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function getUploadDirectory() {
    const configured = process.env.UPLOAD_DIR?.trim();
    const uploadDirectory = configured
        ? (0, node_path_1.isAbsolute)(configured)
            ? configured
            : (0, node_path_1.resolve)(process.cwd(), configured)
        : (0, node_path_1.join)(process.cwd(), "uploads");
    if (!(0, node_fs_1.existsSync)(uploadDirectory)) {
        (0, node_fs_1.mkdirSync)(uploadDirectory, { recursive: true });
    }
    const productsDirectory = (0, node_path_1.join)(uploadDirectory, "products");
    if (!(0, node_fs_1.existsSync)(productsDirectory)) {
        (0, node_fs_1.mkdirSync)(productsDirectory, { recursive: true });
    }
    return uploadDirectory;
}
//# sourceMappingURL=storage.js.map