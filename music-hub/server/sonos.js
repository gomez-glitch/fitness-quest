// Sonos control over the local network — no dependencies.
//
// Discovery: SSDP multicast M-SEARCH for ZonePlayer devices.
// Topology:  ZoneGroupTopology#GetZoneGroupState on any player.
// Control:   SOAP over http://<player>:1400 (AVTransport, RenderingControl,
//            GroupRenderingControl).
// Spotify:   x-sonos-spotify: URIs with DIDL-Lite metadata. Requires the
//            household to have Spotify linked in the official Sonos app once;
//            the service id/serial are configurable (SONOS_SPOTIFY_SID/SN).

const dgram = require("dgram");
const http = require("http");

const SSDP_ADDR = "239.255.255.250";
const SSDP_PORT = 1900;
const SEARCH_TARGET = "urn:schemas-upnp-org:device:ZonePlayer:1";

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

function xmlUnescape(s) {
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Parse the ZoneGroupState XML (already unescaped) into groups + players.
function parseZoneGroupState(xml) {
  const groups = [];
  const groupRe = /<ZoneGroup\s+([^>]*)>([\s\S]*?)<\/ZoneGroup>/g;
  const attrRe = /(\w+)="([^"]*)"/g;
  let g;
  while ((g = groupRe.exec(xml))) {
    const gAttrs = {};
    let a;
    while ((a = attrRe.exec(g[1]))) gAttrs[a[1]] = xmlUnescape(a[2]);
    const members = [];
    const memberRe = /<ZoneGroupMember\s+([^>]*?)\/?>/g;
    let m;
    while ((m = memberRe.exec(g[2]))) {
      const mAttrs = {};
      let ma;
      const mAttrRe = /(\w+)="([^"]*)"/g;
      while ((ma = mAttrRe.exec(m[1]))) mAttrs[ma[1]] = xmlUnescape(ma[2]);
      if (mAttrs.Invisible === "1") continue; // Sub/surround units
      const ipMatch = /https?:\/\/([\d.]+):/.exec(mAttrs.Location || "");
      members.push({
        id: mAttrs.UUID,
        name: mAttrs.ZoneName || "Unknown",
        ip: ipMatch ? ipMatch[1] : null,
      });
    }
    if (!members.length) continue;
    const coordinator =
      members.find((mm) => mm.id === gAttrs.Coordinator) || members[0];
    groups.push({
      id: gAttrs.ID || coordinator.id,
      coordinatorId: coordinator.id,
      coordinatorIp: coordinator.ip,
      name:
        members.length > 1
          ? `${coordinator.name} + ${members.length - 1}`
          : coordinator.name,
      members,
    });
  }
  return groups;
}

// Build the x-sonos-spotify URI for a spotify track uri like
// "spotify:track:4uLU6hMCjMI75M1A2tKUQC".
function spotifyTrackUri(spotifyUri, sid, sn) {
  const enc = encodeURIComponent(spotifyUri); // colons -> %3A
  return `x-sonos-spotify:${enc}?sid=${sid}&flags=8224&sn=${sn}`;
}

// DIDL-Lite metadata Sonos needs alongside the URI so it can resolve the
// track through its linked Spotify service account.
function spotifyDidl(spotifyUri, title, sid) {
  const id = spotifyUri.replace(/:/g, "%3a");
  const token = `SA_RINCON${sid}_X_#Svc${sid}-0-Token`;
  return (
    '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
    'xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" ' +
    'xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" ' +
    'xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">' +
    `<item id="00032020${id}" restricted="true">` +
    `<dc:title>${xmlEscape(title || "")}</dc:title>` +
    "<upnp:class>object.item.audioItem.musicTrack</upnp:class>" +
    '<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">' +
    `${token}</desc></item></DIDL-Lite>`
  );
}

function parseSoapValue(xml, tag) {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? xmlUnescape(m[1]) : null;
}

// hh:mm:ss -> seconds
function clockToSeconds(t) {
  if (!t || !/^\d+:\d+:\d+/.test(t)) return 0;
  const [h, m, s] = t.split(":").map((x) => parseInt(x, 10));
  return h * 3600 + m * 60 + s;
}

