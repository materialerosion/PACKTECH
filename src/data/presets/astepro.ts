/**
 * Astepro nasal spray bottles, 2-piece (bottle + base cup), HDPE.
 * Bottle profiles are traced from the supplier drawings (mm, inch in brackets).
 *
 * Only the bottle is modelled. The base cup is a separate part that wraps the
 * bottom; the app has no base-cup component, so it is not drawn and does not
 * change the capacity.
 *
 * The assembled bottle (photo) has a straight body, a rounded shoulder and a
 * rounded heel. The drawing's conical foot sits inside the base cup and is
 * not the visible base, so it is not modelled. No pump or closure drawing was
 * supplied, so the bottles have no cap.
 *
 * 15 mL: the Amcor spec sheet (ref. B-12267 / C-23300) gives weight 5.5–7.5 g,
 * overflow 18.5 ± 0.75 mL, neck M18/SP415, bottle HDPE Marlex HHM 5502BN. The wall
 * is solved from the 6.5 g midpoint, as the app does for other drawings.
 * 34.5 mL: no spec sheet, so the wall is an estimate.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bottle, DEFAULT_DIMENSIONS, ProfilePoint } from '@/types';
import { VolumeCalculator } from '@/services/volumeCalculator';
import { HDPE_DENSITY, revolvedVolume } from '@/services/drawingProfile';

// Finish, common to both drawings
const CREST_D = 17.68; // "T" Ø17.68 (.696)
const ROOT_D = 15.85; // "E" Ø15.85 (.624)
const NECK_D = 15.54; // Ø15.54 (.612) neck below the threads
const BORE_D = 13.46; // "I" Ø13.46 (.530)
const THREAD_PITCH = 25.4 / 8; // not dimensioned; 8 per inch assumed
const THREAD_TURNS = 3;

interface AsteproSpec {
  name: string;
  presetId: string;
  source: string;
  overall: number; // mm, base to top of finish
  bodyDiameter: number; // mm
  finishHeight: number; // "H", top of finish to the bottom of the thread zone
  threadEnd: number; // "S", top of finish to the start of the thread
  /** Rise from the straight body to the neck (mm). */
  shoulderRise: number;
  /**
   * `ellipse` is a quarter ellipse, used on the 15 mL.
   * `rounded` keeps the wall straight, rounds the corner, then runs a short
   * slope into the neck, matching the assembled bottle.
   */
  shoulder: 'ellipse' | 'rounded';
  /** Outside radius of the heel, so the base stays full width and rounds in. */
  heel: number;
  /** Solve the wall so the resin weight matches this (g). */
  weightG?: number;
  /** Brimful is to the base of the finish (shoulder top), not the top of the bore. */
  brimfulAtFinishBase?: boolean;
  /** Otherwise use this wall thickness (mm). */
  wall?: number;
  neckFinish: string;
}

const ASTEPRO_SPECS: AsteproSpec[] = [
  {
    name: '15 mL Astepro',
    presetId: 'astepro-15',
    source:
      'Astepro 15 mL bottle + base cup (drawing B-12267 / C-23300; Amcor spec: HDPE Marlex HHM 5502BN, M18/SP415, weight 5.5–7.5 g, overflow 18.5 ± 0.75 mL)',
    overall: 58.72, // 2.312 ±.060
    bodyDiameter: 28.58, // 1.125 ±.030
    finishHeight: 19.0, // .748 ±.015
    threadEnd: 0.99, // .039 ±.015
    shoulderRise: 10,
    shoulder: 'ellipse',
    heel: 4,
    weightG: 6.5,
    brimfulAtFinishBase: true,
    neckFinish: 'M18/SP415',
  },
  {
    name: '34.5 mL Astepro',
    presetId: 'astepro-34.5',
    source: 'Astepro 34.5 mL bottle + base cup (drawing, bottle only; wall estimated)',
    overall: 55.63, // 2.190 ±.050
    bodyDiameter: 38.05, // 1.498 ±.031
    finishHeight: 15.66, // .617 ±.015
    threadEnd: 2.38, // .093 ±.015
    shoulderRise: 12,
    shoulder: 'rounded',
    heel: 6,
    wall: 1.0,
    neckFinish: 'Astepro finish',
  },
];

/** Quarter ellipse from the straight body up to the neck, tangent to both. */
function ellipseShoulder(bodyR: number, neckR: number, bodyTop: number, rise: number, steps = 8): ProfilePoint[] {
  const pts: ProfilePoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2);
    pts.push([neckR + (bodyR - neckR) * Math.cos(t), bodyTop + rise * Math.sin(t)]);
  }
  return pts;
}

/**
 * Straight wall, a round corner, then a short slope into the neck.
 * The corner radius is half the rise, so the cylinder stays full width
 * until near the top.
 */
