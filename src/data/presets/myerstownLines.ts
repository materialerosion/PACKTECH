/**
 * Myerstown (MYT) packaging lines per stock bottle, from
 * "NA Stock Bottle Strategy - MYT Working Doc v2.xlsx", sheet "Stock Bottle Baseline", MYT Lines (OTC / Nutritionals).
 */

export type MytArea = 'OTC' | 'Nutritionals';

export interface MytLineAssignment {
  /** Numbered lines the bottle runs on */
  lines: number[];
  /** Marked "x" in the working doc: runs in this area, line not given */
  unspecified?: boolean;
}

export interface MytBottleLines {
  capacity: number;
  /** Spec-sheet cc when it differs from the stock list (e.g. "440cc" for the 400 mL) */
  docCapacity?: number;
  bottleCc: string;
  OTC?: MytLineAssignment;
  Nutritionals?: MytLineAssignment;
}

export const MYT_LINES_SOURCE = 'NA Stock Bottle Strategy - MYT Working Doc v2 (Stock Bottle Baseline)';

export const MYT_AREAS: MytArea[] = ['OTC', 'Nutritionals'];

export const MYERSTOWN_BOTTLE_LINES: MytBottleLines[] = [
  { capacity: 70.5, bottleCc: '87208273', OTC: { lines: [4, 9] }, Nutritionals: { lines: [19] } },
  { capacity: 140.5, bottleCc: '88278798', OTC: { lines: [9] }, Nutritionals: { lines: [7, 19] } },
  { capacity: 237, bottleCc: '87208338', OTC: { lines: [9] }, Nutritionals: { lines: [7, 19] } },
  { capacity: 335, bottleCc: '87208354', Nutritionals: { lines: [6, 7, 19] } },
  { capacity: 400, docCapacity: 440, bottleCc: '91049958', Nutritionals: { lines: [], unspecified: true } },
  { capacity: 548, bottleCc: '87208370', OTC: { lines: [], unspecified: true }, Nutritionals: { lines: [6, 7] } },
  { capacity: 648, bottleCc: '87208281', Nutritionals: { lines: [6] } },
];

export function mytLinesForCapacity(capacity: number): MytBottleLines | undefined {
  return MYERSTOWN_BOTTLE_LINES.find((b) => b.capacity === capacity);
}

/** "OTC 4, 9 · Nutritionals 19" */
export function formatMytLines(entry: MytBottleLines | undefined): string {
  if (!entry) return 'Not in MYT working doc';
  return MYT_AREAS.filter((area) => entry[area])
    .map((area) => {
      const a = entry[area]!;
      const lines = a.lines.length ? a.lines.join(', ') : 'line not given';
      return `${area} ${lines}`;
    })
    .join(' · ');
}
