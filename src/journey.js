// Move Quest — Spark's Journey: a cartoon world-map campaign.
//
// A tall serpentine path through painted zones (hand-drawn SVG underneath as
// the fallback). Every completed quest moves Spark one step; finishing the
// map starts a new lap. Zones arrive in content drops (docs/BACKLOG.md);
// app.js migrates heroes when the map grows, see migrateMap().

const NS = "http://www.w3.org/2000/svg";

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const JOURNEY_ZONES = [
  { name: "Sunny Meadows", emoji: "🌻", cheer: "Smell those flowers!" },
  { name: "Lava Volcano", emoji: "🌋", cheer: "Feel that toasty glow!" },
  { name: "Deep Sea", emoji: "🐠", cheer: "Bubbles everywhere!" },
  { name: "Crystal Mountains", emoji: "💎", cheer: "Look how high we are!" },
  { name: "Outer Space", emoji: "🪐", cheer: "Zero gravity, here we go!" },
  { name: "Rainbow Castle", emoji: "🏰", cheer: "We made it to the castle!" },
  // Drop A, "Beneath the Castle"
  { name: "Glow Crystal Caves", emoji: "🔮", cheer: "The crystals are glowing just for us!" },
  { name: "Dino Jungle", emoji: "🦕", cheer: "Look, giant dino footprints!" },
  { name: "Bubblegum Canyon", emoji: "🍭", cheer: "Everything here is pink and bouncy!" },
  // Drop E, "Fun Day Out" (the kids' own picks)
  { name: "Puppy Land", emoji: "🐶", cheer: "Woof woof! Who wants to play fetch?" },
  { name: "Splash Water Park", emoji: "💦", cheer: "Splash! Last one down the slide is a soggy noodle!" },
];

export const STEPS_PER_ZONE = 6;
export const TOTAL_STEPS = JOURNEY_ZONES.length * STEPS_PER_ZONE;

const W = 360;
const ZONE_H = 240;
const H = ZONE_H * JOURNEY_ZONES.length;

export function zoneForStep(step) {
  return JOURNEY_ZONES[Math.floor((step % TOTAL_STEPS) / STEPS_PER_ZONE)];
}

// Node i sits low on the map for small i (the journey climbs upward).
function nodePos(i) {
  const y = H - ((i + 0.5) * H) / TOTAL_STEPS;
  const x = W / 2 + 105 * Math.sin(i * 0.85 + 0.6);
  return [x, y];
}

const PLATE_W = 168;

// A zone's last node always lands at its name plate's height (top + 20,
// inside the plate's top + 8 .. top + 34 band), so a centred plate gets
// covered wherever the path swings near the middle ("Outer ◯pace"). Keep the
// plate centred when that's clear; otherwise slide it to the nearest gap
// beside the node (and, on the final zone, beside the lap flag).
function plateX(zoneIdx) {
  const GAP = 6, PAD = 8;
  const [nx] = nodePos((zoneIdx + 1) * STEPS_PER_ZONE - 1);
  const blocked = [[nx - 7.5 - GAP, nx + 7.5 + GAP]];
  if (zoneIdx === JOURNEY_ZONES.length - 1) {
    blocked.push([nx + 26 - 12 - GAP, nx + 26 + 12 + GAP]); // lap flag
  }
  const clear = (x) => blocked.every(([a, b]) => x + PLATE_W <= a || x >= b);
  const centred = W / 2 - PLATE_W / 2;
  if (clear(centred)) return centred;
  const options = blocked
    .flatMap(([a, b]) => [b, a - PLATE_W])
    .filter((x) => x >= PAD && x + PLATE_W <= W - PAD && clear(x));
  if (!options.length) return centred;
  return options.reduce((best, x) =>
    (Math.abs(x - centred) < Math.abs(best - centred) ? x : best));
}

function el(tag, attrs, text) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function grad(defs, id, stops, vertical = true) {
  const g = el("linearGradient", vertical
    ? { id, x1: 0, y1: 0, x2: 0, y2: 1 }
    : { id, x1: 0, y1: 0, x2: 1, y2: 0 });
  stops.forEach(([offset, color]) => g.appendChild(el("stop", { offset, "stop-color": color })));
  defs.appendChild(g);
}

function emoji(svg, x, y, size, char) {
  svg.appendChild(el("text", { x, y, "font-size": size, "text-anchor": "middle" }, char));
}

// --- Zone scenery painters (zoneTop = y of the zone's upper edge) -----------

