/**
 * Myerstown Stock HDPE Bottles
 * Supplier spec sheet: nominal capacity, resin weight, and key dimensions.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bottle, CapStyle, ClosureDrawing, DEFAULT_DIMENSIONS } from '@/types';
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
  capStyle?: CapStyle;
}

/** 70.5 mL (60cc) bottle drawing with M33-SP400 finish detail (section A-A), mm. */
const DRAWING_70: BottleDrawingSpec = {
  source: '70.5 mL (60cc) bottle drawing, M33-SP400 finish detail',
  bodyDiameter: 39.67,
  height: 74.55,
  // Heel radius not dimensioned: read off the elevation view
  baseRadius: 1.57,
  shoulderRadius: 3.91,
  // No bead: the finish flares straight into the neck, which meets the shoulder
  // so the body is straight up to 58.65
  neckDiameter: 32.03,
  neckCollarHeight: 1.75,
  beadDiameter: 32.03,
  beadHeight: 0,
  finishHeight: 10.24,
  threadDiameter: 31.83,
  rootDiameter: 29.44,
  boreDiameter: 26.34,
  threadStart: 1.17,
  lipRadius: 0.38,
  threadPitch: INCH / 6, // GPI 33-400: 6 TPI (per closure drawing)
  threadTurns: 1.25,
  labelPanel: { fromBase: 3.91, height: 49.25 },
};

/** 237 mL bottle drawing with M45SP400 finish detail (section A-A), mm. */
const DRAWING_237: BottleDrawingSpec = {
  source: '237 mL bottle drawing, M45SP400 finish detail',
  bodyDiameter: 60.2,
  height: 101.6,
  baseRadius: 6.35,
  shoulderRadius: 7.31,
  // Shoulder meets the neck at Ø41.43; with R7.31 the body runs straight to the
  // top of the label area (6.35 + 70.50)
  neckDiameter: 41.43,
  neckCollarHeight: 5.2,
  beadDiameter: 44.0,
  beadHeight: 2.0,
  finishHeight: 10.24,
  threadDiameter: 43.82,
  rootDiameter: 41.43,
  boreDiameter: 38.63,
  threadStart: 1.17,
  // Lip radius not dimensioned
  lipRadius: 0.5,
  threadPitch: INCH / 6, // 45-400: 6 TPI
  threadTurns: 1.25,
  labelPanel: { fromBase: 6.35, height: 70.5 },
};

/** 250 mL (250cc straight sided) bottle drawing 250PS2XX45L400 with L45SP400 finish detail. */
const DRAWING_250: BottleDrawingSpec = {
  source: '250 mL bottle drawing 250PS2XX45L400 rev D, L45SP400 finish detail',
  bodyDiameter: 2.516 * INCH,
  height: 4.688 * INCH,
  baseRadius: 0.25 * INCH,
  shoulderRadius: 0.406 * INCH,
  // Neck diameter between shoulder and bead not dimensioned
  neckDiameter: 1.70 * INCH,
  neckCollarHeight: 0.169 * INCH,
  beadDiameter: 1.834 * INCH,
  beadHeight: 0.125 * INCH,
  finishHeight: 0.403 * INCH,
  threadDiameter: 1.725 * INCH,
  rootDiameter: 1.631 * INCH,
  boreDiameter: 1.251 * INCH,
  threadStart: 0.046 * INCH,
  // Lip radius not dimensioned
  lipRadius: 0.5,
  threadPitch: INCH / 6, // 45-400: 6 TPI
  threadTurns: 1.25,
  // The label panel spans the whole straight wall, heel to shoulder
  labelPanel: { fromBase: 0.25 * INCH, height: 3.335 * INCH },
};

/** Weatherchem 45mm-400 NutraGen II flip-top closure, drawing S-210-00-08-AC. */
const CLOSURE_45_400_NUTRAGEN: ClosureDrawing = {
  source: 'Weatherchem 45mm-400 NutraGen II flip-top, S-210-00-08-AC (PP, 5.28 g)',
  topDiameter: 1.846 * INCH,
  bottomDiameter: 1.846 * INCH,
  height: 0.625 * INCH,
  bottomBandHeight: 0,
  ribCount: 0,
  ribDepth: 0,
  // Closure "H" .380 seated on the bottle's .403 finish
  skirtDepth: 0.385 * INCH,
  material: 'PP',
  style: 'flip-top',
  flipTop: {
    // Lid height not dimensioned: read off the open-flap view
    lidHeight: 0.2 * INCH,
    notchWidth: 0.835 * INCH,
    logoRadius: 0.703 * INCH,
  },
};

/** 45-400 push-down-and-turn child-resistant closure drawing. */
const CLOSURE_45_400_CR: ClosureDrawing = {
  source: '45 mm-400 CR closure drawing (inner and outer injection PP)',
  topDiameter: 1.976 * INCH,
  bottomDiameter: 1.989 * INCH,
  height: 0.704 * INCH,
  bottomBandHeight: 0.064 * INCH,
  // Serration count and depth not given: scaled from the 33 mm drawing
  ribCount: 120,
  ribDepth: 0.008 * INCH,
  // Closure "H" (.381–.399) plus the depressed bottom band
  skirtDepth: (0.39 + 0.064) * INCH,
  topText: { arcTop: 'PUSH DOWN & TURN', arcBottom: 'TO OPEN', center: ['CLOSE', 'TIGHTLY'] },
  material: 'PP',
};

/** 33-400 push-down-and-turn child-resistant closure drawing (REV-D). */
const CLOSURE_33_400_CR: ClosureDrawing = {
  source: '33 mm-400 CR closure drawing REV-D (inner and outer injection PP)',
  topDiameter: 1.510 * INCH,
  bottomDiameter: 1.535 * INCH,
  height: 0.684 * INCH,
  bottomBandHeight: 0.064 * INCH,
  ribCount: 80,
  ribDepth: 0.008 * INCH,
  // Closure "H" (.381–.399) plus the depressed bottom band
  skirtDepth: (0.39 + 0.064) * INCH,
  topText: { arcTop: 'PUSH DOWN & TURN', arcBottom: 'TO OPEN', center: ['CLOSE', 'TIGHTLY'] },
  material: 'PP',
};

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
  { capacity: 70.5,  plasticWeight: 10,   weightTolerance: 1,   diameter: 39.67, height: 74.55,  neckFinish: 'M33-SP400', drawing: DRAWING_70, closure: CLOSURE_33_400_CR, capStyle: 'child-resistant' },
  { capacity: 140.5, plasticWeight: 12.9,                       diameter: 50.62, height: 87.17,  neckFinish: 'L38-400 Special', drawing: DRAWING_140, closure: CLOSURE_38_400_CR, capStyle: 'child-resistant' },
  { capacity: 237,   plasticWeight: 19.5, weightTolerance: 1,   diameter: 60.2,  height: 101.6,  neckFinish: 'M45SP400', drawing: DRAWING_237, closure: CLOSURE_45_400_CR, capStyle: 'child-resistant' },
  { capacity: 250,   plasticWeight: 27.5, weightTolerance: 2,   diameter: 63.91, height: 119.08, neckFinish: 'L45SP400', drawing: DRAWING_250, closure: CLOSURE_45_400_NUTRAGEN, capStyle: 'flip-top' },
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
      capStyle: spec.capStyle ?? template?.capStyle ?? 'screw-cap',
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
