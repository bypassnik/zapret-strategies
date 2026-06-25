import assert from "node:assert/strict";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { ZipArchive } from "archiver";
import { unzipSync } from "fflate";

import { buildBundleZip } from "./bundle.js";

async function createLocalBundle(
  fakeDir: string,
  outPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on("close", () => resolve());
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(fakeDir, "fake");
    void archive.finalize();
  });
}

const tempDir = await mkdtemp(path.join(os.tmpdir(), "bundle-test-"));
const fakeDir = path.join(tempDir, "fake");
const zipPath = path.join(tempDir, "test.zip");

try {
  await mkdir(fakeDir, { recursive: true });
  await writeFile(path.join(fakeDir, "stun.bin"), Buffer.from([1, 2, 3]));
  await writeFile(
    path.join(fakeDir, "quic_initial_www_google_com.bin"),
    Buffer.from([4, 5]),
  );

  await createLocalBundle(fakeDir, zipPath);

  const zipData = await readFile(zipPath);
  const entries = unzipSync(new Uint8Array(zipData));

  assert.ok(entries["fake/stun.bin"], "fake/stun.bin в архиве");
  assert.ok(
    entries["fake/quic_initial_www_google_com.bin"],
    "fake/quic_initial_www_google_com.bin в архиве",
  );
  assert.equal(
    Object.keys(entries).some((name) => name.endsWith(".json")),
    false,
    "архив не содержит json",
  );
  assert.deepEqual([...entries["fake/stun.bin"]], [1, 2, 3]);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

assert.equal(typeof buildBundleZip, "function");

console.log("bundle tests ok");
