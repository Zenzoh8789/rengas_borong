import { isAbsolute, resolve } from "node:path";

export function getEnvironmentFilePaths(
  workingDirectory = process.cwd(),
  configuredPath = process.env.ENV_FILE,
): string[] {
  const paths: string[] = [];

  if (configuredPath?.trim()) {
    const value = configuredPath.trim();
    paths.push(isAbsolute(value) ? value : resolve(workingDirectory, value));
  }

  // Combined root builds run with the project root as cwd, while backend-only
  // commands run inside backend. Supporting both keeps one deployment contract.
  paths.push(resolve(workingDirectory, "backend", ".env"));
  paths.push(resolve(workingDirectory, ".env"));

  return [...new Set(paths)];
}
