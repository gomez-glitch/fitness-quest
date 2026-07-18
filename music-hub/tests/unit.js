// Soundstage unit tests — pure logic, no network, no browser.
// Usage: node tests/unit.js

const {
  parseZoneGroupState,
  spotifyTrackUri,
  spotifyDidl,
  parseSoapValue,
  clockToSeconds,
  xmlEscape,
} = require("../server/sonos");
const { pkcePair } = require("../server/spotify");
const { DemoBackend } = require("../server/demo");

const failures = [];
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  ok - ${name}`);
  } else {
    failures.push(name);
    console.error(`  FAIL - ${name}${detail ? ` (${detail})` : ""}`);
  }
}

// ---------------------------------------------------------------------------
console.log("zone topology parsing");

// Shape of a real (unescaped) ZoneGroupState payload: two groups, one with a
// joined member and an invisible Sub unit.
const TOPOLOGY = `
<ZoneGroupState><ZoneGroups>
<ZoneGroup Coordinator="RINCON_AAA" ID="RINCON_AAA:123">
  <ZoneGroupMember UUID="RINCON_AAA" Location="http://192.168.1.50:1400/xml/device_description.xml" ZoneName="Living Room"/>
  <ZoneGroupMember UUID="RINCON_BBB" Location="http://192.168.1.51:1400/xml/device_description.xml" ZoneName="Kitchen"/>
  <ZoneGroupMember UUID="RINCON_SUB" Location="http://192.168.1.52:1400/xml/device_description.xml" ZoneName="Living Room (Sub)" Invisible="1"/>
</ZoneGroup>
<ZoneGroup Coordinator="RINCON_CCC" ID="RINCON_CCC:9">
  <ZoneGroupMember UUID="RINCON_CCC" Location="http://192.168.1.60:1400/xml/device_description.xml" ZoneName="Office &amp; Den"/>
