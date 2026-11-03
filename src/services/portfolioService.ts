/**
 * Portfolio Service
 * Bottle / cap groupings shared by the portfolio and assessment views.
 */

import { Bottle, CAP_STYLE_NAMES } from '@/types/bottle';

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
}

/** Short cap name: the drawing source up to its first comma, else the cap style. */
export function closureLabel(bottle: Bottle): string {
  if (bottle.closure) return bottle.closure.source.split(',')[0].trim();
  return `${CAP_STYLE_NAMES[bottle.capStyle] ?? bottle.capStyle} (generic)`;
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
        });
      }
      const g = groups.get(key)!;
      if (!g.finishes.includes(bottle.dimensions.neckFinish)) g.finishes.push(bottle.dimensions.neckFinish);
      g.bottles.push(bottle.name);
    });
  return [...groups.values()];
}
