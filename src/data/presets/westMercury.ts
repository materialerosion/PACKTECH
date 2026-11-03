/**
 * "Iconic" 2-piece pack (West 24mm Mercury, assembly 4204-24-05 rev K, 11.40 ± 1.5 g
 * assembled): oval HDPE bottle with a polystyrene collar snapped over its
 * conical shoulder, from supplier drawings.
 */

import { Bottle, ClosureDrawing, CollarDrawing } from '@/types';
import { BottleDrawingSpec, INCH } from '@/services/drawingProfile';
import { StockBottleSpec, buildStockBottles } from './myerstownStock';

const BODY_TOP = 0.765 * INCH; // (.765) ref: OAH 2.104 less 1.339 panel-to-top

/** West 7002-12-24 "24mm Mercury bottle, 38cc", rev P. */
const DRAWING_MERCURY_38: BottleDrawingSpec = {
  source: 'West 7002-12-24 24mm Mercury 38cc bottle, rev P (HDPE)',
  bodyDiameter: 1.903 * INCH, // major ellipse
  ovalDepth: 1.384 * INCH, // minor ellipse
  height: 2.104 * INCH, // OAH
  baseRadius: 0.06 * INCH, // not dimensioned
  shoulderRadius: 0,
  // Straight cone above the 1.758 major / 1.239 minor undercut; band height not dimensioned
  cone: { bodyTop: BODY_TOP, undercutDiameter: 1.758 * INCH, undercutHeight: 0.08 * INCH },
  // Cone meets the transfer bead; neck diameter not dimensioned
  neckDiameter: 0.93 * INCH,
  neckCollarHeight: 0,
  // (Ø.952) max transfer bead, with the 2X .137 anti-rotation lugs (not modelled)
  beadDiameter: 0.952 * INCH,
  beadHeight: 0.13 * INCH,
  finishHeight: 0.392 * INCH, // "H"
  threadDiameter: 0.931 * INCH, // "T"
  rootDiameter: 0.85 * INCH, // "E"
  boreDiameter: 0.73 * INCH, // "I" min
  threadStart: 0.03 * INCH, // "S"
  lipRadius: 0.01 * INCH,
  // Double lead, 180° apart, 1/2 turn: pitch .125, lead .250
  threadPitch: 0.25 * INCH,
  threadTurns: 0.5,
  threadStarts: 2,
  // .031 min push-up; stacker diameter not dimensioned
  pushUp: { depth: 0.031 * INCH, diameter: 1.1 * INCH },
};

/** West 4204-24-20 "24mm Mercury collar", rev W. */
const COLLAR_MERCURY_24: CollarDrawing = {
  source: 'West 4204-24-20 24mm Mercury collar, rev W (polystyrene, 4.8 g)',
  material: 'PS',
  baseWidth: 1.904 * INCH, // major ellipse
  baseDepth: 1.38 * INCH, // minor ellipse
  topDiameter: 1.264 * INCH, // tab lug width through ℄
  holeDiameter: 0.952 * INCH, // (Ø.952) ref
  height: 0.882 * INCH, // tab step height
  tabHeight: 0.021 * INCH, // (.903) overall less the step height; (.902) on assembly 4204-24-05
  wallThickness: 0.052 * INCH,
  // Base on the top of the bottle body (.015 max gap), snapped into the undercut
  seatY: BODY_TOP,
};

/** West 4204-24-13 "24mm Aleve closure", rev B: tapered smooth shell, lugs on the inside. */
const CLOSURE_24_ALEVE: ClosureDrawing = {
  source: 'West 4204-24-13 24mm Aleve closure, rev B (polypropylene, 3.3 g)',
  topDiameter: 1.166 * INCH, // TSC
  bottomDiameter: 1.356 * INCH, // -2° T/S
  height: 0.516 * INCH, // with scuff ring; (.501) without
  // (.134) below line 'B'
  bottomBandHeight: 0.134 * INCH,
  ribCount: 0,
  ribDepth: 0,
  // "H" .447: top of the closure seat to the bottom of the skirt
  skirtDepth: 0.447 * INCH,
  topPictorial: 'push-and-turn',
  material: 'PP',
};

const BODY_TOP_58 = 1.463 * INCH; // (1.463) ref on assembly 4204-24-06

/**
 * West 7002-13-24 58cc bottle, from assembly 4204-24-06 rev H: the 38cc
 * footprint, shoulder and finish on a taller body.
 */
const DRAWING_MERCURY_58: BottleDrawingSpec = {
  ...DRAWING_MERCURY_38,
  source: 'West 7002-13-24 24mm Mercury 58cc bottle, per assembly 4204-24-06 rev H (HDPE)',
  height: 2.802 * INCH, // (2.802) OAH
  cone: { ...DRAWING_MERCURY_38.cone!, bodyTop: BODY_TOP_58 },
};

export const WEST_MERCURY_BOTTLES: StockBottleSpec[] = [
  {
    capacity: 38,
    plasticWeight: 6.4,
    weightTolerance: 0.1,
    diameter: 48.34,
    height: 53.44,
    neckFinish: '24mm Mercury (double lead)',
    drawing: DRAWING_MERCURY_38,
    collar: COLLAR_MERCURY_24,
    closure: CLOSURE_24_ALEVE,
    capStyle: 'child-resistant',
    name: '38 mL Iconic',
  },
  {
    capacity: 58,
    // 14.50 ± 2.5 g assembled, less the 4.8 g collar; no bottle drawing yet
    plasticWeight: 9.7,
    diameter: 48.34,
    height: 71.17,
    neckFinish: '24mm Mercury (double lead)',
    drawing: DRAWING_MERCURY_58,
    collar: { ...COLLAR_MERCURY_24, seatY: BODY_TOP_58 },
    closure: CLOSURE_24_ALEVE,
    capStyle: 'child-resistant',
    name: '58 mL Iconic',
  },
];

export function buildWestMercuryBottles(template?: Partial<Bottle>): Bottle[] {
  return buildStockBottles(WEST_MERCURY_BOTTLES, 'west-mercury', template);
}
