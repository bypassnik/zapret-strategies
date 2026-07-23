import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildBundleTarXz } from "./bundle.js";
import { REPO } from "./constants.js";
import {
  fetchBatFile,
  fetchLatestReleaseTag,
  listGeneralBatFiles,
} from "./github.js";
import {
  createVersionIndexEntry,
  updateStrategiesIndex,
} from "./manifest.js";
import { buildBundleFilePath, buildStrategiesFilePath } from "./paths.js";
import {
  parseBatFilters,
  toStrategyEntry,
  type StrategiesDocument,
} from "./transform.js";

interface CliOptions {
  tag: string | null;
  strategiesDir: string;
  bundlesDir: string;
  outFile: string | null;
  skipBundle: boolean;
}

function parseCli(argv: string[]): CliOptions {
  let tag: string | null = null;
  let strategiesDir = path.join(process.cwd(), "strategies");
  let bundlesDir = path.join(process.cwd(), "bundles");
  let outFile: string | null = null;
  let skipBundle = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tag" && argv[i + 1]) {
      tag = argv[++i];
    } else if (arg === "--out" && argv[i + 1]) {
      const target = path.resolve(argv[++i]);
      if (target.toLowerCase().endsWith(".json")) {
        outFile = target;
      } else {
        strategiesDir = target;
      }
    } else if (arg === "--bundles-dir" && argv[i + 1]) {
      bundlesDir = path.resolve(argv[++i]);
    } else if (arg === "--skip-bundle") {
      skipBundle = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npx tsx src/index.ts [--tag VERSION] [--out DIR|FILE] [--bundles-dir DIR] [--skip-bundle]

  --tag           Тег релиза GitHub (по умолчанию — latest)
  --out           Каталог strategies/ или явный путь к .json
                  По умолчанию: strategies/<версия>.json
  --bundles-dir   Каталог для tar.xz (по умолчанию: bundles/)
  --skip-bundle   Не скачивать bin и не собирать tar.xz
`);
      process.exit(0);
    }
  }

  return { tag, strategiesDir, bundlesDir, outFile, skipBundle };
}

function strategyBaseName(batFile: string): string {
  return batFile.replace(/\.bat$/i, "");
}

async function main(): Promise<void> {
  const {
    tag: tagArg,
    strategiesDir,
    bundlesDir,
    outFile: outFileArg,
    skipBundle,
  } = parseCli(process.argv);
  const releaseTag = tagArg ?? (await fetchLatestReleaseTag());
  const parsedAt = new Date().toISOString().slice(0, 10);
  const outFile =
    outFileArg ?? buildStrategiesFilePath(strategiesDir, releaseTag);
  const bundleFile = buildBundleFilePath(bundlesDir, releaseTag);

  console.log(`Источник: ${REPO}@${releaseTag}`);
  console.log(`Дата парсинга: ${parsedAt}`);

  const batFiles = await listGeneralBatFiles(releaseTag);
  if (batFiles.length === 0) {
    throw new Error("Файлы general*.bat не найдены");
  }

  const document: StrategiesDocument = {
    source: REPO,
    parsedAt,
    release: releaseTag,
    strategies: [],
  };

  for (const batFile of batFiles) {
    const content = await fetchBatFile(releaseTag, batFile);
    const parsed = parseBatFilters(content);
    const title = strategyBaseName(batFile);
    document.strategies.push(toStrategyEntry(title, parsed));
    console.log(`  ${title}`);
  }

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(document, null, 2) + "\n", "utf8");
  console.log(`\nСтратегии: ${batFiles.length} → ${outFile}`);

  if (!skipBundle) {
    const binNames = await buildBundleTarXz(releaseTag, bundleFile);
    console.log(`Бандл: ${binNames.length} bin → ${bundleFile}`);
    console.log(`  ${binNames.join(", ")}`);
  }

  const indexPath = await updateStrategiesIndex(
    strategiesDir,
    createVersionIndexEntry(releaseTag, parsedAt, document.strategies.length),
  );
  console.log(`Индекс: ${indexPath}`);
}

function formatError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause =
    error.cause instanceof Error
      ? error.cause.message
      : error.cause != null
        ? String(error.cause)
        : null;
  return cause ? `${error.message} (${cause})` : error.message;
}

main().catch((error: unknown) => {
  console.error(formatError(error));
  process.exit(1);
});
