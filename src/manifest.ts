import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { buildBundleRelativePath } from "./paths.js";

export interface VersionIndexEntry {
  release: string;
  parsedAt: string;
  strategiesCount: number;
  bundle: string;
}

export interface StrategiesIndex {
  versions: VersionIndexEntry[];
}

export function createVersionIndexEntry(
  release: string,
  parsedAt: string,
  strategiesCount: number,
): VersionIndexEntry {
  return {
    release,
    parsedAt,
    strategiesCount,
    bundle: buildBundleRelativePath(release),
  };
}

export async function updateStrategiesIndex(
  strategiesDir: string,
  entry: VersionIndexEntry,
): Promise<string> {
  const indexPath = path.join(strategiesDir, "index.json");
  let index: StrategiesIndex = { versions: [] };

  try {
    const raw = await readFile(indexPath, "utf8");
    index = JSON.parse(raw) as StrategiesIndex;
    if (!Array.isArray(index.versions)) {
      index.versions = [];
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  index.versions = index.versions.filter((v) => v.release !== entry.release);
  index.versions.push(entry);
  index.versions.sort((a, b) => b.parsedAt.localeCompare(a.parsedAt));

  await mkdir(strategiesDir, { recursive: true });
  await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  return indexPath;
}
