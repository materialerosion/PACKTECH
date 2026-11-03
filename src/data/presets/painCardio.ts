/**
 * Pain & Cardio custom bottles and closures, from supplier drawings.
 */

import { Bottle, ClosureDrawing } from '@/types';
import { BottleDrawingSpec, INCH } from '@/services/drawingProfile';
import { StockBottleSpec, buildStockBottles } from './myerstownStock';

/** Berry ZB33OBA87H "ALEVE 86.5cc oval", CP-140783-PRT01 rev B (mold P181-1), M33-SP400 Special H. */
const DRAWING_86_OVAL: BottleDrawingSpec = {
  source: 'Berry ZB33OBA87H Aleve 86.5cc oval, CP-140783-PRT01 rev B, M33-SP400 "Special H" finish',
  bodyDiameter: 2.209 * INCH, // front (major axis)
  heelDiameter: 2.169 * INCH, // front width at the base
  ovalDepth: 1.64 * INCH, // side (minor axis)
  height: 2.586 * INCH,
  baseRadius: 0.125 * INCH,
  // Front view: shoulder tangent at 1.824, TSC at 2.043
  shoulderRadius: (2.043 - 1.824) * INCH,
  ovalShoulderStart: 1.48 * INCH, // side view shoulder tangent
  // Neck diameter not dimensioned; the closure allows at most Ø1.377 at the shoulder
  neckDiameter: 1.3 * INCH,
  neckCollarHeight: (2.586 - 2.043 - 0.531) * INCH,
  beadDiameter: 1.3 * INCH,
  beadHeight: 0,
  finishHeight: 0.531 * INCH,
  threadDiameter: 1.253 * INCH,
  rootDiameter: 1.159 * INCH,
  boreDiameter: 1.003 * INCH,
  threadStart: 0.046 * INCH,
  lipRadius: 0.016 * INCH,
  threadPitch: INCH / 6, // single lead, 6 TPI
  threadTurns: 1, // 1 revolution of thread
  // 1.562 front label, centred on the straight wall between the heel and shoulder
  labelPanel: { fromBase: 0.194 * INCH, height: 1.562 * INCH },
  // .094 nominal push-up inside the Ø1.375 stacker ring
  pushUp: { depth: 0.094 * INCH, diameter: 1.375 * INCH },
};

/** Berry ZR3340ASXOA 33mm CR-III closure assembly, overmolded (Aleve), CP-210075-ASM01 rev D. */
const CLOSURE_33_CR_ALEVE: ClosureDrawing = {
  source: 'Berry ZR3340ASXOA 33mm CR-III assembly overmolded (Aleve), CP-210075-ASM01 rev D (PP/TPE outer, PP inner, 8.30 g)',
  topDiameter: 1.56 * INCH,
  bottomDiameter: 1.573 * INCH,
  height: 0.739 * INCH,
  // (.13) reference band at the Ø1.517 bottom of the shell
  bottomBandHeight: 0.13 * INCH,
  // Smooth TPE overmold, no serrations
  ribCount: 0,
  ribDepth: 0,
  // Closure "H" .394 plus the bottom band
  skirtDepth: (0.394 + 0.13) * INCH,
  topText: { arcTop: 'PUSH AND TURN TO OPEN', arcBottom: 'CLOSE TIGHTLY', center: ['ALEVE'] },
  material: 'PP/TPE',
};

export const PAIN_CARDIO_BOTTLES: StockBottleSpec[] = [
  {
    capacity: 86.5,
    plasticWeight: 10,
    weightTolerance: 0.5,
    diameter: 56.11,
    height: 65.68,
    neckFinish: 'M33-SP400 Special H',
    drawing: DRAWING_86_OVAL,
    closure: CLOSURE_33_CR_ALEVE,
    capStyle: 'child-resistant',
    name: '86.5 mL Oval',
  },
];

export function buildPainCardioBottles(template?: Partial<Bottle>): Bottle[] {
  return buildStockBottles(PAIN_CARDIO_BOTTLES, 'pain-cardio-custom', template);
}
