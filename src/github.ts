import { RAW_BASE, RELEASES_API, REPO } from "./constants.js";

interface GitHubTreeResponse {
  tree: Array<{ path: string; type: string }>;
}

interface GitHubRelease {
  tag_name: string;
}

export async function fetchLatestReleaseTag(): Promise<string> {
  const response = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(
      `Не удалось получить релиз ${REPO}: HTTP ${response.status}`,
    );
  }
  const data = (await response.json()) as GitHubRelease;
  return data.tag_name;
}

export async function listGeneralBatFiles(ref: string): Promise<string[]> {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`Не удалось получить дерево репозитория: HTTP ${response.status}`);
  }
  const data = (await response.json()) as GitHubTreeResponse;
  return data.tree
    .filter(
      (entry) =>
        entry.type === "blob" &&
        /^general.*\.bat$/i.test(entry.path) &&
        !entry.path.includes("/"),
    )
    .map((entry) => entry.path)
    .sort((a, b) => a.localeCompare(b, "en"));
}

export async function fetchBatFile(
  ref: string,
  filename: string,
): Promise<string> {
  return fetchRawText(ref, filename);
}

export async function listBinFiles(ref: string): Promise<string[]> {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`Не удалось получить дерево репозитория: HTTP ${response.status}`);
  }
  const data = (await response.json()) as GitHubTreeResponse;
  return data.tree
    .filter(
      (entry) =>
        entry.type === "blob" &&
        /^bin\/[^/]+\.bin$/i.test(entry.path),
    )
    .map((entry) => entry.path)
    .sort((a, b) => a.localeCompare(b, "en"));
}

function buildRawUrl(ref: string, filePath: string): string {
  const segments = filePath.split("/").map((segment) => encodeURIComponent(segment));
  return `${RAW_BASE}/${encodeURIComponent(ref)}/${segments.join("/")}`;
}

export async function fetchRawText(ref: string, filePath: string): Promise<string> {
  const response = await fetch(buildRawUrl(ref, filePath));
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${filePath}: HTTP ${response.status}`);
  }
  return response.text();
}

export async function fetchRawBinary(
  ref: string,
  filePath: string,
): Promise<Buffer> {
  const response = await fetch(buildRawUrl(ref, filePath));
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${filePath}: HTTP ${response.status}`);
  }
  const data = await response.arrayBuffer();
  return Buffer.from(data);
}
