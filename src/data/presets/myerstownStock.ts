/**
 * Myerstown Stock HDPE Bottles
 * Supplier spec sheet: nominal capacity, resin weight, and key dimensions.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bottle, ClosureDrawing, DEFAULT_DIMENSIONS } from '@/types';
import { VolumeCalculator } from '@/services/volumeCalculator';
import { BottleDrawingSpec, INCH, buildDrawingProfile } from '@/services/drawingProfile';

export interface StockBottleSpec {
  capacity: number;          // mL (nominal)
  plasticWeight: number;     // g
  weightTolerance?: number;  // ± g
  diameter: number;          // mm
  height: number;            // mm, base to top of finish
  neckFinish: string;
  drawing?: BottleDrawingSpec;
  closure?: ClosureDrawing;
}

/** 140.5 mL bottle drawing with finish detail (section A-A); inches converted to mm. */
const DRAWING_140: BottleDrawingSpec = {
  source: '140.5 mL bottle drawing, L38-400 Special finish detail',
  bodyDiameter: 1.993 * INCH,
  height: 3.432 * INCH,
  baseRadius: 0.141 * INCH,
  shoulderRadius: 0.313 * INCH,
  // Not dimensioned: read off the elevation view
  neckDiameter: 1.42 * INCH,
  neckCollarHeight: 1.0,
  beadDiameter: 1.564 * INCH,
  beadHeight: 0.110 * INCH,
  finishHeight: 0.398 * INCH,
  threadDiameter: 1.464 * INCH,
  rootDiameter: 1.370 * INCH,
  boreDiameter: 1.250 * INCH,
  threadStart: 0.046 * INCH,
  lipRadius: 0.031 * INCH,
  threadPitch: INCH / 6, // 38-400: 6 TPI
  threadTurns: 1.25,
  labelPanel: { fromBase: 0.328 * INCH, height: 1.945 * INCH },
};

/** 38-400 push-down-and-turn child-resistant closure drawing. */
const CLOSURE_38_400_CR: ClosureDrawing = {
  source: '38 mm-400 CR closure drawing (inner and outer injection PP)',
  topDiameter: 1.718 * INCH,
  bottomDiameter: 1.737 * INCH,
  height: 0.706 * INCH,
  bottomBandHeight: 0.064 * INCH,
  ribCount: 120,
  ribDepth: 0.35,
  // Closure "H" (.381–.399) plus the depressed bottom band
  skirtDepth: (0.39 + 0.064) * INCH,
  topText: { arcTop: 'PUSH DOWN & TURN', arcBottom: 'TO OPEN', center: ['CLOSE', 'TIGHTLY'] },
  material: 'PP',
};

export const MYERSTOWN_STOCK_HDPE: StockBottleSpec[] = [
  { capacity: 70.5,  plasticWeight: 10,   weightTolerance: 1,   diameter: 39.67, height: 74.55,  neckFinish: 'M33-SP400' },
  { capacity: 140.5, plasticWeight: 12.9,                       diameter: 50.62, height: 87.17,  neckFinish: 'L38-400 Special', drawing: DRAWING_140, closure: CLOSURE_38_400_CR },
  { capacity: 237,   plasticWeight: 19.5, weightTolerance: 1,   diameter: 60.2,  height: 101.6,  neckFinish: 'M45SP400' },
  { capacity: 250,   plasticWeight: 27.5, weightTolerance: 2,   diameter: 63.91, height: 119.08, neckFinish: 'L45SP400' },
  { capacity: 335,   plasticWeight: 28.3, weightTolerance: 1.5, diameter: 65.13, height: 126.03, neckFinish: 'L45-400' },
  { capacity: 400,   plasticWeight: 37,   weightTolerance: 2,   diameter: 73.03, height: 130.18, neckFinish: 'L45SP400' },
  { capacity: 548,   plasticWeight: 32.4, weightTolerance: 1.5, diameter: 78.08, height: 141.48, neckFinish: 'L45-SP400' },
  { capacity: 625,   plasticWeight: 51.5, weightTolerance: 1,   diameter: 80.26, height: 154.86, neckFinish: 'L45SP400' },
  { capacity: 648,   plasticWeight: 42,   weightTolerance: 2,   diameter: 80.26, height: 156.13, neckFinish: 'L45SP400' },
];

// Approximate SPI 400-series finish height (H dimension) by neck size, mm
const FINISH_NECK_HEIGHT: Record<number, number> = { 33: 9.4, 38: 9.9, 45: 10.4 };

function neckSizeFromFinish(finish: string): number {
  const match = finish.match(/(\d{2})/);
  return match ? Number(match[1]) : 38;
}

/**
 * Dimension fields for a spec-sheet row. `bodyHeight` is base to top of
 * finish; the parametric shapes treat the neck as the top `neckHeight` of it.
 */
export function stockDimensions(spec: StockBottleSpec) {
  if (spec.drawing) {
    const d = spec.drawing;
    const profile = buildDrawingProfile(d, spec.plasticWeight);
    return {
      height: spec.height,
      bodyHeight: spec.height,
      diameter: spec.diameter,
      baseDiameter: spec.diameter,
      neckDiameter: Math.round(d.threadDiameter * 100) / 100,
      neckHeight: Math.round((d.finishHeight + d.beadHeight) * 100) / 100,
      neckFinish: spec.neckFinish,
      shoulderCurveRadius: Math.round(d.shoulderRadius * 100) / 100,
      wallThickness: profile.wallThickness,
    };
  }
  const neckDiameter = neckSizeFromFinish(spec.neckFinish);
  return {
    height: spec.height,
    bodyHeight: spec.height,
    diameter: spec.diameter,
    baseDiameter: spec.diameter,
    neckDiameter,
    neckHeight: FINISH_NECK_HEIGHT[neckDiameter] ?? 10,
    neckFinish: spec.neckFinish,
  };
}

/**
 * Build series bottles from the spec sheet. Appearance (shape, colors, cap,
 * wall, shoulder) is taken from `template` when provided.
 */
export function buildMyerstownBottles(template?: Partial<Bottle>): Bottle[] {
  const shape = template?.shape ?? 'boston-round';
  const baseDims = { ...DEFAULT_DIMENSIONS[shape], ...template?.dimensions };

  return MYERSTOWN_STOCK_HDPE.map((spec) => {
    const now = new Date();
    const bottle: Bottle = {
      id: uuidv4(),
      name: `${spec.capacity} mL`,
      shape,
      dimensions: { ...baseDims, ...stockDimensions(spec) },
      capStyle: spec.closure ? 'child-resistant' : template?.capStyle ?? 'screw-cap',
      capColor: template?.capColor ?? '#FFFFFF',
      bodyColor: template?.bodyColor ?? '#FFFFFF',
      material: 'HDPE',
      opacity: template?.opacity ?? 1,
      labelZones: [],
      plasticWeight: spec.plasticWeight,
      weightTolerance: spec.weightTolerance,
      profile: spec.drawing ? buildDrawingProfile(spec.drawing, spec.plasticWeight) : undefined,
      closure: spec.closure,
      volume: 0,
      surfaceArea: 0,
      createdAt: now,
      updatedAt: now,
      isCustom: false,
      presetId: 'myerstown-stock-hdpe',
    };

    bottle.volume = VolumeCalculator.calculate(bottle);
    bottle.surfaceArea = VolumeCalculator.calculateSurfaceArea(bottle);
    return bottle;
  });
}
