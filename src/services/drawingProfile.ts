/**
 * Drawing Profile
 * Builds an exact revolved bottle profile from 2D drawing dimensions, and
 * measures volumes and areas from it.
 */

import { DrawingProfile, ProfilePoint } from '@/types/bottle';

export const INCH = 25.4;

/** Typical HDPE density, g/cm³ */
export const HDPE_DENSITY = 0.952;

/** Typical amorphous-to-oriented bottle-grade PET density, g/cm³ */
export const PET_DENSITY = 1.38;

/** Dimensions read off a bottle drawing (mm). */
export interface BottleDrawingSpec {
  source: string;
  bodyDiameter: number;
  height: number;              // base to top of finish
  baseRadius: number;          // heel radius
  shoulderRadius: number;
  neckDiameter: number;        // outside diameter between shoulder and bead
  neckCollarHeight: number;    // straight neck between shoulder and bead
  beadDiameter: number;
  beadHeight: number;
  finishHeight: number;        // "H": top of bead to top of finish
  threadDiameter: number;      // "T"
  rootDiameter: number;        // "E"
  boreDiameter: number;        // "I"
  threadStart: number;         // "S": top of finish to start of thread
  lipRadius: number;
  threadPitch: number;
  threadTurns: number;
  labelPanel?: { fromBase: number; height: number };
  /** Domed base push-up: rise at the centre and diameter of the standing ring. */
  pushUp?: { depth: number; diameter: number };
  /** Tapered bodies: diameter at the heel, widening to `bodyDiameter` at the shoulder. */
  heelDiameter?: number;
  /** Oval bottles: outside minor-axis depth; `bodyDiameter` is the major axis. */
  ovalDepth?: number;
  /** Oval bottles: side-view shoulder tangent height (defaults to the front shoulder start). */
  ovalShoulderStart?: number;
}

type OvalSpec = DrawingProfile['oval'];

/** Depth (z) scale of the profile at height `y`: 1 for round bottles. */
export function depthScaleAt(oval: OvalSpec, y: number): number {
  if (!oval) return 1;
  const s = oval.scale;
  if (s.length === 0 || y <= s[0][0]) return oval.depthRatio;
  if (y >= s[s.length - 1][0]) return 1;
  let i = 1;
  while (s[i][0] < y) i++;
  const [y1, k1] = s[i - 1];
  const [y2, k2] = s[i];
  return k1 + ((k2 - k1) * (y - y1)) / (y2 - y1);
}

/**
 * Side-view shoulder: the minor-axis radius holds to `ovalShoulderStart`, then
 * falls tangentially (parabolic) to the neck radius at the neck bottom.
 */
function buildOval(spec: BottleDrawingSpec, outer: ProfilePoint[], h: ReturnType<typeof heights>): OvalSpec {
  if (!spec.ovalDepth) return undefined;
  const depthRatio = spec.ovalDepth / spec.bodyDiameter;
  const zBody = spec.ovalDepth / 2;
  const neckR = spec.neckDiameter / 2;
  const y0 = Math.min(spec.ovalShoulderStart ?? h.shoulderStart, h.shoulderStart);
  const y1 = h.neckBottom;
  const scale: [number, number][] = [];
  const steps = Math.max(8, Math.ceil((y1 - y0) / 0.5));
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps;
    const t = (y - y0) / (y1 - y0);
    const zR = neckR + (zBody - neckR) * (1 - t * t);
    const r = radiusAt(outer, y);
    scale.push([y, r > 0 ? Math.min(1, zR / r) : 1]);
  }
  return { depthRatio, scale };
}

const ARC_STEPS = 10;

function arc(
  cx: number,
  cy: number,
  radius: number,
  fromAngle: number,
  toAngle: number,
  steps = ARC_STEPS
): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = fromAngle + ((toAngle - fromAngle) * i) / steps;
    points.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  return points;
}

