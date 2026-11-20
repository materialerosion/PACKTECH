/**
 * Portfolio Service
 * Bottle / cap groupings shared by the portfolio and assessment views.
 */

import { Bottle, CAP_STYLE_NAMES, ClosureDrawing } from '@/types/bottle';
import { SKU_PORTFOLIO, SkuPortfolioRow } from '@/data/presets/skuPortfolio';

export interface CapGroup {
  key: string;
  label: string;
  source: string | null;
  style: string;
  material: string | null;
  diameterMm: number | null;
  heightMm: number | null;
  finishes: string[];
  bottles: string[];
  /** Representative bottle that carries this closure drawing (for 3D preview). */
  sampleBottle: Bottle | null;
  closure: ClosureDrawing | null;
  capColor: string;
}

/** Short cap name: the drawing source up to its first comma, else the cap style. */
export function closureLabel(bottle: Bottle): string {
  if (bottle.closure) return bottle.closure.source.split(',')[0].trim();
  return `${CAP_STYLE_NAMES[bottle.capStyle] ?? bottle.capStyle} (generic)`;
}

/** Nominal capacity from the bottle name when it starts with a number (e.g. "86.5 mL Oval"). */
export function bottleNominalCapacity(bottle: Bottle): number {
  const fromName = parseFloat(bottle.name);
  return Number.isFinite(fromName) ? fromName : bottle.volume;
}

/** Unique caps in a portfolio with the bottles that use them, smallest first. */
export function groupCaps(bottles: Bottle[]): CapGroup[] {
  const groups = new Map<string, CapGroup>();
  [...bottles]
    .sort((a, b) => a.volume - b.volume)
    .forEach((bottle) => {
      const c = bottle.closure;
      const key = c ? c.source : `generic-${bottle.capStyle}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: closureLabel(bottle),
          source: c?.source ?? null,
          style: CAP_STYLE_NAMES[bottle.capStyle] ?? bottle.capStyle,
          material: c?.material ?? null,
          diameterMm: c ? Math.max(c.topDiameter, c.bottomDiameter) : null,
          heightMm: c?.height ?? null,
          finishes: [],
          bottles: [],
          sampleBottle: c ? bottle : null,
          closure: c ?? null,
          capColor: bottle.capColor,
        });
      }
      const g = groups.get(key)!;
      if (!g.finishes.includes(bottle.dimensions.neckFinish)) g.finishes.push(bottle.dimensions.neckFinish);
      g.bottles.push(bottle.name);
      if (!g.sampleBottle && c) {
        g.sampleBottle = bottle;
        g.closure = c;
        g.capColor = bottle.capColor;
      }
    });
  return [...groups.values()];
}

const SIZE_TOLERANCE_ML = 0.6;

/**
 * SKUs from NA Packaging Category Portfolio that match a portfolio bottle.
 * Prefers Bottle Size (mL) when present; also matches closure Ø when listed.
 */
export function skusForBottle(bottle: Bottle, catalog: SkuPortfolioRow[] = SKU_PORTFOLIO): SkuPortfolioRow[] {
  const capacity = bottleNominalCapacity(bottle);
  const closureMm = bottle.closure
    ? Math.round(Math.max(bottle.closure.topDiameter, bottle.closure.bottomDiameter))
    : null;

  return catalog.filter((row) => {
    if (row.status && /obsolete|inactive|cancel/i.test(row.status)) return false;

    let sizeOk = false;
    if (row.bottleSizeMl != null) {
      sizeOk = Math.abs(row.bottleSizeMl - capacity) <= SIZE_TOLERANCE_ML;
    }

    let closureOk = true;
    if (row.closureSizeMm != null && closureMm != null) {
      closureOk = Math.abs(row.closureSizeMm - closureMm) <= 1.5;
    }

    // Require a size match when the sheet lists Bottle Size; otherwise no auto-link
    if (row.bottleSizeMl == null) return false;
    return sizeOk && closureOk;
  });
}

/** SKUs linked to any bottle that uses this cap group. */
export function skusForCapGroup(group: CapGroup, bottles: Bottle[]): SkuPortfolioRow[] {
  const linked = bottles.filter((b) => group.bottles.includes(b.name));
  const seen = new Set<string>();
  const out: SkuPortfolioRow[] = [];
  for (const bottle of linked) {
    for (const sku of skusForBottle(bottle)) {
      const key = `${sku.gtin ?? ''}|${sku.bottleDo ?? ''}|${sku.closureDo ?? ''}|${sku.description ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(sku);
    }
  }
  return out;
}
