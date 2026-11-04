/**
 * Portfolio Dimension Comparison
 * Two portfolios side by side: silhouettes at a common scale, a range summary,
 * and per-bottle key measurements with rows aligned across both portfolios.
 */

import { useMemo } from 'react';
import { Bottle } from '@/types';
import { BottleSeries } from '@/types/bottleSeries';
import { INCH, profileTop } from '@/services/drawingProfile';
import { closureLabel } from '@/services/portfolioService';
import { CompareUnits } from './compareSelection';

interface Props {
  portfolioA: BottleSeries;
  portfolioB: BottleSeries;
  units: CompareUnits;
}

/** Key measurements of one bottle; lengths in mm. */
interface Measures {
  capacity: number;
  height: number;
  heightWithClosure: number;
  width: number;
  depth: number;
  footprint: number; // cm²
  shape: string;
  finish: string;
  threadT?: number;
  threadE?: number;
  bore?: number;
  wall?: number;
  weight?: number;
  weightTol?: number;
  label?: number;
  closure: string;
  closureDiameter?: number;
  closureHeight?: number;
  collar?: number;
}

function measure(b: Bottle): Measures {
  const p = b.profile;
  const height = p ? profileTop(p) : b.dimensions.bodyHeight;
  const width = b.dimensions.diameter;
  const ratio = p?.oval?.depthRatio ?? (b.shape === 'oval' ? b.dimensions.widthRatio ?? 1 : 1);
  const depth = width * ratio;
  const c = b.closure;
  return {
    capacity: b.volume,
    height,
    heightWithClosure: height + (c ? c.height - c.skirtDepth : 0),
    width,
    depth,
    footprint: (Math.PI * (width / 2) * (depth / 2)) / 100,
    shape: ratio < 0.99 ? 'Oval' : 'Round',
    finish: b.dimensions.neckFinish,
    threadT: p?.thread ? p.thread.crestRadius * 2 : undefined,
    threadE: p?.thread ? p.thread.rootRadius * 2 : undefined,
    bore: p ? p.inner[p.inner.length - 1][0] * 2 : undefined,
    wall: p?.wallThickness,
    weight: b.plasticWeight,
    weightTol: b.weightTolerance,
    label: p?.labelPanel?.height,
    closure: c ? closureLabel(b).replace(/\s*\(.*\)\s*$/, '') : '—',
    closureDiameter: c?.bottomDiameter,
    closureHeight: c?.height,
    collar: b.collar ? b.collar.height + b.collar.tabHeight : undefined,
  };
}

type Row =
  | { group: string }
  | { label: string; unit?: string; value: (m: Measures, u: CompareUnits) => string; numeric?: (m: Measures) => number | undefined; kind?: 'length' | 'area' };

const len = (mm: number | undefined, u: CompareUnits) =>
  mm === undefined ? '—' : u === 'mm' ? mm.toFixed(1) : (mm / INCH).toFixed(3);

const SQ_CM_PER_SQ_IN = 6.4516;
const area = (cm2: number, u: CompareUnits) => (u === 'mm' ? cm2.toFixed(1) : (cm2 / SQ_CM_PER_SQ_IN).toFixed(2));

const ROWS: Row[] = [
  { group: 'Capacity & mass' },
  { label: 'Brimful capacity', unit: 'mL', value: (m) => m.capacity.toFixed(1), numeric: (m) => m.capacity },
  {
    label: 'Resin weight',
    unit: 'g',
    value: (m) => (m.weight === undefined ? '—' : `${m.weight}${m.weightTol ? ` ± ${m.weightTol}` : ''}`),
    numeric: (m) => m.weight,
  },
  { label: 'Avg. wall (solved)', kind: 'length', value: (m, u) => len(m.wall, u), numeric: (m) => m.wall },
  { group: 'Envelope' },
  { label: 'Height to finish top', kind: 'length', value: (m, u) => len(m.height, u), numeric: (m) => m.height },
  { label: 'Height with closure', kind: 'length', value: (m, u) => len(m.heightWithClosure, u), numeric: (m) => m.heightWithClosure },
  { label: 'Body width (major)', kind: 'length', value: (m, u) => len(m.width, u), numeric: (m) => m.width },
  { label: 'Body depth (minor)', kind: 'length', value: (m, u) => len(m.depth, u), numeric: (m) => m.depth },
  { label: 'Footprint', kind: 'area', value: (m, u) => area(m.footprint, u), numeric: (m) => m.footprint },
  { label: 'Shape', value: (m) => m.shape },
  { label: 'Label panel height', kind: 'length', value: (m, u) => len(m.label, u), numeric: (m) => m.label },
  { group: 'Finish' },
  { label: 'Neck finish', value: (m) => m.finish },
  { label: 'Thread "T"', kind: 'length', value: (m, u) => len(m.threadT, u), numeric: (m) => m.threadT },
  { label: 'Root "E"', kind: 'length', value: (m, u) => len(m.threadE, u), numeric: (m) => m.threadE },
  { label: 'Bore "I"', kind: 'length', value: (m, u) => len(m.bore, u), numeric: (m) => m.bore },
  { group: 'Closure & collar' },
  { label: 'Closure', value: (m) => m.closure },
  { label: 'Closure diameter', kind: 'length', value: (m, u) => len(m.closureDiameter, u), numeric: (m) => m.closureDiameter },
  { label: 'Closure height', kind: 'length', value: (m, u) => len(m.closureHeight, u), numeric: (m) => m.closureHeight },
  { label: 'Collar height', kind: 'length', value: (m, u) => len(m.collar, u), numeric: (m) => m.collar },
];