function paintMeadow(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-meadow)" }));
  svg.appendChild(el("circle", { cx: 310, cy: top + 45, r: 26, fill: "#fde047" }));
  svg.appendChild(el("ellipse", { cx: 70, cy: top + 240, rx: 150, ry: 55, fill: "#4ade80" }));
  svg.appendChild(el("ellipse", { cx: 300, cy: top + 250, rx: 170, ry: 65, fill: "#22c55e" }));
  emoji(svg, 40, top + 100, 26, "🌳");
  emoji(svg, 320, top + 150, 22, "🦋");
  emoji(svg, 120, top + 205, 20, "🌼");
  emoji(svg, 250, top + 185, 20, "🌷");
}

function paintVolcano(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-volcano)" }));
  svg.appendChild(el("path", { d: `M 30 ${top + 235} L 120 ${top + 60} L 210 ${top + 235} Z`, fill: "#7c2d12" }));
  svg.appendChild(el("path", { d: `M 98 ${top + 62} q 22 -14 44 0 l -8 26 q -14 8 -28 0 Z`, fill: "#ef4444" }));
  svg.appendChild(el("path", { d: `M 112 ${top + 84} q 8 40 -6 80`, stroke: "#f97316", "stroke-width": 9, fill: "none", "stroke-linecap": "round" }));
  svg.appendChild(el("circle", { cx: 130, cy: top + 34, r: 13, fill: "#e7e5e4", opacity: 0.85 }));
  svg.appendChild(el("circle", { cx: 152, cy: top + 22, r: 9, fill: "#e7e5e4", opacity: 0.7 }));
  emoji(svg, 300, top + 200, 24, "🦖");
  emoji(svg, 265, top + 90, 20, "🔥");
}

function paintSea(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-sea)" }));
  for (let i = 0; i < 3; i++) {
    svg.appendChild(el("path", {
      d: `M 0 ${top + 50 + i * 70} q 45 -18 90 0 t 90 0 t 90 0 t 90 0`,
      stroke: "rgba(255,255,255,0.5)", "stroke-width": 5, fill: "none", "stroke-linecap": "round",
    }));
  }
  svg.appendChild(el("circle", { cx: 60, cy: top + 150, r: 5, fill: "rgba(255,255,255,0.6)" }));
  svg.appendChild(el("circle", { cx: 74, cy: top + 128, r: 3.5, fill: "rgba(255,255,255,0.5)" }));
  emoji(svg, 300, top + 120, 24, "🐙");
  emoji(svg, 70, top + 200, 22, "🐠");
  emoji(svg, 200, top + 65, 20, "🐬");
}

function paintMountains(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-mountains)" }));
  svg.appendChild(el("path", { d: `M -10 ${top + 240} L 90 ${top + 70} L 190 ${top + 240} Z`, fill: "#7c3aed" }));
  svg.appendChild(el("path", { d: `M 74 ${top + 98} L 90 ${top + 70} L 106 ${top + 98} q -16 10 -32 0 Z`, fill: "#f5f3ff" }));
  svg.appendChild(el("path", { d: `M 160 ${top + 240} L 270 ${top + 40} L 375 ${top + 240} Z`, fill: "#5b21b6" }));
  svg.appendChild(el("path", { d: `M 250 ${top + 78} L 270 ${top + 40} L 290 ${top + 78} q -20 12 -40 0 Z`, fill: "#f5f3ff" }));
  emoji(svg, 60, top + 190, 22, "💎");
  emoji(svg, 320, top + 120, 20, "🦅");
}

function paintSpace(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-space)" }));
  for (let i = 0; i < 22; i++) {
    const sx = (i * 73) % W;
    const sy = top + ((i * 41) % (ZONE_H - 20)) + 10;
    svg.appendChild(el("circle", { cx: sx, cy: sy, r: i % 3 === 0 ? 2 : 1.2, fill: "#fef9c3", opacity: 0.9 }));
  }
  svg.appendChild(el("circle", { cx: 80, cy: top + 80, r: 26, fill: "#fb923c" }));
  svg.appendChild(el("ellipse", { cx: 80, cy: top + 84, rx: 42, ry: 9, fill: "none", stroke: "#fde68a", "stroke-width": 4 }));
  emoji(svg, 290, top + 170, 26, "🚀");
  emoji(svg, 200, top + 60, 18, "🛸");
}

