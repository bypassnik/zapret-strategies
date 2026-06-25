export const REPO = "Flowseal/zapret-discord-youtube";
export const RAW_BASE = `https://raw.githubusercontent.com/${REPO}`;
export const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;

export const FAKE_BIN_PATH = "/opt/zapret/files/fake/";

/** Порты game filter при режиме all в service.bat (load_game_filter). */
export const GAME_FILTER_PORTS = "1024-65535";

/** Строки фильтров, которые извлекаем из general*.bat (начало сегмента). */
export const FILTER_PREFIXES = {
  udpGeneral: '--filter-udp=443 --hostlist="%LISTS%list-general.txt"',
  udpDiscord:
    "--filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun",
  tcpDiscord:
    "--filter-tcp=2053,2083,2087,2096,8443 --hostlist-domains=discord.media",
  tcpGeneral: '--filter-tcp=80,443 --hostlist="%LISTS%list-general.txt"',
  tcpGoogle: '--filter-tcp=443 --hostlist="%LISTS%list-google.txt"',
  tcpGames: "--filter-tcp=%GameFilterTCP%",
  udpGames: "--filter-udp=%GameFilterUDP%",
} as const;

export type FilterKind = keyof typeof FILTER_PREFIXES;
