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

/** Berry ZB33OBA118H "ALEVE 118cc oval", CP-140784-PRT01 rev B (mold P182-1): the 86.5cc footprint, taller. */
const DRAWING_118_OVAL: BottleDrawingSpec = {
  ...DRAWING_86_OVAL,
  source: 'Berry ZB33OBA118H Aleve 118cc oval, CP-140784-PRT01 rev B, M33-SP400 "Special H" finish',
  height: 3.334 * INCH,
  // Front view: shoulder tangent at 2.593, TSC at 2.791
  shoulderRadius: (2.791 - 2.593) * INCH,
  ovalShoulderStart: 2.228 * INCH, // side view shoulder tangent
  neckCollarHeight: (3.334 - 2.791 - 0.531) * INCH,
  // 2.280 front label, centred on the straight wall between the heel and shoulder
  labelPanel: { fromBase: 0.219 * INCH, height: 2.28 * INCH },
};

/** Berry ZB45OBA232H "ALEVE 232.5cc oval", CP-140785-PRT01 rev C (molds P183-1, 4715-A), M45-SP400 Special H. */
const DRAWING_232_OVAL: BottleDrawingSpec = {
  ...DRAWING_86_OVAL,
  source: 'Berry ZB45OBA232H Aleve 232.5cc oval, CP-140785-PRT01 rev C, M45-SP400 "Special H" finish',
  bodyDiameter: 2.757 * INCH, // front (major axis)
  heelDiameter: 2.717 * INCH, // front width at the base
  ovalDepth: 2.126 * INCH, // side (minor axis)
  height: 3.882 * INCH,
  // Front view: shoulder tangent at 3.046, TSC at 3.320
  shoulderRadius: (3.320 - 3.046) * INCH,
  ovalShoulderStart: 2.388 * INCH, // side view shoulder tangent
  // Neck diameter not dimensioned: just over T, as on the 33 mm sizes
  neckDiameter: 1.78 * INCH,
  neckCollarHeight: (3.882 - 3.320 - 0.549) * INCH,
  beadDiameter: 1.78 * INCH,
  finishHeight: 0.549 * INCH,
  threadDiameter: 1.725 * INCH,
  rootDiameter: 1.631 * INCH,
  boreDiameter: 1.475 * INCH,
  // 2.734 front label, centred on the straight wall between the heel and shoulder
  labelPanel: { fromBase: 0.219 * INCH, height: 2.734 * INCH },
  // .047 min push-up (.094 nominal, as on the 33 mm sizes) inside the Ø1.844 stacker
  pushUp: { depth: 0.094 * INCH, diameter: 1.844 * INCH },
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

/** Berry ZC3340ASYOF 33mm NCR closure assembly, overmolded (Aleve), CP-210242-ASM01 rev D: the same shell, non-CR. */
const CLOSURE_33_NCR_ALEVE: ClosureDrawing = {
  ...CLOSURE_33_CR_ALEVE,
  source: 'Berry ZC3340ASYOF 33mm NCR assembly overmolded (Aleve), CP-210242-ASM01 rev D (PP/TPE outer, CR-III inner PP, 8.02 g)',
  topText: { arcTop: '', arcBottom: '', center: ['ALEVE'] },
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
  {
    capacity: 118,
    plasticWeight: 12.8,
    weightTolerance: 0.5,
    diameter: 56.11,
    height: 84.68,
    neckFinish: 'M33-SP400 Special H',
    drawing: DRAWING_118_OVAL,
    closure: CLOSURE_33_NCR_ALEVE,
    capStyle: 'screw-cap',
    name: '118 mL Oval',
  },
  {
    capacity: 232.5,
    plasticWeight: 19.2,
    weightTolerance: 1,
    diameter: 70.03,
    height: 98.6,
    neckFinish: 'M45-SP400 Special H',
    drawing: DRAWING_232_OVAL,
    name: '232.5 mL Oval',
  },
];

export function buildPainCardioBottles(template?: Partial<Bottle>): Bottle[] {
  return buildStockBottles(PAIN_CARDIO_BOTTLES, 'pain-cardio-custom', template);
}