const unitOf = (row: Extract<Row, { label: string }>, u: CompareUnits) =>
  row.kind === 'length' ? u : row.kind === 'area' ? (u === 'mm' ? 'cm²' : 'in²') : row.unit ?? '';

function range(values: (number | undefined)[]): [number, number] | null {
  const v = values.filter((x): x is number => x !== undefined);
  return v.length ? [Math.min(...v), Math.max(...v)] : null;
}

export default function PortfolioDimensionComparison({ portfolioA, portfolioB, units }: Props) {
  const sides = useMemo(
    () =>
      [portfolioA, portfolioB].map((s) => {
        const bottles = [...s.bottles].sort((a, b) => a.volume - b.volume);
        return { series: s, bottles, measures: bottles.map(measure) };
      }),
    [portfolioA, portfolioB]
  );

  // One mm-to-px scale for every silhouette, so sizes compare directly
  const tallest = Math.max(...sides.flatMap((s) => s.measures.map((m) => m.heightWithClosure)), 1);
  const pxPerMm = 200 / tallest;

  return (
    <div className="space-y-6">
      {/* Silhouettes */}
      <div className="grid grid-cols-2 gap-4">
        {sides.map((side, i) => (
          <div key={side.series.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <SideHeader index={i} series={side.series} />
            <div className="overflow-x-auto px-4 py-4">
              <div className="flex items-end gap-4 min-w-max">
                {side.bottles.map((b, k) => (
                  <div key={b.id} className="flex flex-col items-center">
                    <Silhouette bottle={b} pxPerMm={pxPerMm} tallest={tallest} accent={i === 0 ? '#2563eb' : '#059669'} />
                    <div className="mt-2 text-xs font-semibold text-gray-800 whitespace-nowrap">{b.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono whitespace-nowrap">
                      {len(side.measures[k].heightWithClosure, units)} × {len(side.measures[k].width, units)} {units}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Range summary */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900">Range summary</h4>
          <p className="text-xs text-gray-500">Smallest to largest bottle in each portfolio</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2">Measurement</th>
              <th className="px-4 py-2 text-right text-blue-600">{portfolioA.name}</th>
              <th className="px-4 py-2 text-right text-emerald-600">{portfolioB.name}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ROWS.map((row, r) => {
              if ('group' in row || !row.numeric) return null;
              const cells = sides.map((s) => range(s.measures.map(row.numeric!)));
              const fmt = (v: number) =>
                row.kind === 'length' ? len(v, units) : row.kind === 'area' ? area(v, units) : v.toFixed(1);
              return (
                <tr key={r}>
                  <td className="px-4 py-2 text-gray-700">
                    {row.label} <span className="text-gray-400 text-xs">({unitOf(row, units)})</span>
                  </td>
                  {cells.map((c, i) => (
                    <td key={i} className="px-4 py-2 text-right font-mono text-gray-900">
                      {c ? (c[0] === c[1] ? fmt(c[0]) : `${fmt(c[0])} – ${fmt(c[1])}`) : '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-bottle detail, rows aligned across both portfolios */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {sides.map((side, i) => (
          <div key={side.series.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <SideHeader index={i} series={side.series} />
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[11rem]">
                      Measurement
                    </th>
                    {side.bottles.map((b) => (
                      <th key={b.id} className="px-3 py-2 text-right text-xs font-semibold text-gray-800 whitespace-nowrap">
                        {b.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, r) =>
                    'group' in row ? (
                      <tr key={r} className="bg-gray-50/70">
                        <td
                          colSpan={side.bottles.length + 1}
                          className="sticky left-0 px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                        >
                          {row.group}
                        </td>
                      </tr>
                    ) : (
                      <tr key={r} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="sticky left-0 bg-white px-3 py-1.5 text-gray-700 whitespace-nowrap">
                          {row.label}
                          {unitOf(row, units) && <span className="text-gray-400 text-xs"> ({unitOf(row, units)})</span>}
                        </td>
                        {side.measures.map((m, k) => (
                          <td
                            key={k}
                            title={row.label === 'Closure' ? closureLabel(side.bottles[k]) : undefined}
                            className={`px-3 py-1.5 text-right ${
                              row.numeric
                                ? 'font-mono text-gray-900 whitespace-nowrap'
                                : 'text-gray-700 text-xs leading-snug min-w-[6rem] max-w-[9rem]'
                            }`}
                          >
                            {row.value(m, units)}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SideHeader({ index, series }: { index: number; series: BottleSeries }) {
  return (
    <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
      <span className={`text-xs font-bold ${index === 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
        {index === 0 ? 'A' : 'B'}
      </span>
      <h4 className="text-sm font-semibold text-gray-900 truncate">{series.name}</h4>
      <span className="ml-auto text-xs text-gray-500 whitespace-nowrap">{series.bottles.length} bottles</span>
    </div>
  );
}

/** Front-view outline: body from the drawing profile, plus collar and closure. */
function Silhouette({ bottle, pxPerMm, tallest, accent }: { bottle: Bottle; pxPerMm: number; tallest: number; accent: string }) {
  const p = bottle.profile;
  const top = p ? profileTop(p) : bottle.dimensions.bodyHeight;
  const c = bottle.closure;
  const collar = bottle.collar;
  const halfW = Math.max(
    bottle.dimensions.diameter / 2,
    c ? c.bottomDiameter / 2 : 0,
    collar ? collar.baseWidth / 2 : 0
  );
  const w = halfW * 2 + 2;
  const h = tallest + 1;
  const x = (r: number) => w / 2 + r;
  const y = (v: number) => h - 0.5 - v;

  const body = p
    ? (() => {
        const right = p.outer.map(([r, v]) => `${x(r)},${y(v)}`);
        const left = [...p.outer].reverse().map(([r, v]) => `${x(-r)},${y(v)}`);
        return `M${right.join(' L')} L${left.join(' L')} Z`;
      })()
    : (() => {
        const r = bottle.dimensions.diameter / 2;
        const n = bottle.dimensions.neckDiameter / 2;
        const neckY = top - bottle.dimensions.neckHeight;
        return `M${x(-r)},${y(0)} L${x(r)},${y(0)} L${x(r)},${y(neckY * 0.85)} L${x(n)},${y(neckY)} L${x(n)},${y(top)} L${x(-n)},${y(top)} L${x(-n)},${y(neckY)} L${x(-r)},${y(neckY * 0.85)} Z`;
      })();

  const trapezoid = (bottomHalf: number, topHalf: number, y0: number, y1: number) =>
    `M${x(-bottomHalf)},${y(y0)} L${x(bottomHalf)},${y(y0)} L${x(topHalf)},${y(y1)} L${x(-topHalf)},${y(y1)} Z`;

  return (
    <svg width={w * pxPerMm} height={h * pxPerMm} viewBox={`0 0 ${w} ${h}`} className="block">
      <path d={body} fill={`${accent}22`} stroke={accent} strokeWidth={0.5} strokeLinejoin="round" />
      {collar && (
        <path
          d={trapezoid(collar.baseWidth / 2, collar.topDiameter / 2, collar.seatY, collar.seatY + collar.height)}
          fill="#f8fafc"
          stroke="#64748b"
          strokeWidth={0.4}
        />
      )}
      {c && (
        <path
          d={trapezoid(c.bottomDiameter / 2, c.topDiameter / 2, top - c.skirtDepth, top - c.skirtDepth + c.height)}
          fill="#e5e7eb"
          stroke="#4b5563"
          strokeWidth={0.4}
        />
      )}
    </svg>
  );
}