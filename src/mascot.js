// Move Quest — Spark, the articulated mascot.
//
// Spark is a small SVG figure with real shoulder/elbow/hip/knee joints,
// posed by forward kinematics from per-exercise keyframed joint angles,
// so each animation demonstrates the actual movement of the exercise.
//
// Angle conventions (degrees, world space):
//   torso / neck : 0 = straight up, positive leans toward the figure's front
//   limbs        : 0 = straight down, positive swings toward the figure's front
//                  (in front view, positive = outward from the body's midline)
//   elbow bend   : positive = natural flexion (forearm swings forward/up)
//   knee bend    : positive = natural flexion (heel swings behind the thigh)
//   ankle        : positive = heel raise (tiptoe)

const NS = "http://www.w3.org/2000/svg";
const GROUND = 106;

const LEN = {
  torso: 26,
  neckHead: 14, // neck length + head radius
  headR: 10,
  upperArm: 13,
  forearm: 12,
  thigh: 15,
  shin: 14,
  foot: 8,
};

const COLORS = {
  head: "#8b5cf6",
  torso: "#ec4899",
  near: "#7c3aed",
  far: "#5b21b6",
  emblem: "#fde68a",
  shoe: "#ffffff",
  shoeShade: "#ddd6fe",
  face: "#3b0764",
  weight: "#64748b",
  chair: "#c4b5fd",
  shadow: "rgba(91, 33, 182, 0.15)",
};

const rad = (d) => (d * Math.PI) / 180;
// 0 = straight up, positive tilts toward +x
const vecUp = (d) => [Math.sin(rad(d)), -Math.cos(rad(d))];
// 0 = straight down, positive swings toward +x
const vecDown = (d) => [Math.sin(rad(d)), Math.cos(rad(d))];
// front view: s = -1 for left limbs, +1 for right; positive angle = outward
const vecOut = (d, s) => [s * Math.sin(rad(d)), Math.cos(rad(d))];

