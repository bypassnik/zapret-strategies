import assert from "node:assert/strict";

import { parseBatFilters, splitWinwsSegments, toStrategyEntry } from "./transform.js";

const altSample = `start "zapret" /min "%BIN%winws.exe" --wf-tcp=80,443 ^
--filter-udp=443 --hostlist="%LISTS%list-general.txt" --hostlist="%LISTS%list-general-user.txt" --hostlist-exclude="%LISTS%list-exclude.txt" --ipset-exclude="%LISTS%ipset-exclude.txt" --dpi-desync=fake --dpi-desync-repeats=6 --dpi-desync-fake-quic="%BIN%quic_initial_www_google_com.bin" --new ^
--filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --dpi-desync=fake --dpi-desync-fake-discord="%BIN%quic_initial_dbankcloud_ru.bin" --dpi-desync-fake-stun="%BIN%quic_initial_dbankcloud_ru.bin" --dpi-desync-repeats=6 --new ^
--filter-tcp=2053,2083,2087,2096,8443 --hostlist-domains=discord.media --dpi-desync=fake,fakedsplit --dpi-desync-repeats=6 --dpi-desync-fooling=ts --dpi-desync-fakedsplit-pattern=0x00 --dpi-desync-fake-tls="%BIN%tls_clienthello_www_google_com.bin" --new ^
--filter-tcp=443 --hostlist="%LISTS%list-google.txt" --ip-id=zero --dpi-desync=fake,fakedsplit --dpi-desync-fake-tls="%BIN%tls_clienthello_www_google_com.bin" --new ^
--filter-tcp=80,443 --hostlist="%LISTS%list-general.txt" --hostlist="%LISTS%list-general-user.txt" --hostlist-exclude="%LISTS%list-exclude.txt" --ipset-exclude="%LISTS%ipset-exclude.txt" --dpi-desync=fake,fakedsplit --dpi-desync-fake-tls="%BIN%stun.bin" --new ^
--filter-tcp=%GameFilterTCP% --ipset="%LISTS%ipset-all.txt" --ipset-exclude="%LISTS%ipset-exclude.txt" --ipset-exclude="%LISTS%ipset-exclude-user.txt" --dpi-desync=fake,fakedsplit --dpi-desync-repeats=6 --dpi-desync-any-protocol=1 --dpi-desync-cutoff=n4 --dpi-desync-fooling=ts --dpi-desync-fakedsplit-pattern=0x00 --dpi-desync-fake-tls="%BIN%stun.bin" --dpi-desync-fake-tls="%BIN%tls_clienthello_www_google_com.bin" --dpi-desync-fake-http="%BIN%tls_clienthello_max_ru.bin" --new ^
--filter-udp=%GameFilterUDP% --ipset="%LISTS%ipset-all.txt" --ipset-exclude="%LISTS%ipset-exclude.txt" --ipset-exclude="%LISTS%ipset-exclude-user.txt" --dpi-desync=fake --dpi-desync-repeats=12 --dpi-desync-any-protocol=1 --dpi-desync-fake-unknown-udp="%BIN%quic_initial_dbankcloud_ru.bin" --dpi-desync-cutoff=n3`;

const segments = splitWinwsSegments(altSample);
assert.equal(segments.length, 7);

const parsed = parseBatFilters(altSample);
assert.ok(parsed.udpGeneral?.includes("--filter-udp=443"));
assert.ok(parsed.udpGeneral?.includes("/opt/zapret/files/fake/quic"));
assert.ok(
  parsed.udpGeneral?.includes(
    "--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin",
  ),
);
assert.ok(!parsed.udpGeneral?.includes('"/opt/zapret'));
assert.ok(!parsed.udpGeneral?.includes("hostlist"));
assert.ok(!parsed.udpGeneral?.includes("ipset"));
assert.ok(parsed.tcpGeneral?.includes("stun.bin"));
assert.ok(parsed.tcpGoogle?.includes("list-google") === false);
assert.ok(parsed.tcpGoogle?.includes("--filter-tcp=443"));

assert.ok(parsed.udpDiscord?.includes("--filter-l7=discord,stun"));
assert.ok(
  parsed.udpDiscord?.includes(
    "--dpi-desync-fake-discord=/opt/zapret/files/fake/quic_initial_dbankcloud_ru.bin",
  ),
);
assert.ok(
  parsed.udpDiscord?.includes(
    "--dpi-desync-fake-stun=/opt/zapret/files/fake/quic_initial_dbankcloud_ru.bin",
  ),
);
assert.ok(!parsed.tcpDiscord?.includes("hostlist"));
assert.ok(parsed.tcpDiscord?.includes("--filter-tcp=2053,2083,2087,2096,8443"));

assert.ok(parsed.tcpGames?.includes("--filter-tcp=1024-65535"));
assert.ok(parsed.tcpGames?.includes("--dpi-desync-any-protocol=1"));
assert.ok(parsed.tcpGames?.includes("--dpi-desync-cutoff=n4"));
assert.ok(!parsed.tcpGames?.includes("ipset"));
assert.ok(!parsed.tcpGames?.includes("GameFilter"));

assert.ok(parsed.udpGames?.includes("--filter-udp=1024-65535"));
assert.ok(
  parsed.udpGames?.includes(
    "--dpi-desync-fake-unknown-udp=/opt/zapret/files/fake/quic_initial_dbankcloud_ru.bin",
  ),
);
assert.ok(parsed.udpGames?.includes("--dpi-desync-cutoff=n3"));
assert.ok(!parsed.udpGames?.includes("GameFilter"));

const entry = toStrategyEntry("general (ALT)", parsed);
assert.equal(entry.title, "general (ALT)");
assert.equal(entry.general?.tcp, parsed.tcpGeneral);
assert.equal(entry.general?.udp, parsed.udpGeneral);
assert.equal(entry.discord?.tcp, parsed.tcpDiscord);
assert.equal(entry.discord?.udp, parsed.udpDiscord);
assert.equal(entry.youtube?.tcp, parsed.tcpGoogle);
assert.equal(entry.games?.tcp, parsed.tcpGames);
assert.equal(entry.games?.udp, parsed.udpGames);

console.log("transform tests ok");