// ---------------------------------------------------------------------------
// SOAP transport
// ---------------------------------------------------------------------------

const SERVICES = {
  AVTransport: {
    path: "/MediaRenderer/AVTransport/Control",
    urn: "urn:schemas-upnp-org:service:AVTransport:1",
  },
  RenderingControl: {
    path: "/MediaRenderer/RenderingControl/Control",
    urn: "urn:schemas-upnp-org:service:RenderingControl:1",
  },
  GroupRenderingControl: {
    path: "/MediaRenderer/GroupRenderingControl/Control",
    urn: "urn:schemas-upnp-org:service:GroupRenderingControl:1",
  },
  ZoneGroupTopology: {
    path: "/ZoneGroupTopology/Control",
    urn: "urn:schemas-upnp-org:service:ZoneGroupTopology:1",
  },
};

function soapRequest(ip, service, action, argsXml = "") {
  const svc = SERVICES[service];
  const body =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ' +
    's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>' +
    `<u:${action} xmlns:u="${svc.urn}">${argsXml}</u:${action}>` +
    "</s:Body></s:Envelope>";
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: ip,
        port: 1400,
        path: svc.path,
        method: "POST",
        timeout: 5000,
        headers: {
          "Content-Type": 'text/xml; charset="utf-8"',
          SOAPACTION: `"${svc.urn}#${action}"`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            const code = parseSoapValue(data, "errorCode");
            reject(
              new Error(`Sonos ${action} failed (${res.statusCode}${code ? `, UPnP ${code}` : ""})`)
            );
          } else resolve(data);
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error(`Sonos ${action} timed out`)));
    req.on("error", reject);
    req.end(body);
  });
}

const instance = '<InstanceID>0</InstanceID>';

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

class SonosSystem {
  constructor(opts = {}) {
    this.sid = opts.sid || 2311;
    this.sn = opts.sn || 1;
    this.groups = [];
    this.playerByIdMap = new Map();
    this.lastDiscovery = 0;
  }

  playerById(id) {
    return this.playerByIdMap.get(id) || null;
  }

  groupById(id) {
    return (
      this.groups.find((g) => g.id === id || g.coordinatorId === id) || null
    );
  }

  // SSDP discovery — returns a list of player IPs (may be just one; topology
  // fills in the rest).
  discoverIps(timeoutMs = 2500) {
    return new Promise((resolve) => {
      const socket = dgram.createSocket("udp4");
      const found = new Set();
      const msg = Buffer.from(
        "M-SEARCH * HTTP/1.1\r\n" +
          `HOST: ${SSDP_ADDR}:${SSDP_PORT}\r\n` +
          'MAN: "ssdp:discover"\r\n' +
          "MX: 1\r\n" +
          `ST: ${SEARCH_TARGET}\r\n\r\n`
      );
      socket.on("message", (buf, rinfo) => {
        if (buf.toString().includes("Sonos")) found.add(rinfo.address);
      });
      socket.on("error", () => finish());
      const finish = () => {
        clearTimeout(timer);
        try {
          socket.close();
        } catch (_) {}
        resolve([...found]);
      };
      const timer = setTimeout(finish, timeoutMs);
      socket.bind(() => {
        for (let i = 0; i < 3; i++) {
          socket.send(msg, SSDP_PORT, SSDP_ADDR, () => {});
        }
      });
    });
  }

  async refreshTopology() {
    let ips = this.groups
      .flatMap((g) => g.members.map((m) => m.ip))
      .filter(Boolean);
    if (!ips.length) ips = await this.discoverIps();
    if (process.env.SONOS_IP) ips.unshift(process.env.SONOS_IP);
    let lastErr = null;
    for (const ip of ips) {
      try {
        const res = await soapRequest(ip, "ZoneGroupTopology", "GetZoneGroupState");
        const state = parseSoapValue(res, "ZoneGroupState");
        this.groups = parseZoneGroupState(state || "");
        this.playerByIdMap = new Map();
        for (const g of this.groups)
          for (const m of g.members) this.playerByIdMap.set(m.id, m);
        this.lastDiscovery = Date.now();
        return this.groups;
      } catch (err) {
        lastErr = err;
      }
    }
    this.groups = [];
    if (lastErr) throw lastErr;
    return this.groups;
  }