function roundedShoulder(bodyR: number, neckR: number, bodyTop: number, rise: number, steps = 6): ProfilePoint[] {
  const blend = Math.min(rise * 0.5, (bodyR - neckR) * 0.55);
  const pts: ProfilePoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2);
    pts.push([bodyR - blend * (1 - Math.cos(t)), bodyTop + blend * Math.sin(t)]);
  }
  pts.push([neckR, bodyTop + rise]);
  return pts;
}

function shoulder(s: AsteproSpec, bodyR: number, neckR: number, bodyTop: number): ProfilePoint[] {
  return s.shoulder === 'ellipse'
    ? ellipseShoulder(bodyR, neckR, bodyTop, s.shoulderRise)
    : roundedShoulder(bodyR, neckR, bodyTop, s.shoulderRise);
}

/** Flat bottom with a rounded heel out to the full body radius. */
function heel(radius: number, heelR: number, y0: number, steps = 6): ProfilePoint[] {
  const pts: ProfilePoint[] = [[Math.max(radius - heelR, 0), y0]];
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2);
    pts.push([(radius - heelR) + heelR * Math.sin(t), y0 + heelR * (1 - Math.cos(t))]);
  }
  return pts;
}

function buildOuter(s: AsteproSpec): ProfilePoint[] {
  const R = s.bodyDiameter / 2;
  const finishBottom = s.overall - s.finishHeight;
  const bodyTop = finishBottom - s.shoulderRise;
  return [
    [0, 0],
    ...heel(R, s.heel, 0),
    [R, bodyTop],
    ...shoulder(s, R, NECK_D / 2, bodyTop),
    [ROOT_D / 2, finishBottom],
    [ROOT_D / 2, s.overall],
    [BORE_D / 2, s.overall],
  ];
}

function buildInner(s: AsteproSpec, wall: number): ProfilePoint[] {
  const R = s.bodyDiameter / 2 - wall;
  const neckR = NECK_D / 2 - wall;
  const finishBottom = s.overall - s.finishHeight;
  const bodyTop = finishBottom - s.shoulderRise;
  const heelR = Math.max(s.heel - wall, 0.4);
  return [
    [0, wall],
    ...heel(R, heelR, wall),
    [R, bodyTop],
    ...shoulder(s, R, neckR, bodyTop),
    [neckR, s.overall],
    [BORE_D / 2, s.overall],
  ];
}

/** Resin weight (g) for a given wall, from the outer and inner profiles. */
function resinWeight(s: AsteproSpec, wall: number): number {
  const volume = revolvedVolume(buildOuter(s)) - revolvedVolume(buildInner(s, wall));
  return (volume / 1000) * HDPE_DENSITY;
}

/** Bisect the wall so the resin weight matches `targetG` (resin rises with the wall). */
function solveWall(s: AsteproSpec, targetG: number): number {
  let lo = 0.2;
  let hi = 4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (resinWeight(s, mid) > targetG) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function buildBottle(s: AsteproSpec): Bottle {
  const wall = s.weightG !== undefined ? solveWall(s, s.weightG) : (s.wall ?? 1.0);
  const outer = buildOuter(s);
  const inner = buildInner(s, wall);
  const resinG = ((revolvedVolume(outer) - revolvedVolume(inner)) / 1000) * HDPE_DENSITY;
  const now = new Date();
  const bottle: Bottle = {
    id: uuidv4(),
    name: s.name,
    shape: 'boston-round',
    dimensions: {
      ...DEFAULT_DIMENSIONS['boston-round'],
      height: s.overall,
      bodyHeight: s.overall,
      diameter: s.bodyDiameter,
      baseDiameter: s.bodyDiameter,
      neckDiameter: CREST_D,
      neckHeight: s.finishHeight,
      neckFinish: s.neckFinish,
      shoulderCurveRadius: s.shoulderRise,
      shoulderAngle: 45,
      wallThickness: wall,
    },
    capStyle: 'screw-cap',
    capColor: '#FFFFFF',
    bodyColor: '#2563EB',
    material: 'HDPE',
    opacity: 1,
    labelZones: [],
    plasticWeight: Math.round(resinG * 10) / 10,
    profile: {
      source: s.source,
      outer,
      inner,
      wallThickness: wall,
      brimfulY: s.brimfulAtFinishBase ? s.overall - s.finishHeight : undefined,
      thread: {
        rootRadius: ROOT_D / 2,
        crestRadius: CREST_D / 2,
        endY: s.overall - s.threadEnd,
        startY: s.overall - s.threadEnd - THREAD_PITCH * THREAD_TURNS,
        pitch: THREAD_PITCH,
      },
    },
    volume: 0,
    surfaceArea: 0,
    createdAt: now,
    updatedAt: now,
    isCustom: false,
    presetId: s.presetId,
  };
  bottle.volume = VolumeCalculator.calculate(bottle);
  bottle.surfaceArea = VolumeCalculator.calculateSurfaceArea(bottle);
  return bottle;
}

export function buildAsteproBottles(): Bottle[] {
  return ASTEPRO_SPECS.map(buildBottle);
}
