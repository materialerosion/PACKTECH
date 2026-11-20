/**
 * Afrin 23 mL nasal spray bottle, Anchor Rigid Plastics, HDPE, 18mm 415
 * finish with CR lugs. Profile traced from the supplier drawing (mm over inches).
 *
 * The drawing gives an average wall of 1.00 mm (.040), not a resin weight, so
 * the cavity is the outside less that wall and the weight is the resulting
 * HDPE volume. The 0.64 mm minimum is the gauge limit, not the modelled wall.
 * The six CR lugs and the base engraving are not modelled. No closure drawing
 * was supplied, so the bottle has no cap.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bottle, DEFAULT_DIMENSIONS, ProfilePoint } from '@/types';
import { VolumeCalculator } from '@/services/volumeCalculator';
import { HDPE_DENSITY, revolvedVolume } from '@/services/drawingProfile';

const HEIGHT = 63.5; // 63.50 ± 1.27 (2.500 ± .050) overall
const BODY_DIAMETER = 28.32; // Ø28.32 ± 1.27 (1.115 ± .050)
const BODY_TOP = 32.79; // (1.291): base to the shoulder tangent
const NECK_DIAMETER = 15.8; // Ø15.80 (.622), below the bead
const HEEL_R = 2.39; // R2.39 (.094)
const SHOULDER_R = 3.18; // R3.18 (.125), then a 45° taper
const FILLET_R = 0.79; // R0.79 (.031) into the neck
const WALL = 1.0; // 1.00 average (.040); 0.64 (.025) minimum at the gauge
const BASE_THICKNESS = 1.4; // 1.40 ± 0.19 (.055 ± .007) at the base
const FINISH_H = 11.51; // "H" 11.51 ± 0.38 (.453 ± .015)
const X_HEIGHT = 14.0; // "X" 14.00 (.551): top of finish to bottom of the bead
const BEAD_DIAMETER = 17.81; // bead follows "T"; its height is X − H = 2.49 (.098)
const THREAD_T = 17.81; // "T" Ø17.81 ± 0.20 (.701 ± .008)
const THREAD_E = 15.8; // "E" Ø15.8 ± 0.2 (.622 ± .008)
const BORE = 12.24; // "I" Ø12.24 ± 0.12 (.482 ± .005)
const THREAD_S = 0.99; // "S" 0.99 ± 0.38 (.039 ± .015)
const LIP_R = 0.25;
// Pitch is not on the drawing; 8 threads per inch is the common 400-series pitch
const THREAD_PITCH = 25.4 / 8;
const THREAD_TURNS = 3;

function arc(cx: number, cy: number, radius: number, from: number, to: number, steps = 8): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    points.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  return points;
}

function buildOuter(): ProfilePoint[] {
  const bodyR = BODY_DIAMETER / 2;
  const neckR = NECK_DIAMETER / 2;
  const beadR = BEAD_DIAMETER / 2;
  const rootR = THREAD_E / 2;
  const a45 = Math.PI / 4;

  const shoulderCx = bodyR - SHOULDER_R;
  const shoulderEnd: ProfilePoint = [
    shoulderCx + SHOULDER_R * Math.cos(a45),
    BODY_TOP + SHOULDER_R * Math.sin(a45),
  ];
  // Fillet tangent to the vertical neck and to the 45° shoulder
  const filletCx = neckR + FILLET_R;
  const filletLowerR = filletCx + FILLET_R * Math.cos(Math.PI * 1.25);
  const filletLowerY = shoulderEnd[1] + shoulderEnd[0] - filletLowerR;
  const filletTopY = filletLowerY - FILLET_R * Math.sin(Math.PI * 1.25);

  const beadBottom = HEIGHT - X_HEIGHT;
  const beadTop = HEIGHT - FINISH_H;
  const rise = (beadR - neckR) * Math.tan((3 * Math.PI) / 180);
  const fall = (beadR - rootR) * Math.tan((5 * Math.PI) / 180);

  return [
    [0, 0],
    [bodyR - HEEL_R, 0],
    ...arc(bodyR - HEEL_R, HEEL_R, HEEL_R, -Math.PI / 2, 0).slice(1),
    [bodyR, BODY_TOP],
    ...arc(shoulderCx, BODY_TOP, SHOULDER_R, 0, a45).slice(1),
    [filletLowerR, filletLowerY],
    ...arc(filletCx, filletTopY, FILLET_R, Math.PI * 1.25, Math.PI).slice(1),
    [neckR, beadBottom],
    [beadR, beadBottom + rise],
    [beadR, beadTop - fall],
    [rootR, beadTop],
    [rootR, HEIGHT - LIP_R],
    ...arc(rootR - LIP_R, HEIGHT - LIP_R, LIP_R, 0, Math.PI / 2).slice(1),
    [BORE / 2, HEIGHT],
  ];
}

/** Cavity: the body wall offset in by the average wall, closing to the drawn bore. */
function buildInner(): ProfilePoint[] {
  const bodyR = BODY_DIAMETER / 2 - WALL;
  const neckR = NECK_DIAMETER / 2 - WALL;
  const boreR = BORE / 2;
  const a45 = Math.PI / 4;
  const shoulderR = SHOULDER_R - WALL;
  const shoulderCx = BODY_DIAMETER / 2 - SHOULDER_R;
  const shoulderEnd: ProfilePoint = [
    shoulderCx + shoulderR * Math.cos(a45),
    BODY_TOP + shoulderR * Math.sin(a45),
  ];
  // 45° line through the shoulder end, met by the straight inner neck
  const neckY = shoulderEnd[1] + (shoulderEnd[0] - neckR);
  const beadBottom = HEIGHT - X_HEIGHT;

  const heelCx = BODY_DIAMETER / 2 - HEEL_R;
  const heelR = HEEL_R - WALL;
  const floorAngle = Math.asin(Math.min(1, (HEEL_R - BASE_THICKNESS) / heelR));
  const floorR = heelCx + heelR * Math.cos(-floorAngle);

  return [
    [0, BASE_THICKNESS],
    [floorR, BASE_THICKNESS],
    ...arc(heelCx, HEEL_R, heelR, -floorAngle, 0).slice(1),
    [bodyR, BODY_TOP],
    ...arc(shoulderCx, BODY_TOP, shoulderR, 0, a45).slice(1),
    [neckR, neckY],
    [neckR, beadBottom],
    [boreR, beadBottom],
    [boreR, HEIGHT],
  ];
}

