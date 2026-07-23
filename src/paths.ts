import path from "node:path";

/** Безопасное имя файла на Windows и Unix. */
export function sanitizeFilenamePart(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "_");
}

/** strategies/1.9.8c.json */
export function buildStrategiesFilePath(
  strategiesDir: string,
  release: string,
): string {
  return path.join(strategiesDir, `${sanitizeFilenamePart(release)}.json`);
}

/** bundles/1.9.8c.tar.xz */
export function buildBundleFilePath(
  bundlesDir: string,
  release: string,
): string {
  return path.join(bundlesDir, `${sanitizeFilenamePart(release)}.tar.xz`);
}

/** bundles/1.9.8c.tar.xz — относительный путь для index.json */
export function buildBundleRelativePath(release: string): string {
  return `bundles/${sanitizeFilenamePart(release)}.tar.xz`;
}