function paintCastle(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-castle)" }));
  const rainbow = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7"];
  rainbow.forEach((c, i) => {
    svg.appendChild(el("path", {
      d: `M 40 ${top + 200} A ${140 - i * 12} ${140 - i * 12} 0 0 1 320 ${top + 200}`,
      stroke: c, "stroke-width": 10, fill: "none", opacity: 0.9,
    }));
  });
  const cx = 180;
  svg.appendChild(el("rect", { x: cx - 55, y: top + 130, width: 110, height: 80, rx: 6, fill: "#f9a8d4" }));
  svg.appendChild(el("rect", { x: cx - 80, y: top + 105, width: 34, height: 105, rx: 6, fill: "#f472b6" }));
  svg.appendChild(el("rect", { x: cx + 46, y: top + 105, width: 34, height: 105, rx: 6, fill: "#f472b6" }));
  svg.appendChild(el("path", { d: `M ${cx - 80} ${top + 105} l 17 -26 l 17 26 Z`, fill: "#be185d" }));
  svg.appendChild(el("path", { d: `M ${cx + 46} ${top + 105} l 17 -26 l 17 26 Z`, fill: "#be185d" }));
  svg.appendChild(el("rect", { x: cx - 14, y: top + 165, width: 28, height: 45, rx: 12, fill: "#831843" }));
  emoji(svg, 60, top + 70, 22, "✨");
  emoji(svg, 305, top + 90, 22, "🎉");
}

function paintCaves(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-caves)" }));
  // Rock walls framing the sides, a shaft of light from above
  svg.appendChild(el("path", { d: `M 0 ${top} L 70 ${top} Q 40 ${top + 120} 85 ${top + 240} L 0 ${top + 240} Z`, fill: "#a78bfa" }));
  svg.appendChild(el("path", { d: `M 360 ${top} L 295 ${top} Q 325 ${top + 120} 280 ${top + 240} L 360 ${top + 240} Z`, fill: "#a78bfa" }));
  svg.appendChild(el("path", { d: `M 150 ${top} L 210 ${top} L 250 ${top + 200} L 110 ${top + 200} Z`, fill: "rgba(254, 249, 195, 0.35)" }));
  emoji(svg, 40, top + 110, 24, "💎");
  emoji(svg, 318, top + 160, 22, "🔮");
  emoji(svg, 90, top + 215, 20, "🍄");
  emoji(svg, 270, top + 220, 18, "✨");
}

function paintJungle(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-jungle)" }));
  svg.appendChild(el("path", { d: `M 210 ${top + 120} L 255 ${top + 55} L 300 ${top + 120} Z`, fill: "#c4b5fd" }));
  svg.appendChild(el("circle", { cx: 262, cy: top + 42, r: 9, fill: "#f5f5f4", opacity: 0.8 }));
  svg.appendChild(el("ellipse", { cx: 180, cy: top + 245, rx: 220, ry: 70, fill: "#4ade80" }));
  svg.appendChild(el("path", { d: `M 140 ${top + 240} Q 180 ${top + 180} 230 ${top + 150}`, stroke: "#d6a77a", "stroke-width": 22, fill: "none", "stroke-linecap": "round" }));
  emoji(svg, 40, top + 120, 28, "🌿");
  emoji(svg, 320, top + 200, 24, "🌴");
  emoji(svg, 90, top + 200, 22, "🦕");
  emoji(svg, 200, top + 200, 16, "🐾");
}

function paintCanyon(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-canyon)" }));
  const stripes = ["#f9a8d4", "#ddd6fe", "#fbcfe8", "#c4b5fd"];
  [[0, 95], [270, 90]].forEach(([x, w]) => {
    stripes.forEach((c, i) => {
      svg.appendChild(el("rect", { x, y: top + 70 + i * 42, width: w, height: 42, fill: c }));
    });
  });
  svg.appendChild(el("path", { d: `M 150 ${top + 240} Q 200 ${top + 190} 165 ${top + 150} T 190 ${top + 90}`, stroke: "#f472b6", "stroke-width": 16, fill: "none", "stroke-linecap": "round" }));
  emoji(svg, 48, top + 60, 26, "🍭");
  emoji(svg, 315, top + 58, 24, "🍬");
  emoji(svg, 230, top + 120, 18, "🫧");
}