export function buildAfrinBottle(): Bottle {
  const outer = buildOuter();
  const inner = buildInner();
  const resinG = ((revolvedVolume(outer) - revolvedVolume(inner)) / 1000) * HDPE_DENSITY;
  const now = new Date();
  const bottle: Bottle = {
    id: uuidv4(),
    name: '23 mL Afrin',
    shape: 'boston-round',
    dimensions: {
      ...DEFAULT_DIMENSIONS['boston-round'],
      height: HEIGHT,
      bodyHeight: HEIGHT,
      diameter: BODY_DIAMETER,
      baseDiameter: BODY_DIAMETER,
      neckDiameter: THREAD_T,
      neckHeight: X_HEIGHT,
      neckFinish: '18mm 415 CR',
      shoulderCurveRadius: SHOULDER_R,
      shoulderAngle: 45,
      wallThickness: WALL,
    },
    capStyle: 'child-resistant',
    capColor: '#FFFFFF',
    bodyColor: '#2563EB',
    material: 'HDPE',
    opacity: 1,
    labelZones: [],
    plasticWeight: Math.round(resinG * 10) / 10,
    profile: {
      source: 'Anchor Rigid Plastics 18mm 415 CR Afrin bottle (HDPE, 1.00 mm average wall)',
      outer,
      inner,
      wallThickness: WALL,
      thread: {
        rootRadius: THREAD_E / 2,
        crestRadius: THREAD_T / 2,
        endY: HEIGHT - THREAD_S,
        startY: HEIGHT - THREAD_S - THREAD_PITCH * THREAD_TURNS,
        pitch: THREAD_PITCH,
      },
    },
    volume: 0,
    surfaceArea: 0,
    createdAt: now,
    updatedAt: now,
    isCustom: false,
    presetId: 'afrin-23',
  };
  bottle.volume = VolumeCalculator.calculate(bottle);
  bottle.surfaceArea = VolumeCalculator.calculateSurfaceArea(bottle);
  return bottle;
}