const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Motion library. Each motion: view, duration (ms), poster (t for static
// preview), base pose + keyframes overriding it. Limb arrays:
//   arms a1/a2 (side: near/far, front: left/right) = [shoulder, elbow]
//   legs l1/l2 = [hip, knee, ankle?]
// ---------------------------------------------------------------------------

const SIDE_BASE = {
  x: 60, y: 75, torso: 3, neck: 0,
  a1: [10, 8], a2: [16, 10],
  l1: [1, 3, 0], l2: [3, 5, 0],
};

const FRONT_BASE = {
  x: 60, y: 75, torso: 0, neck: 0,
  a1: [8, 4], a2: [8, 4],
  l1: [6, 1, 0], l2: [6, 1, 0],
};

export const MOTIONS = {
  "sit-ups": {
    view: "side", duration: 2600, poster: 0.45,
    base: { ...SIDE_BASE, x: 54, y: 96, l1: [112, 97, 0], l2: [107, 94, 0] },
    frames: [
      { t: 0, torso: -88, neck: 24, a1: [-152, 66], a2: [-146, 62] },
      { t: 0.45, torso: -26, neck: 4, a1: [-14, 104], a2: [-8, 100] },
      { t: 0.58, torso: -26, neck: 4, a1: [-14, 104], a2: [-8, 100] },
      { t: 1, torso: -88, neck: 24, a1: [-152, 66], a2: [-146, 62] },
    ],
  },

  "push-ups": {
    view: "side", duration: 2200, poster: 0.5,
    base: {
      ...SIDE_BASE, x: 50, torso: 80, neck: 4,
      l1: [-94, 4, -55], l2: [-97, 6, -55],
    },
    frames: [
      { t: 0, y: 84, a1: [-4, 8], a2: [-8, 10] },
      { t: 0.5, y: 91, a1: [-40, 72], a2: [-44, 76] },
      { t: 1, y: 84, a1: [-4, 8], a2: [-8, 10] },
    ],
  },

  "side-lunges": {
    view: "front", duration: 2800, poster: 0.25,
    base: { ...FRONT_BASE },
    frames: [
      { t: 0, x: 60, y: 75, a1: [12, 6], a2: [12, 6], l1: [6, 1, 0], l2: [6, 1, 0] },
      { t: 0.25, x: 52, y: 82, a1: [42, 12], a2: [42, 12], l1: [48, 40, 0], l2: [36, 0, 0] },
      { t: 0.5, x: 60, y: 75, a1: [12, 6], a2: [12, 6], l1: [6, 1, 0], l2: [6, 1, 0] },
      { t: 0.75, x: 68, y: 82, a1: [42, 12], a2: [42, 12], l1: [36, 0, 0], l2: [48, 40, 0] },
      { t: 1, x: 60, y: 75, a1: [12, 6], a2: [12, 6], l1: [6, 1, 0], l2: [6, 1, 0] },
    ],
  },

  "flutter-kicks": {
    view: "side", duration: 900, poster: 0,
    base: {
      ...SIDE_BASE, x: 56, y: 96, torso: -82, neck: 34,
      a1: [97, 4], a2: [93, 4],
    },
    frames: [
      { t: 0, l1: [97, 5, 20], l2: [74, 5, 20] },
      { t: 0.5, l1: [74, 5, 20], l2: [97, 5, 20] },
      { t: 1, l1: [97, 5, 20], l2: [74, 5, 20] },
    ],
  },

  "chair-dips": {
    view: "side", duration: 2400, poster: 0.5, prop: "chair",
    base: {
      ...SIDE_BASE, x: 58, neck: 6,
      l1: [68, 16, -18], l2: [64, 14, -18],
    },
    frames: [
      { t: 0, y: 85, torso: -6, a1: [-34, 16], a2: [-38, 18] },
      { t: 0.5, y: 92, torso: 0, a1: [-56, 58], a2: [-60, 62] },
      { t: 1, y: 85, torso: -6, a1: [-34, 16], a2: [-38, 18] },
    ],
  },

  "oblique-raises": {
    view: "front", duration: 2600, poster: 0,
    base: { ...FRONT_BASE },
    frames: [
      { t: 0, torso: -18, neck: 8, a1: [10, 4], a2: [166, 20] },
      { t: 0.5, torso: 18, neck: -8, a1: [166, 20], a2: [10, 4] },
      { t: 1, torso: -18, neck: 8, a1: [10, 4], a2: [166, 20] },
    ],
  },

  "russian-twists": {
    view: "side", duration: 1700, poster: 0,
    base: {
      ...SIDE_BASE, x: 56, y: 90, torso: -34, neck: 30,
      l1: [100, 38, 25], l2: [96, 36, 25],
    },
    frames: [
      { t: 0, a1: [70, 10], a2: [36, 10], torso: -30 },
      { t: 0.5, a1: [36, 10], a2: [70, 10], torso: -38 },
      { t: 1, a1: [70, 10], a2: [36, 10], torso: -30 },
    ],
  },

  "weight-curls": {
    view: "side", duration: 2200, poster: 0.5, weights: true,
    base: { ...SIDE_BASE, torso: 1 },
    frames: [
      { t: 0, a1: [4, 14], a2: [8, 16] },
      { t: 0.5, a1: [4, 136], a2: [8, 132] },
      { t: 1, a1: [4, 14], a2: [8, 16] },
    ],
  },

  "overhead-press": {
    view: "front", duration: 2400, poster: 0.5, weights: true,
    base: { ...FRONT_BASE },
    frames: [
      { t: 0, a1: [94, 86], a2: [94, 86], y: 75, l1: [6, 2, 0], l2: [6, 2, 0] },
      { t: 0.5, a1: [154, 24], a2: [154, 24], y: 73, l1: [6, 6, 0], l2: [6, 6, 0] },
      { t: 1, a1: [94, 86], a2: [94, 86], y: 75, l1: [6, 2, 0], l2: [6, 2, 0] },
    ],
  },

  "squats": {
    view: "side", duration: 2400, poster: 0.5,
    base: { ...SIDE_BASE },
    frames: [
      { t: 0, x: 60, y: 75, torso: 4, neck: 0, a1: [14, 8], a2: [18, 10], l1: [2, 4, 0], l2: [4, 6, 0] },
      { t: 0.5, x: 55, y: 86, torso: 36, neck: -26, a1: [72, 6], a2: [76, 8], l1: [86, 96, 0], l2: [82, 92, 0] },
      { t: 1, x: 60, y: 75, torso: 4, neck: 0, a1: [14, 8], a2: [18, 10], l1: [2, 4, 0], l2: [4, 6, 0] },
    ],
  },

  "jumping-jacks": {
    view: "front", duration: 900, poster: 0.5,
    base: { ...FRONT_BASE },
    frames: [
      { t: 0, y: 76, a1: [8, 4], a2: [8, 4], l1: [4, 2, 0], l2: [4, 2, 0] },
      { t: 0.5, y: 71, a1: [166, 6], a2: [166, 6], l1: [28, 2, 0], l2: [28, 2, 0] },
      { t: 1, y: 76, a1: [8, 4], a2: [8, 4], l1: [4, 2, 0], l2: [4, 2, 0] },
    ],
  },

  "high-knees": {
    view: "side", duration: 800, poster: 0,
    base: { ...SIDE_BASE, y: 74, torso: 6, neck: -4 },
    frames: [
      { t: 0, l1: [86, 100, 0], l2: [-10, 10, 15], a1: [-34, 70], a2: [42, 70] },
      { t: 0.5, l1: [-10, 10, 15], l2: [86, 100, 0], a1: [42, 70], a2: [-34, 70] },
      { t: 1, l1: [86, 100, 0], l2: [-10, 10, 15], a1: [-34, 70], a2: [42, 70] },
    ],
  },

  "mountain-climbers": {
    view: "side", duration: 800, poster: 0,
    base: {
      ...SIDE_BASE, x: 52, y: 86, torso: 78, neck: 4,
      a1: [-4, 8], a2: [-8, 10],
    },
    frames: [
      { t: 0, l1: [64, 118, 0], l2: [-95, 6, -55] },
      { t: 0.5, l1: [-95, 6, -55], l2: [64, 118, 0] },
      { t: 1, l1: [64, 118, 0], l2: [-95, 6, -55] },
    ],
  },

  "glute-bridge": {
    view: "side", duration: 2600, poster: 0.5,
    base: {
      ...SIDE_BASE, x: 58, neck: 34,
      a1: [96, 4], a2: [92, 4],
    },
    frames: [
      { t: 0, y: 96, torso: -90, l1: [108, 98, 0], l2: [104, 95, 0] },
      { t: 0.5, y: 85, torso: -112, l1: [93, 87, 0], l2: [90, 84, 0] },
      { t: 1, y: 96, torso: -90, l1: [108, 98, 0], l2: [104, 95, 0] },
    ],
  },

  "superman": {
    view: "side", duration: 2800, poster: 0.5,
    base: { ...SIDE_BASE, x: 56 },
    frames: [
      { t: 0, y: 99, torso: 88, neck: 6, a1: [95, 4], a2: [99, 6], l1: [-91, 3, -80], l2: [-94, 4, -80] },
      { t: 0.5, y: 96, torso: 80, neck: 28, a1: [120, 6], a2: [124, 8], l1: [-115, 8, -80], l2: [-118, 9, -80] },
      { t: 1, y: 99, torso: 88, neck: 6, a1: [95, 4], a2: [99, 6], l1: [-91, 3, -80], l2: [-94, 4, -80] },
    ],
  },

  "calf-raises": {
    view: "side", duration: 2000, poster: 0.5,
    base: { ...SIDE_BASE, torso: 2, a1: [10, 6], a2: [14, 8] },
    frames: [
      { t: 0, y: 75, l1: [1, 3, 0], l2: [3, 4, 0] },
      { t: 0.5, y: 70, l1: [1, 3, 34], l2: [3, 4, 34] },
      { t: 1, y: 75, l1: [1, 3, 0], l2: [3, 4, 0] },
    ],
  },

  "marching": {
    view: "side", duration: 1000, poster: 0,
    base: { ...SIDE_BASE, y: 74, torso: 4, neck: -2 },
    frames: [
      { t: 0, l1: [52, 78, 0], l2: [-6, 8, 10], a1: [-22, 55], a2: [26, 55] },
      { t: 0.5, l1: [-6, 8, 10], l2: [52, 78, 0], a1: [26, 55], a2: [-22, 55] },
      { t: 1, l1: [52, 78, 0], l2: [-6, 8, 10], a1: [-22, 55], a2: [26, 55] },
    ],
  },

  "arm-circles": {
    view: "front", duration: 1800, poster: 0,
    base: { ...FRONT_BASE },
    frames: [
      { t: 0, a1: [100, 6], a2: [100, 6] },
      { t: 0.25, a1: [190, 6], a2: [190, 6] },
      { t: 0.5, a1: [280, 6], a2: [280, 6] },
      { t: 0.75, a1: [370, 6], a2: [370, 6] },
      { t: 1, a1: [460, 6], a2: [460, 6] },
    ],
  },

  "toe-touches": {
    view: "side", duration: 2400, poster: 0.5,
    base: { ...SIDE_BASE },
    frames: [
      { t: 0, torso: 4, neck: 0, a1: [12, 8], a2: [16, 10], l1: [1, 3, 0], l2: [3, 5, 0] },
      { t: 0.5, torso: 86, neck: -24, a1: [4, 4], a2: [8, 6], l1: [1, 8, 0], l2: [3, 10, 0] },
      { t: 1, torso: 4, neck: 0, a1: [12, 8], a2: [16, 10], l1: [1, 3, 0], l2: [3, 5, 0] },
    ],
  },

  "skater-hops": {
    view: "front", duration: 1000, poster: 0,
    base: { ...FRONT_BASE, y: 76 },
    frames: [
      { t: 0, x: 52, torso: -8, l1: [40, 8, 0], l2: [8, 34, 0], a1: [45, 10], a2: [12, 45] },
      { t: 0.5, x: 68, torso: 8, l1: [8, 34, 0], l2: [40, 8, 0], a1: [12, 45], a2: [45, 10] },
      { t: 1, x: 52, torso: -8, l1: [40, 8, 0], l2: [8, 34, 0], a1: [45, 10], a2: [12, 45] },
    ],
  },

  "wall-sit": {
    view: "side", duration: 2400, poster: 0.5, prop: "wall",
    base: {
      ...SIDE_BASE, x: 58, torso: -4, neck: 4,
      a1: [58, 18], a2: [62, 20],
      l1: [88, 92, 0], l2: [85, 89, 0],
    },
    frames: [
      { t: 0, y: 84, neck: 2 },
      { t: 0.5, y: 85.5, neck: 6 },
      { t: 1, y: 84, neck: 2 },
    ],
  },

  "plank-hold": {
    view: "side", duration: 2400, poster: 0.5,
    base: {
      ...SIDE_BASE, x: 52, torso: 78,
      a1: [-4, 8], a2: [-8, 10],
      l1: [-94, 4, -55], l2: [-97, 6, -55],
    },
    frames: [
      { t: 0, y: 84, neck: 4 },
      { t: 0.5, y: 85.5, neck: 9 },
      { t: 1, y: 84, neck: 4 },
    ],
  },

  "flamingo-balance": {
    view: "front", duration: 2200, poster: 0.5,
    base: { ...FRONT_BASE, y: 75, a1: [92, 8], a2: [92, 8], l1: [4, 2, 0] },
    frames: [
      { t: 0, torso: -4, l2: [42, 92, 0], a1: [88, 8], a2: [96, 8] },
      { t: 0.5, torso: 4, l2: [46, 96, 0], a1: [96, 8], a2: [88, 8] },
      { t: 1, torso: -4, l2: [42, 92, 0], a1: [88, 8], a2: [96, 8] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Pose sampling
// ---------------------------------------------------------------------------

function expandFrames(motion) {
  return motion.frames.map((f) => ({
    ...motion.base,
    ...f,
    a1: f.a1 || motion.base.a1,
    a2: f.a2 || motion.base.a2,
    l1: f.l1 || motion.base.l1,
    l2: f.l2 || motion.base.l2,
  }));
}

function lerpPose(a, b, t) {
  const e = easeInOut(t);
  const arr = (ka, kb) => ka.map((v, i) => lerp(v, kb[i] ?? v, e));
  return {
    x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e),
    torso: lerp(a.torso, b.torso, e), neck: lerp(a.neck, b.neck, e),
    a1: arr(a.a1, b.a1), a2: arr(a.a2, b.a2),
    l1: arr(a.l1, b.l1), l2: arr(a.l2, b.l2),
  };
}

function samplePose(frames, t) {
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      return lerpPose(a, b, (t - a.t) / span);
    }
  }
  return { ...frames[frames.length - 1] };
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

function add(p, v, len) {
  return [p[0] + v[0] * len, p[1] + v[1] * len];
}

function computeSide(pose) {
  const hip = [pose.x, pose.y];
  const shoulder = add(hip, vecUp(pose.torso), LEN.torso);
  const head = add(shoulder, vecUp(pose.torso + pose.neck), LEN.neckHead);

  const arm = ([sh, el]) => {
    const elbow = add(shoulder, vecDown(sh), LEN.upperArm);
    const hand = add(elbow, vecDown(sh + el), LEN.forearm);
    return { shoulder, elbow, hand };
  };
  const leg = ([hp, kn, ank = 0]) => {
    const knee = add(hip, vecDown(hp), LEN.thigh);
    const shinDir = hp - kn;
    const ankle = add(knee, vecDown(shinDir), LEN.shin);
    const toe = add(ankle, vecDown(shinDir + 90 - ank), LEN.foot);
    return { hipPt: hip, knee, ankle, toe };
  };

  return {
    hip, shoulder, head,
    headRot: pose.torso + pose.neck,
    arms: [arm(pose.a1), arm(pose.a2)],
    legs: [leg(pose.l1), leg(pose.l2)],
  };
}

function computeFront(pose) {
  const hipC = [pose.x, pose.y];
  const shoulderC = add(hipC, vecUp(pose.torso), LEN.torso);
  const head = add(shoulderC, vecUp(pose.torso + pose.neck), LEN.neckHead);
  const perp = [Math.cos(rad(pose.torso)), Math.sin(rad(pose.torso))];

  const arm = ([sh, el], s) => {
    const shoulder = add(shoulderC, perp, s * 9);
    const elbow = add(shoulder, vecOut(sh, s), LEN.upperArm);
    const hand = add(elbow, vecOut(sh + el, s), LEN.forearm);
    return { shoulder, elbow, hand };
  };
  const leg = ([hp, kn], s) => {
    const hipPt = add(hipC, [1, 0], s * 6);
    const knee = add(hipPt, vecOut(hp, s), LEN.thigh);
    const ankle = add(knee, vecOut(hp - kn, s), LEN.shin);
    return { hipPt, knee, ankle, toe: null };
  };

  return {
    hip: hipC, shoulder: shoulderC, head,
    headRot: pose.torso + pose.neck,
    arms: [arm(pose.a1, -1), arm(pose.a2, 1)],
    legs: [leg(pose.l1, -1), leg(pose.l2, 1)],
  };
}

// ---------------------------------------------------------------------------
// SVG construction + rendering
// ---------------------------------------------------------------------------

function svgEl(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function limbPath(color, width) {
  return svgEl("path", {
    d: "", fill: "none", stroke: color, "stroke-width": width,
    "stroke-linecap": "round", "stroke-linejoin": "round",
  });
}

function buildFigure(svg, view, motion) {
  svg.textContent = "";

  const parts = { view };

  parts.shadow = svgEl("ellipse", {
    cx: 60, cy: GROUND + 4, rx: 27, ry: 4.5, fill: COLORS.shadow,
  });
  svg.appendChild(parts.shadow);

  if (motion.prop === "chair") {
    const chair = svgEl("g", {});
    chair.appendChild(svgEl("rect", { x: 25, y: 83, width: 22, height: 6, rx: 3, fill: COLORS.chair }));
    chair.appendChild(svgEl("rect", { x: 27, y: 89, width: 5, height: 18, rx: 2, fill: COLORS.chair }));
    chair.appendChild(svgEl("rect", { x: 40, y: 89, width: 5, height: 18, rx: 2, fill: COLORS.chair }));
    chair.appendChild(svgEl("rect", { x: 25, y: 58, width: 6, height: 27, rx: 3, fill: COLORS.chair }));
    svg.appendChild(chair);
  }

  if (motion.prop === "wall") {
    svg.appendChild(svgEl("rect", { x: 38, y: 26, width: 7, height: 84, rx: 2, fill: COLORS.chair }));
  }

  const farColor = view === "side" ? COLORS.far : COLORS.near;

  parts.armF = limbPath(farColor, 6.5);
  parts.legF = limbPath(farColor, 7);
  parts.shoeF = limbPath(view === "side" ? COLORS.shoeShade : COLORS.shoe, 6);
  parts.torso = limbPath(COLORS.torso, 15);
  parts.emblem = svgEl("rect", {
    x: -4, y: -4, width: 8, height: 8, rx: 1.5,
    fill: COLORS.emblem, transform: "rotate(45)",
  });
  parts.emblemG = svgEl("g", {});
  parts.emblemG.appendChild(parts.emblem);
  parts.legN = limbPath(COLORS.near, 7);
  parts.shoeN = limbPath(COLORS.shoe, 6);
  parts.armN = limbPath(COLORS.near, 6.5);

  // Head group (origin at head centre so it can rotate with the neck)
  parts.headG = svgEl("g", {});
  parts.headG.appendChild(svgEl("circle", { cx: 0, cy: 0, r: LEN.headR, fill: COLORS.head }));
  parts.headG.appendChild(svgEl("path", {
    d: "M -3 -13 L 0 -8 L 3 -13 Z", fill: COLORS.emblem,
    transform: "translate(0 1)",
  }));
  if (view === "side") {
    parts.headG.appendChild(svgEl("circle", { cx: 5, cy: -1.5, r: 1.7, fill: COLORS.face }));
    parts.headG.appendChild(svgEl("path", {
      d: "M 3 3.5 Q 5.5 6 8 3.5", fill: "none", stroke: COLORS.face,
      "stroke-width": 1.6, "stroke-linecap": "round",
    }));
  } else {
    parts.headG.appendChild(svgEl("circle", { cx: -3.5, cy: -1.5, r: 1.7, fill: COLORS.face }));
    parts.headG.appendChild(svgEl("circle", { cx: 3.5, cy: -1.5, r: 1.7, fill: COLORS.face }));
    parts.headG.appendChild(svgEl("path", {
      d: "M -3 3.5 Q 0 6.5 3 3.5", fill: "none", stroke: COLORS.face,
      "stroke-width": 1.6, "stroke-linecap": "round",
    }));
  }

  parts.weights = [
    svgEl("circle", { r: 4.5, fill: COLORS.weight, display: "none" }),
    svgEl("circle", { r: 4.5, fill: COLORS.weight, display: "none" }),
  ];

  for (const node of [
    parts.armF, parts.legF, parts.shoeF,
    parts.torso, parts.emblemG,
    parts.legN, parts.shoeN, parts.headG, parts.armN,
    parts.weights[0], parts.weights[1],
  ]) {
    svg.appendChild(node);
  }

  return parts;
}

function d2(a, b) {
  return `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} L ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

function d3(a, b, c) {
  return `${d2(a, b)} L ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
}

function renderPose(parts, pose, motion) {
  const g = parts.view === "side" ? computeSide(pose) : computeFront(pose);

  parts.torso.setAttribute("d", d2(g.hip, g.shoulder));

  const mid = [
    g.hip[0] + (g.shoulder[0] - g.hip[0]) * 0.55,
    g.hip[1] + (g.shoulder[1] - g.hip[1]) * 0.55,
  ];
  parts.emblemG.setAttribute("transform", `translate(${mid[0].toFixed(1)} ${mid[1].toFixed(1)})`);

  parts.headG.setAttribute(
    "transform",
    `translate(${g.head[0].toFixed(1)} ${g.head[1].toFixed(1)}) rotate(${g.headRot.toFixed(1)})`
  );

  const [armN, armF] = g.arms;
  parts.armN.setAttribute("d", d3(armN.shoulder, armN.elbow, armN.hand));
  parts.armF.setAttribute("d", d3(armF.shoulder, armF.elbow, armF.hand));

  const [legN, legF] = g.legs;
  parts.legN.setAttribute("d", d3(legN.hipPt, legN.knee, legN.ankle));
  parts.legF.setAttribute("d", d3(legF.hipPt, legF.knee, legF.ankle));

  if (parts.view === "side") {
    parts.shoeN.setAttribute("d", d2(legN.ankle, legN.toe));
    parts.shoeF.setAttribute("d", d2(legF.ankle, legF.toe));
  } else {
    const flat = (l) => d2([l.ankle[0] - 3, l.ankle[1] + 2.5], [l.ankle[0] + 3, l.ankle[1] + 2.5]);
    parts.shoeN.setAttribute("d", flat(legN));
    parts.shoeF.setAttribute("d", flat(legF));
  }

  const showWeights = motion.weights ? "" : "none";
  parts.weights[0].setAttribute("display", showWeights);
  parts.weights[1].setAttribute("display", showWeights);
  if (motion.weights) {
    parts.weights[0].setAttribute("cx", armN.hand[0]);
    parts.weights[0].setAttribute("cy", armN.hand[1]);
    parts.weights[1].setAttribute("cx", armF.hand[0]);
    parts.weights[1].setAttribute("cy", armF.hand[1]);
  }

  parts.shadow.setAttribute("cx", g.hip[0]);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const REDUCED_MOTION =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function makeSvg() {
  const svg = svgEl("svg", { viewBox: "0 0 120 120", width: "100%", height: "100%" });
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

// Static preview: renders the motion's poster pose once (used by the library).
export function renderStaticMascot(container, exerciseId) {
  const motion = MOTIONS[exerciseId];
  if (!motion) return;
  const svg = makeSvg();
  container.textContent = "";
  container.appendChild(svg);
  const parts = buildFigure(svg, motion.view, motion);
  const frames = expandFrames(motion);
  renderPose(parts, samplePose(frames, motion.poster ?? 0.5), motion);
}

// Animated mascot for the active quest card. Returns a controller.
export function createMascot(container, exerciseId) {
  const svg = makeSvg();
  container.textContent = "";
  container.appendChild(svg);

  let motion = null;
  let parts = null;
  let frames = null;
  let rafId = null;
  let startTime = 0;

  function tick(now) {
    const t = ((now - startTime) % motion.duration) / motion.duration;
    renderPose(parts, samplePose(frames, t), motion);
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (rafId !== null || REDUCED_MOTION || !motion) return;
    startTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function setExercise(id) {
    const next = MOTIONS[id];
    if (!next) return;
    stop();
    motion = next;
    parts = buildFigure(svg, motion.view, motion);
    frames = expandFrames(motion);
    renderPose(parts, samplePose(frames, motion.poster ?? 0.5), motion);
    start();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  setExercise(exerciseId);

  return { setExercise, start, stop };
}