function paintPuppy(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-puppy)" }));
  svg.appendChild(el("ellipse", { cx: 180, cy: top + 250, rx: 230, ry: 90, fill: "#bef264" }));
  // A doghouse on each side
  [[22, "#a78bfa"], [282, "#f472b6"]].forEach(([x, roof]) => {
    svg.appendChild(el("rect", { x, y: top + 110, width: 56, height: 46, rx: 4, fill: "#fff7ed" }));
    svg.appendChild(el("path", { d: `M ${x - 6} ${top + 112} L ${x + 28} ${top + 82} L ${x + 62} ${top + 112} Z`, fill: roof }));
    svg.appendChild(el("rect", { x: x + 18, y: top + 128, width: 20, height: 28, rx: 10, fill: "#7c3aed", opacity: 0.6 }));
  });
  emoji(svg, 60, top + 205, 26, "🐶");
  emoji(svg, 300, top + 210, 24, "🐕");
  emoji(svg, 120, top + 225, 18, "🎾");
  emoji(svg, 240, top + 120, 18, "🦴");
}

function paintWaterPark(svg, top) {
  svg.appendChild(el("rect", { x: 0, y: top, width: W, height: ZONE_H, fill: "url(#g-waterpark)" }));
  svg.appendChild(el("ellipse", { cx: 180, cy: top + 230, rx: 240, ry: 75, fill: "#5eead4" }));
  // Twisting slides down each side
  svg.appendChild(el("path", { d: `M 10 ${top + 40} C 110 ${top + 60} -10 ${top + 120} 90 ${top + 170}`, stroke: "#f472b6", "stroke-width": 14, fill: "none", "stroke-linecap": "round" }));
  svg.appendChild(el("path", { d: `M 350 ${top + 50} C 250 ${top + 70} 370 ${top + 130} 270 ${top + 180}`, stroke: "#facc15", "stroke-width": 14, fill: "none", "stroke-linecap": "round" }));
  emoji(svg, 120, top + 215, 22, "🛟");
  emoji(svg, 250, top + 220, 20, "💦");
  emoji(svg, 40, top + 205, 22, "🌴");
}

const PAINTERS = [
  paintMeadow, paintVolcano, paintSea, paintMountains, paintSpace, paintCastle,
  paintCaves, paintJungle, paintCanyon,
  paintPuppy, paintWaterPark,
];

// Painted zone art (see docs/ART.md), layered over each zone's SVG scenery.
// Files are 1080x720 WebP — exactly 3x the 360x240 zone, so crisp on retina.
// A zone listed as null keeps its SVG. If a listed file fails to load
// (offline before its first view, say), SVG <image> renders nothing and the
// hand-drawn scenery underneath shows through — a fallback with no JS.
const ZONE_ART = [
  "art/zone-1-meadow.webp",
  "art/zone-2-volcano.webp",
  "art/zone-3-sea.webp",
  "art/zone-4-mountains.webp",
  "art/zone-5-space.webp",
  "art/zone-6-castle.webp",
  "art/zone-7-caves.webp",
  "art/zone-8-jungle.webp",
  "art/zone-9-canyon.webp",
  "art/zone-10-puppy.webp",
  "art/zone-11-waterpark.webp",
];

function paintZone(svg, zoneIdx, top) {
  // A nested <svg> clips to its own box, so scenery that reaches past the zone
  // edge (a hill, a river's round cap) can't spill over the painting next door.
  // Its viewBox keeps the outer map's coordinates, so painters need no change.
  const zone = el("svg", {
    x: 0, y: top, width: W, height: ZONE_H, viewBox: `0 ${top} ${W} ${ZONE_H}`, class: "zone",
  });
  svg.appendChild(zone);
  PAINTERS[zoneIdx](zone, top);
  const art = ZONE_ART[zoneIdx];
  if (art) {
    // The painting sits outside the clip and overlaps each edge by 1 unit:
    // clipped edges anti-alias, and a half-covered row would let the scenery
    // underneath show through as a hairline (a green one under Dino Jungle).
    svg.appendChild(el("image", {
      href: art, x: 0, y: top - 1, width: W, height: ZONE_H + 2,
      preserveAspectRatio: "xMidYMid slice", class: "zone-art",
    }));
  }
}

// --- Public renderer ---------------------------------------------------------

// A single zone's scenery as a standalone card (used by the Discovery screen).
export function renderZoneCard(container, zoneIdx) {
  const svg = el("svg", { viewBox: `0 0 ${W} ${ZONE_H}`, width: "100%", "aria-hidden": "true" });
  const defs = el("defs", {});
  // Unique gradient ids: the map's own defs may sit inside a display:none
  // tab, and paint servers in non-rendered subtrees don't paint.
  addGradients(defs, "card-");
  svg.appendChild(defs);
  paintZone(svg, Math.max(0, Math.min(PAINTERS.length - 1, zoneIdx)), 0);
  svg.querySelectorAll("[fill^='url(#g-']").forEach((node) => {
    node.setAttribute("fill", node.getAttribute("fill").replace("url(#g-", "url(#card-g-"));
  });
  container.textContent = "";
  container.appendChild(svg);
}

