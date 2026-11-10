/**
 * Amapharm Stock PET Bottles (DE & PA).
 * Alpha Packaging EU drawing for Germany; Axium Plastics drawing for the PA site.
 */

import { Bottle, ClosureDrawing } from '@/types';
import { BottleDrawingSpec, INCH } from '@/services/drawingProfile';
import { StockBottleSpec, buildStockBottles } from '@/data/presets/myerstownStock';

/**
 * Van Blarcom SAF CAP III-A, 45 mm, drawing 2064 rev H.
 * Outer shell A / B / C; inner H is the seated skirt depth without liner.
 */
const CLOSURE_SAF_CAP_III_A_45: ClosureDrawing = {
  source: 'Van Blarcom SAF CAP III-A 45 mm, DWG 2064 rev H (PP)',
  topDiameter: 1.98 * INCH,
  bottomDiameter: 2.0 * INCH,
  height: 0.655 * INCH,
  bottomBandHeight: 0,
  // Rib count not on the drawing: fine full-height knurl
  ribCount: 120,
  ribDepth: 0.008 * INCH,
  skirtDepth: 0.39 * INCH,
  topText: { arcTop: 'CLOSE TIGHTLY', arcBottom: 'PUSH DOWN & TURN', center: ['TO OPEN'] },
  material: 'PP',
};

/**
 * Novio Packaging 45 mm child-resistant, PWCD-045-04-R3 / DR01097_1 (DE / Alpha).
 * Outer OD and height from the elevation; skirt depth is the inner H without liner.
 */
const CLOSURE_NOVIO_45_CR: ClosureDrawing = {
  source: 'Novio Packaging 45mm CR graphic option 2, PWCD-045-04-R3 rev 3 (PP, 9.1 g)',
  topDiameter: 49.87,
  bottomDiameter: 50.63,
  height: 16.12,
  bottomBandHeight: 0,
  ribCount: 120,
  ribDepth: 0.2,
  skirtDepth: 10.06, // inner H 10.06 ± 0.18
  topText: { arcTop: 'CLOSE TIGHTLY', arcBottom: 'PUSH DOWN & TURN', center: ['TO OPEN'] },
  material: 'PP',
};

/** Shared 45-400 finish (T / E / H / S / I) from both drawings. */
const FINISH_45_400 = {
  finishHeight: 0.403 * INCH,
  threadDiameter: 1.725 * INCH,
  rootDiameter: 1.631 * INCH,
  boreDiameter: 1.251 * INCH,
  threadStart: 0.046 * INCH,
  lipRadius: 0.5,
  threadPitch: INCH / 6, // 6 TPI
  threadTurns: 1.25,
} as const;

/**
 * Alpha Packaging SJ 250PS1XX45L400-EU, 250 CC straight sided PET (Germany).
 * Weight 28 ± 1 g, overflow 293 ± 9 mL, min wall .012 in.
 */
const DRAWING_ALPHA_250_EU: BottleDrawingSpec = {
  source: 'Alpha Packaging SJ 250PS1XX45L400-EU, 250 CC straight sided PET (Germany)',
  bodyDiameter: 2.516 * INCH,
  height: 4.375 * INCH,
  baseRadius: 0.188 * INCH,
  shoulderRadius: 0.406 * INCH,
  // Neck OD between shoulder and bead not dimensioned
  neckDiameter: 1.7 * INCH,
  // 4.375 − 3.669 body-to-shoulder − H .403 − bead .125
  neckCollarHeight: 0.178 * INCH,
  beadDiameter: 1.834 * INCH,
  beadHeight: 0.125 * INCH,
  ...FINISH_45_400,
  labelPanel: { fromBase: 0.188 * INCH, height: 3.2 * INCH },
  // Section B-B .100 push-up; standing ring diameter not dimensioned
  pushUp: { depth: 0.1 * INCH, diameter: 1.92 * INCH },
};

/**
 * Axium Plastics AX-1587-0, 250cc PACKER PETE (PA site).
 * Weight 28 ± 1 g, overflow 293 ± 5 mL before decorating, min wall .012 in.
 */
const DRAWING_AXIUM_250_PA: BottleDrawingSpec = {
  source: 'Axium Plastics AX-1587-0, 250cc PACKER PETE (PA site)',
  bodyDiameter: 2.516 * INCH,
  height: 4.375 * INCH,
  baseRadius: 0.188 * INCH,
  shoulderRadius: 0.406 * INCH,
  neckDiameter: 1.7 * INCH,
  // Body to shoulder 3.972 = height − H; short collar under the transfer bead
  neckCollarHeight: 0.05 * INCH,
  // Outer neck callout Ø1.806 on the elevation
  beadDiameter: 1.806 * INCH,
  beadHeight: 0.125 * INCH,
  ...FINISH_45_400,
  labelPanel: { fromBase: 0.25 * INCH, height: 2.85 * INCH },
  pushUp: { depth: 0.1 * INCH, diameter: 1.92 * INCH },
};

export const AMAPHARM_STOCK_PET: StockBottleSpec[] = [
  {
    name: '250 mL Alpha (DE)',
    capacity: 250,
    plasticWeight: 28,
    weightTolerance: 1,
    diameter: 63.91,
    height: 111.13,
    neckFinish: '45-400',
    material: 'PET',
    drawing: DRAWING_ALPHA_250_EU,
    closure: CLOSURE_NOVIO_45_CR,
    capStyle: 'child-resistant',
  },
  {
    name: '250 mL Axium (PA)',
    capacity: 250,
    plasticWeight: 28,
    weightTolerance: 1,
    diameter: 63.91,
    height: 111.13,
    neckFinish: 'M45-SP400',
    material: 'PET',
    drawing: DRAWING_AXIUM_250_PA,
    closure: CLOSURE_SAF_CAP_III_A_45,
    capStyle: 'child-resistant',
  },
];

export function buildAmapharmPetBottles(template?: Partial<Bottle>): Bottle[] {
  return buildStockBottles(AMAPHARM_STOCK_PET, 'amapharm-stock-pet', template);
}
