import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createVersionIndexEntry,
  updateStrategiesIndex,
} from "./manifest.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "manifest-test-"));

try {
  const entryA = createVersionIndexEntry("1.9.8c", "2026-05-26", 18);
  assert.equal(entryA.bundle, "bundles/1.9.8c.tar.xz");

  const indexPath = await updateStrategiesIndex(tempDir, entryA);
  let raw = await readFile(indexPath, "utf8");
  let index = JSON.parse(raw) as { versions: Array<{ release: string }> };
  assert.equal(index.versions.length, 1);
  assert.equal(index.versions[0]?.release, "1.9.8c");

  const entryB = createVersionIndexEntry("1.9.9c", "2026-06-25", 19);
  await updateStrategiesIndex(tempDir, entryB);
  raw = await readFile(indexPath, "utf8");
  index = JSON.parse(raw);
  assert.equal(index.versions.length, 2);
  assert.equal(index.versions[0]?.release, "1.9.9c");
  assert.equal(index.versions[1]?.release, "1.9.8c");

  const entryAUpdated = createVersionIndexEntry("1.9.8c", "2026-06-01", 20);
  await updateStrategiesIndex(tempDir, entryAUpdated);
  raw = await readFile(indexPath, "utf8");
  index = JSON.parse(raw);
  assert.equal(index.versions.length, 2);
  const updated = index.versions.find((v) => v.release === "1.9.8c");
  assert.equal(updated?.parsedAt, "2026-06-01");
  assert.equal(updated?.strategiesCount, 20);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("manifest tests ok");
