// Move Quest — Spark's Journey: a cartoon world-map campaign.
//
// A tall serpentine path through six hand-drawn SVG zones. Every completed
// quest moves Spark one step; finishing the map starts a new lap.

const NS = "http://www.w3.org/2000/svg";

export const JOURNEY_ZONES = [
  { name: "Sunny Meadows", emoji: "🌻" },
  { name: "Lava Volcano", emoji: "🌋" },
  { name: "Deep Sea", emoji: "🐠" },
  { name: "Crystal Mountains", emoji: "💎" },
  { name: "Outer Space", emoji: "🪐" },
  { name: "Rainbow Castle", emoji: "🏰" },
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

const PAINTERS = [paintMeadow, paintVolcano, paintSea, paintMountains, paintSpace, paintCastle];

// --- Public renderer ---------------------------------------------------------

export function renderJourneyMap(container, totalJourney) {
  const step = totalJourney % TOTAL_STEPS;
  const lap = Math.floor(totalJourney / TOTAL_STEPS) + 1;

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", "aria-hidden": "true" });
  const defs = el("defs", {});
  grad(defs, "g-meadow", [["0", "#bae6fd"], ["0.45", "#d9f99d"], ["1", "#86efac"]]);
  grad(defs, "g-volcano", [["0", "#fed7aa"], ["1", "#fb923c"]]);
  grad(defs, "g-sea", [["0", "#bae6fd"], ["1", "#3b82f6"]]);
  grad(defs, "g-mountains", [["0", "#ede9fe"], ["1", "#a78bfa"]]);
  grad(defs, "g-space", [["0", "#1e1b4b"], ["1", "#4c1d95"]]);
  grad(defs, "g-castle", [["0", "#fdf2f8"], ["1", "#fbcfe8"]]);
  svg.appendChild(defs);

  // Zones stack bottom-up: meadow at the bottom of the map, castle on top.
  PAINTERS.forEach((paint, zoneIdx) => {
    paint(svg, H - (zoneIdx + 1) * ZONE_H);
  });

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
    const plate = el("g", {});
    plate.appendChild(el("rect", {
      x: W / 2 - 84, y: top + 8, width: 168, height: 26, rx: 13,
      fill: "rgba(255,255,255,0.85)",
    }));
    plate.appendChild(el("text", {
      x: W / 2, y: top + 26, "text-anchor": "middle", "font-size": 15,
      "font-weight": "bold", fill: "#3b0764",
      "font-family": "inherit",
    }, `${zone.emoji} ${zone.name}`));
    svg.appendChild(plate);
  });

  // Step nodes
  points.forEach(([x, y], i) => {
    const done = i < step;
    const current = i === step;
    if (current) {
      svg.appendChild(el("circle", { cx: x, cy: y, r: 17, fill: "rgba(236,72,153,0.35)", class: "journey-pulse" }));
      const token = el("g", { class: "journey-node journey-current" });
      token.appendChild(el("circle", { cx: x, cy: y, r: 12, fill: "#8b5cf6", stroke: "#fff", "stroke-width": 3 }));
      token.appendChild(el("path", { d: `M ${x - 3.5} ${y - 14} L ${x} ${y - 8} L ${x + 3.5} ${y - 14} Z`, fill: "#fde68a" }));
      token.appendChild(el("circle", { cx: x - 3.5, cy: y - 2, r: 1.7, fill: "#3b0764" }));
      token.appendChild(el("circle", { cx: x + 3.5, cy: y - 2, r: 1.7, fill: "#3b0764" }));
      token.appendChild(el("path", { d: `M ${x - 3.5} ${y + 3} Q ${x} ${y + 6.5} ${x + 3.5} ${y + 3}`, stroke: "#3b0764", "stroke-width": 1.6, fill: "none", "stroke-linecap": "round" }));
      svg.appendChild(token);
    } else {
      svg.appendChild(el("circle", {
        cx: x, cy: y, r: 7.5, class: "journey-node",
        fill: done ? "#ec4899" : "#ffffff",
        stroke: done ? "#be185d" : "#c4b5fd", "stroke-width": 2.5,
      }));
    }
  });

  // Lap flag at the castle gate
  emoji(svg, points[TOTAL_STEPS - 1][0] + 26, points[TOTAL_STEPS - 1][1] + 6, 20, "🚩");

  container.textContent = "";
  container.appendChild(svg);

  // Scroll so Spark's token sits mid-view.
  requestAnimationFrame(() => {
    const scale = container.scrollHeight / H;
    container.scrollTop = points[step][1] * scale - container.clientHeight / 2;
  });

  return { step, lap, zone: zoneForStep(step) };
}