  async playSpotify(groupId, spotifyUri, title) {
    const g = this.groupById(groupId);
    if (!g) throw new Error("Unknown group");
    const uri = spotifyTrackUri(spotifyUri, this.sid, this.sn);
    const meta = spotifyDidl(spotifyUri, title, this.sid);
    await soapRequest(
      g.coordinatorIp,
      "AVTransport",
      "SetAVTransportURI",
      `${instance}<CurrentURI>${xmlEscape(uri)}</CurrentURI>` +
        `<CurrentURIMetaData>${xmlEscape(meta)}</CurrentURIMetaData>`
    );
    await this.transport(groupId, "Play");
  }

  async transport(groupId, action) {
    const g = this.groupById(groupId);
    if (!g) throw new Error("Unknown group");
    const args =
      action === "Play" ? `${instance}<Speed>1</Speed>` : instance;
    await soapRequest(g.coordinatorIp, "AVTransport", action, args);
  }

  async state(groupId) {
    const g = this.groupById(groupId);
    if (!g) throw new Error("Unknown group");
    const [tInfo, pInfo] = await Promise.all([
      soapRequest(g.coordinatorIp, "AVTransport", "GetTransportInfo", instance),
      soapRequest(g.coordinatorIp, "AVTransport", "GetPositionInfo", instance),
    ]);
    const meta = parseSoapValue(pInfo, "TrackMetaData") || "";
    const volumes = {};
    await Promise.all(
      g.members.map(async (m) => {
        try {
          const v = await soapRequest(
            m.ip,
            "RenderingControl",
            "GetVolume",
            `${instance}<Channel>Master</Channel>`
          );
          volumes[m.id] = parseInt(parseSoapValue(v, "CurrentVolume"), 10);
        } catch (_) {
          volumes[m.id] = null;
        }
      })
    );
    return {
      groupId: g.id,
      playing: parseSoapValue(tInfo, "CurrentTransportState") === "PLAYING",
      title: parseSoapValue(meta, "dc:title"),
      artist: parseSoapValue(meta, "dc:creator"),
      album: parseSoapValue(meta, "upnp:album"),
      positionSec: clockToSeconds(parseSoapValue(pInfo, "RelTime")),
      durationSec: clockToSeconds(parseSoapValue(pInfo, "TrackDuration")),
      volumes,
    };
  }

  async setVolume(playerId, volume) {
    const p = this.playerById(playerId);
    if (!p) throw new Error("Unknown player");
    const v = Math.max(0, Math.min(100, Math.round(volume)));
    await soapRequest(
      p.ip,
      "RenderingControl",
      "SetVolume",
      `${instance}<Channel>Master</Channel><DesiredVolume>${v}</DesiredVolume>`
    );
  }

  async setGroupVolume(groupId, volume) {
    const g = this.groupById(groupId);
    if (!g) throw new Error("Unknown group");
    const v = Math.max(0, Math.min(100, Math.round(volume)));
    await soapRequest(
      g.coordinatorIp,
      "GroupRenderingControl",
      "SetGroupVolume",
      `${instance}<DesiredVolume>${v}</DesiredVolume>`
    );
  }

  // Join `playerId` to the group led by `coordinatorId`.
  async join(playerId, coordinatorId) {
    const p = this.playerById(playerId);
    if (!p) throw new Error("Unknown player");
    await soapRequest(
      p.ip,
      "AVTransport",
      "SetAVTransportURI",
      `${instance}<CurrentURI>x-rincon:${coordinatorId}</CurrentURI>` +
        "<CurrentURIMetaData></CurrentURIMetaData>"
    );
    await this.refreshTopology();
  }

  async unjoin(playerId) {
    const p = this.playerById(playerId);
    if (!p) throw new Error("Unknown player");
    await soapRequest(
      p.ip,
      "AVTransport",
      "BecomeCoordinatorOfStandaloneGroup",
      instance
    );
    await this.refreshTopology();
  }
}

module.exports = {
  SonosSystem,
  parseZoneGroupState,
  spotifyTrackUri,
  spotifyDidl,
  parseSoapValue,
  clockToSeconds,
  xmlEscape,
  xmlUnescape,
};
