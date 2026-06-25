import {
  FAKE_BIN_PATH,
  FILTER_PREFIXES,
  GAME_FILTER_PORTS,
  type FilterKind,
} from "./constants.js";

/** --hostlist*, --ipset* (файлы и домены задают отдельно в конфиге zapret) */
const HOSTLIST_OR_IPSET = /\s+--(?:hostlist|ipset)(?:=\S+|-\S+)/g;

/** Склеивает продолжения bat (^) и делит аргументы winws.exe по --new. */
export function splitWinwsSegments(batContent: string): string[] {
  const winwsMatch = batContent.match(/winws\.exe"\s+([\s\S]*)/i);
  if (!winwsMatch) {
    return [];
  }

  const flattened = winwsMatch[1]
    .replace(/\r?\n/g, " ")
    .replace(/\^\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return flattened
    .split(/\s+--new\s*/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** Извлекает блок аргументов от известного префикса до --new или конца строки. */
export function extractFilterByPrefix(
  flattenedArgs: string,
  kind: FilterKind,
): string | null {
  const prefix = FILTER_PREFIXES[kind];
  const start = flattenedArgs.indexOf(prefix);
  if (start === -1) {
    return null;
  }

  const tail = flattenedArgs.slice(start);
  const endMatch = tail.match(/\s+--new(?:\s|$)/i);
  const segment = endMatch ? tail.slice(0, endMatch.index) : tail;
  return segment.trim();
}

/** Убирает hostlist/ipset, подставляет путь fake-файлов Linux (без кавычек). */
export function transformSegment(segment: string): string {
  let line = segment
    .replace(/%GameFilterTCP%/g, GAME_FILTER_PORTS)
    .replace(/%GameFilterUDP%/g, GAME_FILTER_PORTS);
  line = line.replace(HOSTLIST_OR_IPSET, "");
  line = line.replace(/"%BIN%([^"]+)"/g, `${FAKE_BIN_PATH}$1`);
  line = line.replace(/%BIN%([^\s"]+)/g, `${FAKE_BIN_PATH}$1`);
  line = line.replace(
    new RegExp(`"(${FAKE_BIN_PATH.replace(/\//g, "\\/")}[^"]+)"`, "g"),
    "$1",
  );
  return line.replace(/\s+/g, " ").trim();
}

export interface ParsedStrategy {
  tcpGeneral: string | null;
  udpGeneral: string | null;
  tcpGoogle: string | null;
  tcpDiscord: string | null;
  udpDiscord: string | null;
  tcpGames: string | null;
  udpGames: string | null;
}

export function flattenWinwsArgs(batContent: string): string | null {
  const winwsMatch = batContent.match(/winws\.exe"\s+([\s\S]*)/i);
  if (!winwsMatch) {
    return null;
  }

  return winwsMatch[1]
    .replace(/\r?\n/g, " ")
    .replace(/\^\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseBatFilters(batContent: string): ParsedStrategy {
  const flattened = flattenWinwsArgs(batContent);
  if (!flattened) {
    return {
      tcpGeneral: null,
      udpGeneral: null,
      tcpGoogle: null,
      tcpDiscord: null,
      udpDiscord: null,
      tcpGames: null,
      udpGames: null,
    };
  }

  const kinds: FilterKind[] = [
    "udpGeneral",
    "udpDiscord",
    "tcpDiscord",
    "tcpGoogle",
    "tcpGeneral",
    "tcpGames",
    "udpGames",
  ];
  const extracted: Partial<Record<FilterKind, string>> = {};

  for (const kind of kinds) {
    const raw = extractFilterByPrefix(flattened, kind);
    if (raw) {
      extracted[kind] = transformSegment(raw);
    }
  }

  return {
    tcpGeneral: extracted.tcpGeneral ?? null,
    udpGeneral: extracted.udpGeneral ?? null,
    tcpGoogle: extracted.tcpGoogle ?? null,
    tcpDiscord: extracted.tcpDiscord ?? null,
    udpDiscord: extracted.udpDiscord ?? null,
    tcpGames: extracted.tcpGames ?? null,
    udpGames: extracted.udpGames ?? null,
  };
}

export interface StrategyEntry {
  title: string;
  general?: { tcp?: string; udp?: string };
  discord?: { tcp?: string; udp?: string };
  youtube?: { tcp?: string };
  games?: { tcp?: string; udp?: string };
}

export function toStrategyEntry(
  title: string,
  parsed: ParsedStrategy,
): StrategyEntry {
  const entry: StrategyEntry = { title };

  if (parsed.tcpGeneral || parsed.udpGeneral) {
    entry.general = {};
    if (parsed.tcpGeneral) {
      entry.general.tcp = parsed.tcpGeneral;
    }
    if (parsed.udpGeneral) {
      entry.general.udp = parsed.udpGeneral;
    }
  }

  if (parsed.tcpDiscord || parsed.udpDiscord) {
    entry.discord = {};
    if (parsed.tcpDiscord) {
      entry.discord.tcp = parsed.tcpDiscord;
    }
    if (parsed.udpDiscord) {
      entry.discord.udp = parsed.udpDiscord;
    }
  }

  if (parsed.tcpGoogle) {
    entry.youtube = { tcp: parsed.tcpGoogle };
  }

  if (parsed.tcpGames || parsed.udpGames) {
    entry.games = {};
    if (parsed.tcpGames) {
      entry.games.tcp = parsed.tcpGames;
    }
    if (parsed.udpGames) {
      entry.games.udp = parsed.udpGames;
    }
  }

  return entry;
}

export interface StrategiesDocument {
  source: string;
  parsedAt: string;
  release: string;
  strategies: StrategyEntry[];
}
