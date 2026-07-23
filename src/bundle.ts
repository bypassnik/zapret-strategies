import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import os from "node:os";
import path from "node:path";

import lzma from "lzma-native";
import * as tar from "tar";

import { fetchRawBinary, listBinFiles } from "./github.js";

function tarXzDirectory(
  parentDir: string,
  dirName: string,
  outPath: string,
): Promise<void> {
  return pipeline(
    tar.c({ cwd: parentDir, portable: true }, [dirName]),
    lzma.createCompressor({ preset: 9 }),
    createWriteStream(outPath),
  );
}

/** Скачивает bin/*.bin с тега релиза и упаковывает в tar.xz с каталогом fake/. */
export async function buildBundleTarXz(
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
    await tarXzDirectory(tempDir, "fake", outPath);
    return downloaded;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export { listBinFiles };
