/**
 * Myerstown Stock HDPE Bottles
 * Supplier spec sheet: nominal capacity, resin weight, and key dimensions.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bottle, DEFAULT_DIMENSIONS } from '@/types';
import { VolumeCalculator } from '@/services/volumeCalculator';

export interface StockBottleSpec {
  capacity: number;          // mL (nominal)
  plasticWeight: number;     // g
  weightTolerance?: number;  // ± g
  diameter: number;          // mm
  height: number;            // mm
  neckFinish: string;
}

export const MYERSTOWN_STOCK_HDPE: StockBottleSpec[] = [
  { capacity: 70.5,  plasticWeight: 10,   weightTolerance: 1,   diameter: 39.67, height: 74.55,  neckFinish: 'M33-SP400' },
  { capacity: 140.5, plasticWeight: 12.9,                       diameter: 50.62, height: 87.17,  neckFinish: 'L38-400 Special' },
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
 * Build series bottles from the spec sheet. Appearance (shape, colors, cap,
 * wall, shoulder) is taken from `template` when provided.
 */
export function buildMyerstownBottles(template?: Partial<Bottle>): Bottle[] {
  const shape = template?.shape ?? 'boston-round';
  const baseDims = { ...DEFAULT_DIMENSIONS[shape], ...template?.dimensions };

  return MYERSTOWN_STOCK_HDPE.map((spec) => {
    const now = new Date();
    const neckDiameter = neckSizeFromFinish(spec.neckFinish);
    const neckHeight = FINISH_NECK_HEIGHT[neckDiameter] ?? 10;

    const bottle: Bottle = {
      id: uuidv4(),
      name: `${spec.capacity} mL`,
      shape,
      dimensions: {
        ...baseDims,
        height: spec.height,
        bodyHeight: spec.height - neckHeight,
        diameter: spec.diameter,
        baseDiameter: spec.diameter,
        neckDiameter,
        neckHeight,
        neckFinish: spec.neckFinish,
      },
      capStyle: template?.capStyle ?? 'screw-cap',
      capColor: template?.capColor ?? '#FFFFFF',
      bodyColor: template?.bodyColor ?? '#FFFFFF',
      material: 'HDPE',
      opacity: template?.opacity ?? 1,
      labelZones: [],
      plasticWeight: spec.plasticWeight,
      weightTolerance: spec.weightTolerance,
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
