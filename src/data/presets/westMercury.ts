/**
 * "Iconic" 2-piece pack (West 24mm Mercury, assembly 4204-24-05 rev K, 11.40 ± 1.5 g
 * assembled): oval HDPE bottle with a polystyrene collar snapped over its
 * conical shoulder, from supplier drawings.
 */

import { Bottle, CollarDrawing } from '@/types';
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
    name: '38 mL Iconic',
  },
];

export function buildWestMercuryBottles(template?: Partial<Bottle>): Bottle[] {
  return buildStockBottles(WEST_MERCURY_BOTTLES, 'west-mercury', template);
}
