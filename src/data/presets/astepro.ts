/**
 * Astepro nasal spray bottles, 2-piece (bottle + base cup), HDPE.
 * Bottle profiles are traced from the supplier drawings (mm, inch in brackets).
 *
 * Only the bottle is modelled. The base cup is a separate part that wraps the
 * bottom; the app has no base-cup component, so it is not drawn and does not
 * change the capacity.
 *
 * Not on the drawings, and estimated here: the shoulder height, the base taper,
 * and the wall thickness. The resin weight follows from the estimated wall.
 * No pump or closure drawing was supplied, so the bottles have no cap.
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

// Estimated, not on the drawings
const SHOULDER_RISE = 10; // mm, body to neck
const BASE_TAPER = 6; // mm, bottom taper up to the full body diameter
const BASE_FLOOR_RATIO = 0.8; // floor radius as a share of the body radius
const WALL = 1.0; // mm

interface AsteproSpec {
  name: string;
  presetId: string;
  source: string;
  overall: number; // mm, base to top of finish
  bodyDiameter: number; // mm
  finishHeight: number; // "H", top of finish to the bottom of the thread zone
  threadEnd: number; // "S", top of finish to the start of the thread
}

const ASTEPRO_SPECS: AsteproSpec[] = [
  {
    name: '15 mL Astepro',
    presetId: 'astepro-15',
    source: 'Astepro 15 mL bottle + base cup (drawing, bottle only)',
    overall: 58.72, // 2.312 ±.060
    bodyDiameter: 28.58, // 1.125 ±.030
    finishHeight: 19.0, // .748 ±.015
    threadEnd: 0.99, // .039 ±.015
  },
  {
    name: '34.5 mL Astepro',
    presetId: 'astepro-34.5',
    source: 'Astepro 34.5 mL bottle + base cup (drawing, bottle only)',
    overall: 55.63, // 2.190 ±.050
    bodyDiameter: 38.05, // 1.498 ±.031
    finishHeight: 15.66, // .617 ±.015
    threadEnd: 2.38, // .093 ±.015
  },
];

/** Shoulder and neck: a quarter ellipse from the body to the neck, centred on the neck. */
function shoulder(bodyR: number, neckR: number, bodyTop: number, steps = 8): ProfilePoint[] {
  const pts: ProfilePoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2);
    pts.push([neckR + (bodyR - neckR) * Math.cos(t), bodyTop + SHOULDER_RISE * Math.sin(t)]);
  }
  return pts;
}

function buildOuter(s: AsteproSpec): ProfilePoint[] {
  const R = s.bodyDiameter / 2;
  const finishBottom = s.overall - s.finishHeight;
  const bodyTop = finishBottom - SHOULDER_RISE;
  return [
    [0, 0],
    [BASE_FLOOR_RATIO * R, 0],
    [R, BASE_TAPER],
    [R, bodyTop],
    ...shoulder(R, NECK_D / 2, bodyTop),
    [ROOT_D / 2, finishBottom],
    [ROOT_D / 2, s.overall],
    [BORE_D / 2, s.overall],
  ];
}

function buildInner(s: AsteproSpec): ProfilePoint[] {
  const R = s.bodyDiameter / 2 - WALL;
  const neckR = NECK_D / 2 - WALL;
  const finishBottom = s.overall - s.finishHeight;
  const bodyTop = finishBottom - SHOULDER_RISE;
  return [
    [0, WALL],
    [BASE_FLOOR_RATIO * (s.bodyDiameter / 2) - WALL, WALL],
    [R, BASE_TAPER],
    [R, bodyTop],
    ...shoulder(R, neckR, bodyTop),
    [neckR, s.overall],
    [BORE_D / 2, s.overall],
  ];
}

function buildBottle(s: AsteproSpec): Bottle {
  const outer = buildOuter(s);
  const inner = buildInner(s);
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
      neckFinish: 'Astepro finish',
      shoulderCurveRadius: SHOULDER_RISE,
      shoulderAngle: 45,
      wallThickness: WALL,
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
      wallThickness: WALL,
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
