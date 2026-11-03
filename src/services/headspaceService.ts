/**
 * Headspace Service
 * Settled fill height and headspace for a completed fill simulation.
 * Percentages are of overflow (brimful) capacity.
 */

import { Bottle, ProfilePoint } from '@/types/bottle';
import { Product } from '@/types/product';
import { radiusAt } from './drawingProfile';
import { getProductHalfExtents } from './fillSimulationService';

export interface HeadspaceResult {
  capacityMl: number;
  /** Bottle volume below the settled fill line (product plus the voids between pieces) */
  bulkVolumeMl: number;
  /** Count inside × unit volume */
  solidVolumeMl: number;
  /** Capacity above the settled fill line */
  bulkHeadspacePct: number;
  /** Capacity not taken by product solid volume */
  solidHeadspacePct: number;
  fillHeightMm: number;
  fillHeightPct: number;
  overallHeightMm: number;
  /** Fill line to the shoulder start; negative when product sits up in the shoulder */
  shoulderClearanceMm: number | null;
  /** Fill line to the bottom of the neck finish */
  neckClearanceMm: number;
}

interface PieceState {
  position: [number, number, number];
  rotation: [number, number, number, number];
  isInside: boolean;
}

// Fill line = mean of the highest pieces, so one piece sitting proud doesn't set it
const TOP_FRACTION = 0.1;
const MIN_TOP_PIECES = 3;
// Shoulder starts where the cavity narrows below this share of the body radius
const SHOULDER_RADIUS_RATIO = 0.98;

function rotateY(p: [number, number, number], q: [number, number, number, number]): number {
  const [x, y, z] = p;
  const [qx, qy, qz, qw] = q;
  // y of v + w·t + q×t, with t = 2(q×v)
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  return y + qw * ty + (qz * tx - qx * tz);
}

/** Surface extreme points of a piece in local space. */
function topProbePoints(product: Product): [number, number, number][] {
  const [hx, hy, hz] = getProductHalfExtents(product);
  if (product.shape === 'dome') {
    const h = product.dimensions.height;
    return [[0, h, 0], [hx, 0, 0], [-hx, 0, 0], [0, 0, hz], [0, 0, -hz], [0, 0, 0]];
  }
  return [[hx, 0, 0], [-hx, 0, 0], [0, hy, 0], [0, -hy, 0], [0, 0, hz], [0, 0, -hz]];
}

/** Height of the settled product surface (mm from the base). */
export function settledFillHeight(pieces: PieceState[], product: Product): number {
  const probes = topProbePoints(product);
  const tops = pieces
    .filter((p) => p.isInside)
    .map((p) => p.position[1] + Math.max(...probes.map((pt) => rotateY(pt, p.rotation))))
    .sort((a, b) => b - a);
  if (!tops.length) return 0;
  const n = Math.min(tops.length, Math.max(MIN_TOP_PIECES, Math.round(tops.length * TOP_FRACTION)));
  return tops.slice(0, n).reduce((a, b) => a + b, 0) / n;
}

/** Revolved volume of the part of `points` at or below height `y` (mm³). */
function revolvedVolumeBelow(points: ProfilePoint[], y: number): number {
  let v = 0;
  for (let i = 1; i < points.length; i++) {
    let [r1, y1] = points[i - 1];
    let [r2, y2] = points[i];
    if (Math.min(y1, y2) >= y) continue;
    if (Math.max(y1, y2) > y) {
      const rAtY = r1 + ((r2 - r1) * (y - y1)) / (y2 - y1);
      if (y2 > y) [r2, y2] = [rAtY, y];
      else [r1, y1] = [rAtY, y];
    }
    v += (Math.PI * (y2 - y1) / 3) * (r1 * r1 + r1 * r2 + r2 * r2);
  }
  return v;
}

/** Bottle volume below height `y` (mL). */
export function volumeBelow(bottle: Bottle, y: number): number {
  if (bottle.profile) return revolvedVolumeBelow(bottle.profile.inner, y) / 1000;
  const bodyTop = bottle.dimensions.height - bottle.dimensions.neckHeight;
  return bottle.volume * Math.min(1, Math.max(0, y / bodyTop));
}

/** Height where the cavity starts to narrow into the shoulder (mm), drawing bottles only. */
export function shoulderStart(bottle: Bottle): number | null {
  const inner = bottle.profile?.inner;
  if (!inner) return null;
  const bodyR = Math.max(...inner.map(([r]) => r));
  const height = bottle.dimensions.height;
  for (let y = height * 0.3; y <= height; y += 0.25) {
    if (radiusAt(inner, y) < bodyR * SHOULDER_RADIUS_RATIO) return y;
  }
  return null;
}

export function computeHeadspace(
  bottle: Bottle,
  product: Product,
  pieces: PieceState[]
): HeadspaceResult {
  const capacityMl = bottle.volume;
  const overallHeightMm = bottle.dimensions.height;
  const fillHeightMm = Math.min(settledFillHeight(pieces, product), overallHeightMm);
  const bulkVolumeMl = Math.min(volumeBelow(bottle, fillHeightMm), capacityMl);
  const solidVolumeMl = (pieces.filter((p) => p.isInside).length * product.volume) / 1000;
  const shoulder = shoulderStart(bottle);
  const pct = (part: number) => (capacityMl > 0 ? (part / capacityMl) * 100 : 0);

  return {
    capacityMl,
    bulkVolumeMl,
    solidVolumeMl,
    bulkHeadspacePct: 100 - pct(bulkVolumeMl),
    solidHeadspacePct: 100 - pct(solidVolumeMl),
    fillHeightMm,
    fillHeightPct: overallHeightMm > 0 ? (fillHeightMm / overallHeightMm) * 100 : 0,
    overallHeightMm,
    shoulderClearanceMm: shoulder === null ? null : shoulder - fillHeightMm,
    neckClearanceMm: overallHeightMm - bottle.dimensions.neckHeight - fillHeightMm,
  };
}