function heights(spec: BottleDrawingSpec) {
  const top = spec.height;
  const beadTop = top - spec.finishHeight;
  const beadBottom = beadTop - spec.beadHeight;
  const neckBottom = beadBottom - spec.neckCollarHeight;
  const R = spec.bodyDiameter / 2;
  const centerR = R - spec.shoulderRadius;
  const neckR = spec.neckDiameter / 2;
  const endAngle = neckR > centerR
    ? Math.acos(Math.min(1, (neckR - centerR) / spec.shoulderRadius))
    : Math.PI / 2;
  const shoulderStart = neckBottom - spec.shoulderRadius * Math.sin(endAngle);
  return { top, beadTop, beadBottom, neckBottom, R, centerR, neckR, endAngle, shoulderStart };
}

/** Base from the axis out to the start of the heel, raised `offset` off y = 0. */
function baseCurve(spec: BottleDrawingSpec, offset: number): ProfilePoint[] {
  const ringR = (spec.heelDiameter ?? spec.bodyDiameter) / 2 - spec.baseRadius;
  const push = spec.pushUp;
  if (!push) return [[0, offset], [ringR, offset]];
  const domeR = Math.min(push.diameter / 2, ringR);
  const points: ProfilePoint[] = [];
  for (let i = 0; i <= ARC_STEPS; i++) {
    const r = (domeR * i) / ARC_STEPS;
    points.push([r, offset + push.depth * Math.cos((Math.PI / 2) * (r / domeR))]);
  }
  if (ringR > domeR) points.push([ringR, offset]);
  return points;
}

function buildOuter(spec: BottleDrawingSpec): ProfilePoint[] {
  const h = heights(spec);
  const { R, centerR, neckR } = h;
  const rb = spec.baseRadius;
  const beadR = spec.beadDiameter / 2;
  const rootR = spec.rootDiameter / 2;
  const lip = spec.lipRadius;

  const heelR = (spec.heelDiameter ?? spec.bodyDiameter) / 2;

  const points: ProfilePoint[] = baseCurve(spec, 0);
  points.push(...arc(heelR - rb, rb, rb, -Math.PI / 2, 0).slice(1));
  points.push([R, h.shoulderStart]);
  points.push(...arc(centerR, h.shoulderStart, spec.shoulderRadius, 0, h.endAngle).slice(1));
  points.push([neckR, h.neckBottom]);
  points.push([neckR, h.beadBottom]);
  points.push([beadR, h.beadBottom + (beadR - neckR) * Math.tan((3 * Math.PI) / 180)]);
  points.push([beadR, h.beadTop - (beadR - rootR) * Math.tan((5 * Math.PI) / 180)]);
  points.push([rootR, h.beadTop]);
  points.push([rootR, h.top - lip]);
  points.push(...arc(rootR - lip, h.top - lip, lip, 0, Math.PI / 2).slice(1));
  points.push([spec.boreDiameter / 2, h.top]);
  return points;
}

function buildInner(spec: BottleDrawingSpec, t: number): ProfilePoint[] {
  const h = heights(spec);
  const { R, centerR } = h;
  const rb = spec.baseRadius;
  const boreR = spec.boreDiameter / 2;
  const innerHeel = Math.max(rb - t, 0.3);
  const innerShoulder = Math.max(spec.shoulderRadius - t, 0.3);
  const innerNeckR = Math.max(spec.neckDiameter / 2 - t, boreR);
  const endAngle = innerNeckR > centerR
    ? Math.acos(Math.min(1, (innerNeckR - centerR) / innerShoulder))
    : Math.PI / 2;
  const shoulderTop = h.shoulderStart + innerShoulder * Math.sin(endAngle);

  const heelR = (spec.heelDiameter ?? spec.bodyDiameter) / 2;

  const points: ProfilePoint[] = baseCurve(spec, t);
  points.push(...arc(heelR - rb, rb, innerHeel, -Math.PI / 2, 0).slice(1));
  points.push([R - t, h.shoulderStart]);
  points.push(...arc(centerR, h.shoulderStart, innerShoulder, 0, endAngle).slice(1));
  points.push([innerNeckR, Math.max(shoulderTop, h.beadBottom - t)]);
  points.push([boreR, Math.max(shoulderTop, h.beadBottom - t)]);
  points.push([boreR, h.top]);
  return points;
}

