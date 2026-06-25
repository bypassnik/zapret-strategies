import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { ZipArchive } from "archiver";

import { fetchRawBinary, listBinFiles } from "./github.js";

function zipDirectory(sourceDir: string, zipPrefix: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, zipPrefix);
    void archive.finalize();
  });
}

/** Скачивает bin/*.bin с тега релиза и упаковывает в zip с каталогом fake/. */
export async function buildBundleZip(
  ref: string,
  outPath: string,
): Promise<string[]> {
  const binFiles = await listBinFiles(ref);
  if (binFiles.length === 0) {
    throw new Error("Файлы bin/*.bin не найдены");
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "zapret-bundle-"));
  const fakeDir = path.join(tempDir, "fake");
  const downloaded: string[] = [];

  try {
    await mkdir(fakeDir, { recursive: true });

    for (const binPath of binFiles) {
      const basename = path.basename(binPath);
      const data = await fetchRawBinary(ref, binPath);
      await writeFile(path.join(fakeDir, basename), data);
      downloaded.push(basename);
    }

    await mkdir(path.dirname(outPath), { recursive: true });
    await zipDirectory(fakeDir, "fake", outPath);
    return downloaded;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export { listBinFiles };
