"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironmentFilePaths = getEnvironmentFilePaths;
const node_path_1 = require("node:path");
function getEnvironmentFilePaths(workingDirectory = process.cwd(), configuredPath = process.env.ENV_FILE) {
    const paths = [];
    if (configuredPath?.trim()) {
        const value = configuredPath.trim();
        paths.push((0, node_path_1.isAbsolute)(value) ? value : (0, node_path_1.resolve)(workingDirectory, value));
    }
    paths.push((0, node_path_1.resolve)(workingDirectory, "backend", ".env"));
    paths.push((0, node_path_1.resolve)(workingDirectory, ".env"));
    return [...new Set(paths)];
}
//# sourceMappingURL=env.paths.js.map