function addGradients(defs, prefix = "") {
  grad(defs, `${prefix}g-meadow`, [["0", "#bae6fd"], ["0.45", "#d9f99d"], ["1", "#86efac"]]);
  grad(defs, `${prefix}g-volcano`, [["0", "#fed7aa"], ["1", "#fb923c"]]);
  grad(defs, `${prefix}g-sea`, [["0", "#bae6fd"], ["1", "#3b82f6"]]);
  grad(defs, `${prefix}g-mountains`, [["0", "#ede9fe"], ["1", "#a78bfa"]]);
  grad(defs, `${prefix}g-space`, [["0", "#1e1b4b"], ["1", "#4c1d95"]]);
  grad(defs, `${prefix}g-castle`, [["0", "#fdf2f8"], ["1", "#fbcfe8"]]);
  grad(defs, `${prefix}g-caves`, [["0", "#f5d0fe"], ["1", "#ddd6fe"]]);
  grad(defs, `${prefix}g-jungle`, [["0", "#fef9c3"], ["1", "#bbf7d0"]]);
  grad(defs, `${prefix}g-canyon`, [["0", "#ffedd5"], ["1", "#fbcfe8"]]);
  grad(defs, `${prefix}g-puppy`, [["0", "#ede9fe"], ["1", "#ecfccb"]]);
  grad(defs, `${prefix}g-waterpark`, [["0", "#ede9fe"], ["1", "#a5f3fc"]]);
}

function buildToken(x, y) {
  const outer = el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
  outer.appendChild(el("circle", { cx: 0, cy: 0, r: 17, fill: "rgba(236,72,153,0.35)", class: "journey-pulse" }));
  const inner = el("g", { class: "journey-token" });
  inner.appendChild(el("circle", { cx: 0, cy: 0, r: 12, fill: "#8b5cf6", stroke: "#fff", "stroke-width": 3 }));
  inner.appendChild(el("path", { d: "M -3.5 -14 L 0 -8 L 3.5 -14 Z", fill: "#fde68a" }));
  inner.appendChild(el("circle", { cx: -3.5, cy: -2, r: 1.7, fill: "#3b0764" }));
  inner.appendChild(el("circle", { cx: 3.5, cy: -2, r: 1.7, fill: "#3b0764" }));
  inner.appendChild(el("path", { d: "M -3.5 3 Q 0 6.5 3.5 3", stroke: "#3b0764", "stroke-width": 1.6, fill: "none", "stroke-linecap": "round" }));
  outer.appendChild(inner);
  return { outer, inner };
}