</ZoneGroup>
</ZoneGroups></ZoneGroupState>`;

const groups = parseZoneGroupState(TOPOLOGY);
check("parses two groups", groups.length === 2, `got ${groups.length}`);
check("first group has 2 visible members", groups[0].members.length === 2);
check("invisible sub unit skipped", !groups[0].members.some((m) => m.id === "RINCON_SUB"));
check("coordinator resolved", groups[0].coordinatorId === "RINCON_AAA");
check("coordinator ip extracted", groups[0].coordinatorIp === "192.168.1.50");
check("grouped name summarised", groups[0].name === "Living Room + 1");
check("solo group named after room", groups[1].name === "Office & Den");
check("entity unescaped in names", groups[1].members[0].name === "Office & Den");

// ---------------------------------------------------------------------------
console.log("sonos spotify uri + metadata");

const uri = spotifyTrackUri("spotify:track:4uLU6hMCjMI75M1A2tKUQC", 2311, 3);
check(
  "x-sonos-spotify uri encodes colons",
  uri === "x-sonos-spotify:spotify%3Atrack%3A4uLU6hMCjMI75M1A2tKUQC?sid=2311&flags=8224&sn=3",
  uri
);

const didl = spotifyDidl("spotify:track:abc", 'Rock & "Roll" <Live>', 2311);
check("didl carries service token", didl.includes("SA_RINCON2311_X_#Svc2311-0-Token"));
check("didl escapes title", didl.includes("Rock &amp; &quot;Roll&quot; &lt;Live&gt;"));
check("didl item id uses lowercase-escaped uri", didl.includes('id="00032020spotify%3atrack%3aabc"'));

// ---------------------------------------------------------------------------
console.log("soap + time helpers");

check(
  "parseSoapValue extracts tag",
  parseSoapValue("<a><CurrentTransportState>PLAYING</CurrentTransportState></a>", "CurrentTransportState") === "PLAYING"
);
check(
  "parseSoapValue unescapes entities",
  parseSoapValue("<x><dc:title>A &amp; B</dc:title></x>", "dc:title") === "A & B"
);
check("parseSoapValue misses cleanly", parseSoapValue("<a></a>", "Nope") === null);
check("clock 0:03:25 -> 205", clockToSeconds("0:03:25") === 205);
check("clock 1:00:01 -> 3601", clockToSeconds("1:00:01") === 3601);
check("clock NOT_IMPLEMENTED -> 0", clockToSeconds("NOT_IMPLEMENTED") === 0);
check("xmlEscape round trip", xmlEscape('<&"') === "&lt;&amp;&quot;");

// ---------------------------------------------------------------------------
console.log("spotify pkce");

const { verifier, challenge } = pkcePair();
check("verifier is base64url", /^[A-Za-z0-9_-]{43,128}$/.test(verifier), verifier);
check("challenge is base64url, no padding", /^[A-Za-z0-9_-]{43}$/.test(challenge), challenge);
check("fresh pair differs", pkcePair().verifier !== verifier);

// ---------------------------------------------------------------------------
console.log("demo backend state machine");

const demo = new DemoBackend();
const zones0 = demo.zones();
check("demo starts with 4 groups (living+kitchen joined)", zones0.length === 4);
const living = zones0.find((g) => g.coordinatorId === "RINCON_DEMO_LIVING");
check("living group has kitchen", living.members.some((m) => m.name === "Kitchen"));
check("living group named with +1", living.name === "Living Room + 1");

const shelves = demo.shelves();
check("demo has curated + personal shelves", shelves.mine.length >= 3 && shelves.curated.length >= 3);
const firstTrack = demo.playlistTracks(shelves.curated[0].id)[0];
check("demo tracks have spotify uris", firstTrack.uri.startsWith("spotify:track:"));

demo.playSpotify(living.id, firstTrack.uri, firstTrack.name);
let st = demo.state(living.id);
check("play starts the track", st.playing && st.title === firstTrack.name);
check("state exposes per-player volumes", st.volumes.RINCON_DEMO_KITCHEN === 28);

demo.transport(living.id, "Pause");
st = demo.state(living.id);
check("pause stops advancement", !st.playing);
demo.transport(living.id, "Next");
st = demo.state(living.id);
check("next moves to a new track and resumes", st.playing && st.title !== firstTrack.name);

demo.setVolume("RINCON_DEMO_KITCHEN", 150);
check("volume clamps to 100", demo.state(living.id).volumes.RINCON_DEMO_KITCHEN === 100);
demo.setVolume("RINCON_DEMO_KITCHEN", 30);

demo.join("RINCON_DEMO_OFFICE", "RINCON_DEMO_LIVING");
const zonesJoined = demo.zones();
check("join shrinks group count", zonesJoined.length === 3);
check(
  "office now in living group",
  zonesJoined
    .find((g) => g.coordinatorId === "RINCON_DEMO_LIVING")
    .members.some((m) => m.id === "RINCON_DEMO_OFFICE")
);

// Joining a player that is itself a member of a group follows to the coordinator.
demo.join("RINCON_DEMO_PATIO", "RINCON_DEMO_KITCHEN");
check(
  "join via member lands on coordinator",
  demo
    .zones()
    .find((g) => g.coordinatorId === "RINCON_DEMO_LIVING")
    .members.some((m) => m.id === "RINCON_DEMO_PATIO")
);

demo.unjoin("RINCON_DEMO_LIVING");
const zonesSplit = demo.zones();
check(
  "unjoining the coordinator releases followers",
  zonesSplit.every((g) => g.members.length === 1),
  JSON.stringify(zonesSplit.map((g) => g.name))
);

demo.setGroupVolume(zonesSplit[0].id, 50);
check("group volume applies to solo group", demo.state(zonesSplit[0].id).volumes[zonesSplit[0].coordinatorId] === 50);

check("unknown playlist throws", (() => { try { demo.playlistTracks("nope"); return false; } catch (_) { return true; } })());
check("unknown group throws", (() => { try { demo.state("nope"); return false; } catch (_) { return true; } })());

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures.length}/${checks} checks passed`);
if (failures.length) {
  console.error(`Failed: ${failures.join(", ")}`);
  process.exit(1);
}