/**
 * Volume of the solid swept by revolving `points` (mm³). Segments that run
 * downward (a base push-up) subtract, so the result is the enclosed volume.
 */
export function revolvedVolume(points: ProfilePoint[], oval?: OvalSpec): number {
  let v = 0;
  for (let i = 1; i < points.length; i++) {
    const [r1, y1] = points[i - 1];
    const [r2, y2] = points[i];
    const k = depthScaleAt(oval, (y1 + y2) / 2);
    v += k * (Math.PI * (y2 - y1) / 3) * (r1 * r1 + r1 * r2 + r2 * r2);
  }
  return v;
}

/** Area of the surface swept by revolving `points` (mm²); ovals use the mean-radius perimeter. */
export function revolvedArea(points: ProfilePoint[], oval?: OvalSpec): number {
  let a = 0;
  for (let i = 1; i < points.length; i++) {
    const [r1, y1] = points[i - 1];
    const [r2, y2] = points[i];
    const k = depthScaleAt(oval, (y1 + y2) / 2);
    a += ((1 + k) / 2) * Math.PI * (r1 + r2) * Math.hypot(r2 - r1, y2 - y1);
  }
  return a;
}

/** Largest profile radius at height `y`, or 0 outside the profile. */
export function radiusAt(points: ProfilePoint[], y: number): number {
  let best = 0;
  for (let i = 1; i < points.length; i++) {
    const [r1, y1] = points[i - 1];
    const [r2, y2] = points[i];
    if (y < Math.min(y1, y2) || y > Math.max(y1, y2)) continue;
    const r = y2 === y1 ? Math.max(r1, r2) : r1 + ((r2 - r1) * (y - y1)) / (y2 - y1);
    best = Math.max(best, r);
  }
  return best;
}

/** Brimful capacity of a drawing profile (mL). */
export function profileCapacityMl(profile: DrawingProfile): number {
  return revolvedVolume(profile.inner, profile.oval) / 1000;
}

/** Outside surface area of a drawing profile (cm²). */
export function profileSurfaceAreaCm2(profile: DrawingProfile): number {
  return revolvedArea(profile.outer, profile.oval) / 100;
}

/** Height of the top of the finish (mm). */
export function profileTop(profile: DrawingProfile): number {
  return profile.outer[profile.outer.length - 1][1];
}

/**
 * Build the profile. Body wall thickness isn't on the drawing, so it is solved
 * so the resin volume matches `plasticWeight` (the finish keeps its drawn bore).
 */
export function buildDrawingProfile(
  spec: BottleDrawingSpec,
  plasticWeight: number,
  density = HDPE_DENSITY
): DrawingProfile {
  const outer = buildOuter(spec);
  const h = heights(spec);
  const oval = buildOval(spec, outer, h);
  const resinMm3 = (plasticWeight / density) * 1000;
  const solid = revolvedVolume(outer, oval);

  let lo = 0.2;
  let hi = 3;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const resin = solid - revolvedVolume(buildInner(spec, mid), oval);
    if (resin < resinMm3) lo = mid;
    else hi = mid;
  }
  const wallThickness = Math.round(((lo + hi) / 2) * 100) / 100;

  const endY = spec.height - spec.threadStart;
  return {
    source: spec.source,
    outer,
    inner: buildInner(spec, wallThickness),
    wallThickness,
    thread: {
      rootRadius: spec.rootDiameter / 2,
      crestRadius: spec.threadDiameter / 2,
      startY: endY - spec.threadPitch * spec.threadTurns,
      endY,
      pitch: spec.threadPitch,
    },
    labelPanel: spec.labelPanel
      ? { bottomY: spec.labelPanel.fromBase, height: spec.labelPanel.height }
      : undefined,
    oval,
  };
}