// opts.animateFrom: earlier total-journey value — Spark hops node-to-node from
// there to the current position (max ~8 hops, same lap). opts.onHop fires per
// landing, opts.onDone at the end.
export function renderJourneyMap(container, totalJourney, opts = {}) {
  const step = totalJourney % TOTAL_STEPS;
  const lap = Math.floor(totalJourney / TOTAL_STEPS) + 1;

  let fromStep = step;
  if (
    !REDUCED_MOTION &&
    typeof opts.animateFrom === "number" &&
    opts.animateFrom < totalJourney
  ) {
    const lapStart = Math.floor(totalJourney / TOTAL_STEPS) * TOTAL_STEPS;
    const from = Math.max(opts.animateFrom, lapStart, totalJourney - 8);
    fromStep = from % TOTAL_STEPS;
  }
  const animating = fromStep < step;

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", "aria-hidden": "true" });
  const defs = el("defs", {});
  addGradients(defs);
  svg.appendChild(defs);

  // Zones stack bottom-up: meadow at the bottom of the map, castle on top.
  PAINTERS.forEach((_, zoneIdx) => paintZone(svg, zoneIdx, H - (zoneIdx + 1) * ZONE_H));

  // Soft cloud bands feather the hard seams between zone backgrounds.
  for (let z = 1; z < PAINTERS.length; z++) {
    const y = H - z * ZONE_H;
    svg.appendChild(el("path", {
      d: `M 0 ${y + 12} Q ${W * 0.12} ${y - 10} ${W * 0.28} ${y + 4} ` +
         `Q ${W * 0.42} ${y + 16} ${W * 0.55} ${y + 2} ` +
         `Q ${W * 0.7} ${y - 12} ${W * 0.84} ${y + 6} ` +
         `Q ${W * 0.93} ${y + 16} ${W} ${y + 4} ` +
         `L ${W} ${y + 22} Q ${W * 0.7} ${y + 32} ${W * 0.45} ${y + 22} ` +
         `Q ${W * 0.2} ${y + 14} 0 ${y + 26} Z`,
      fill: "rgba(255, 255, 255, 0.5)",
    }));
  }

  // The winding path
  const points = [];
  for (let i = 0; i < TOTAL_STEPS; i++) points.push(nodePos(i));
  svg.appendChild(el("polyline", {
    points: points.map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(" "),
    fill: "none", stroke: "rgba(255,255,255,0.75)", "stroke-width": 10,
    "stroke-linecap": "round", "stroke-linejoin": "round",
  }));
  svg.appendChild(el("polyline", {
    points: points.map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(" "),
    fill: "none", stroke: "#7c3aed", "stroke-width": 3.5,
    "stroke-dasharray": "2 10", "stroke-linecap": "round", "stroke-linejoin": "round",
  }));

  // Zone name plates
  JOURNEY_ZONES.forEach((zone, zoneIdx) => {
    const top = H - (zoneIdx + 1) * ZONE_H;
    const px = plateX(zoneIdx);
    const plate = el("g", { class: "zone-plate" });
    plate.appendChild(el("rect", {
      x: px, y: top + 8, width: PLATE_W, height: 26, rx: 13,
      fill: "rgba(255,255,255,0.85)",
    }));
    plate.appendChild(el("text", {
      x: px + PLATE_W / 2, y: top + 26, "text-anchor": "middle", "font-size": 15,
      "font-weight": "bold", fill: "#3b0764",
      "font-family": "inherit",
    }, `${zone.emoji} ${zone.name}`));
    svg.appendChild(plate);
  });

  // Step nodes (all plain circles; the token rides on top)
  const nodeEls = [];
  points.forEach(([x, y], i) => {
    const done = i < fromStep;
    const node = el("circle", {
      cx: x, cy: y, r: 7.5, class: "journey-node",
      fill: done ? "#ec4899" : "#ffffff",
      stroke: done ? "#be185d" : "#c4b5fd", "stroke-width": 2.5,
    });
    nodeEls.push(node);
    svg.appendChild(node);
  });

  // Lap flag at the castle gate
  emoji(svg, points[TOTAL_STEPS - 1][0] + 26, points[TOTAL_STEPS - 1][1] + 6, 20, "🚩");

  // Spark token
  const [sx, sy] = points[fromStep];
  const token = buildToken(sx, sy);
  svg.appendChild(token.outer);

  container.textContent = "";
  container.appendChild(svg);

  function scrollToY(y, smooth) {
    const scale = container.scrollHeight / H;
    const target = y * scale - container.clientHeight / 2;
    if (smooth && !REDUCED_MOTION) container.scrollTo({ top: target, behavior: "smooth" });
    else container.scrollTop = target;
  }

  requestAnimationFrame(() => scrollToY(points[fromStep][1], false));

  if (animating) {
    const HOP_MS = 420;
    let hop = 0;
    let start = null;
    const totalHops = step - fromStep;

    function frame(ts) {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / HOP_MS);
      const a = points[fromStep + hop];
      const b = points[fromStep + hop + 1];
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * 16;
      token.outer.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);

      if (t >= 1) {
        // landed: mark the node we arrived on, puff some dust
        const landed = nodeEls[fromStep + hop + 1];
        if (landed) {
          landed.setAttribute("fill", "#ec4899");
          landed.setAttribute("stroke", "#be185d");
        }
        const dust = el("circle", { cx: b[0], cy: b[1] + 8, r: 6, fill: "rgba(255,255,255,0.85)", class: "hop-dust" });
        svg.appendChild(dust);
        setTimeout(() => dust.remove(), 550);
        scrollToY(b[1], true);
        if (opts.onHop) opts.onHop(fromStep + hop + 1);

        hop += 1;
        start = null;
        if (hop >= totalHops) {
          token.inner.classList.add("token-wiggle");
          if (opts.onDone) opts.onDone();
          return;
        }
      }
      requestAnimationFrame(frame);
    }
    setTimeout(() => requestAnimationFrame(frame), 350);
  }

  return { step, lap, zone: zoneForStep(step), animating };
}
