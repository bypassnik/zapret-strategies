import assert from "node:assert/strict";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import os from "node:os";
import path from "node:path";

import lzma from "lzma-native";
import * as tar from "tar";

import { buildBundleTarXz } from "./bundle.js";

async function createLocalBundle(
  parentDir: string,
  dirName: string,
  outPath: string,
): Promise<void> {
  await pipeline(
    tar.c({ cwd: parentDir, portable: true }, [dirName]),
    lzma.createCompressor({ preset: 9 }),
    createWriteStream(outPath),
  );
}

async function listTarXzEntries(
  archivePath: string,
): Promise<Map<string, Buffer>> {
  const entries = new Map<string, Buffer>();
  const readStream = createReadStream(archivePath);

  await pipeline(
    readStream,
    lzma.createDecompressor(),
    tar.t({
      onReadEntry: (entry) => {
        const chunks: Buffer[] = [];
        entry.on("data", (chunk: Buffer) => chunks.push(chunk));
        entry.on("end", () => {
          entries.set(entry.path, Buffer.concat(chunks));
        });
      },
    }),
  );

  return entries;
}

const tempDir = await mkdtemp(path.join(os.tmpdir(), "bundle-test-"));
const fakeDir = path.join(tempDir, "fake");
const archivePath = path.join(tempDir, "test.tar.xz");

try {
  await mkdir(fakeDir, { recursive: true });
  await writeFile(path.join(fakeDir, "stun.bin"), Buffer.from([1, 2, 3]));
  await writeFile(
    path.join(fakeDir, "quic_initial_www_google_com.bin"),
    Buffer.from([4, 5]),
  );

  await createLocalBundle(tempDir, "fake", archivePath);

  const entries = await listTarXzEntries(archivePath);

  assert.ok(entries.has("fake/stun.bin"), "fake/stun.bin в архиве");
  assert.ok(
    entries.has("fake/quic_initial_www_google_com.bin"),
    "fake/quic_initial_www_google_com.bin в архиве",
  );
  assert.equal(
    [...entries.keys()].some((name) => name.endsWith(".json")),
    false,
    "архив не содержит json",
  );
  assert.deepEqual([...entries.get("fake/stun.bin")!], [1, 2, 3]);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

assert.equal(typeof buildBundleTarXz, "function");

console.log("bundle tests ok");
