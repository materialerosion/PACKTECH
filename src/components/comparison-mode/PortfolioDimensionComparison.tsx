/**
 * Portfolio Dimension Comparison
 * Two portfolios side by side: silhouettes at a common scale, a range summary,
 * and per-bottle key measurements with rows aligned across both portfolios.
 */

import { useId, useMemo } from 'react';
import { Bottle } from '@/types';
import { BottleSeries } from '@/types/bottleSeries';
import { Product } from '@/types/product';
import { useStore, HeadspaceAssessment } from '@/store';
import { PRODUCT_PRESETS } from '@/data/presets/products';
import { INCH, profileTop, radiusAt } from '@/services/drawingProfile';
import { closureLabel } from '@/services/portfolioService';
import { DEFAULT_PACKING_FRACTION, HeadspaceResult, estimateHeadspace } from '@/services/headspaceService';
import { CompareUnits, useCompareSelection } from './compareSelection';

interface Props {
  /** One or two sides, each a portfolio narrowed to the picked bottles. */
  sides: BottleSeries[];
  /** 0 for side A, 1 for side B, per entry in `sides`. */
  sideIndex: number[];
  units: CompareUnits;
}

const SIDE_STYLE = [
  { letter: 'A', text: 'text-blue-600', stroke: '#2563eb' },
  { letter: 'B', text: 'text-emerald-600', stroke: '#059669' },
];

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
  fill?: BottleFill;
}

interface BottleFill {
  hs: HeadspaceResult;
  simulated: boolean;
  overflow: boolean;
}

interface FillContext {
  product: Product;
  count: number;
  packing: number;
  assessments: HeadspaceAssessment[];
}

/** Saved simulator run for this bottle, product and count if there is one, else a volume estimate. */
function fillFor(b: Bottle, ctx: FillContext): BottleFill {
  const run = ctx.assessments
    .filter((a) => a.bottleId === b.id && a.productName === ctx.product.name && a.targetQuantity === ctx.count)
    .sort((x, y) => y.date.localeCompare(x.date))[0];
  if (run) return { hs: run.headspace, simulated: true, overflow: run.actualQuantity < run.targetQuantity };
  const { overflow, ...hs } = estimateHeadspace(b, ctx.product, ctx.count, ctx.packing);
  return { hs, simulated: false, overflow };
}

/** Median solid ÷ bulk volume of saved runs of `product` that didn't overflow. */
function packingFraction(product: Product, assessments: HeadspaceAssessment[]): { value: number; runs: number } {
  const values = assessments
    .filter((a) => a.productName === product.name && a.actualQuantity === a.targetQuantity && a.headspace.bulkVolumeMl > 0)
    .map((a) => a.headspace.solidVolumeMl / a.headspace.bulkVolumeMl)
    .sort((x, y) => x - y);
  if (!values.length) return { value: DEFAULT_PACKING_FRACTION, runs: 0 };
  return { value: values[Math.floor(values.length / 2)], runs: values.length };
}

function measure(b: Bottle, fill: FillContext | null): Measures {
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
    fill: fill ? fillFor(b, fill) : undefined,
  };
}

type Row = (
  | { group: string }
  | { label: string; unit?: string; value: (m: Measures, u: CompareUnits) => string; numeric?: (m: Measures) => number | undefined; kind?: 'length' | 'area' }
) & { fillOnly?: boolean };

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
  { group: 'Fill', fillOnly: true },
  {
    label: 'Fill height',
    kind: 'length',
    fillOnly: true,
    value: (m, u) => (m.fill ? `${len(m.fill.hs.fillHeightMm, u)}${m.fill.overflow ? ' ⚠' : ''}` : '—'),
    numeric: (m) => m.fill?.hs.fillHeightMm,
  },
  {
    label: 'Headspace (bulk)',
    unit: '%',
    fillOnly: true,
    value: (m) => (m.fill ? m.fill.hs.bulkHeadspacePct.toFixed(0) : '—'),
    numeric: (m) => m.fill?.hs.bulkHeadspacePct,
  },
  {
    label: 'Fill to shoulder',
    kind: 'length',
    fillOnly: true,
    value: (m, u) => len(m.fill?.hs.shoulderClearanceMm ?? undefined, u),
    numeric: (m) => m.fill?.hs.shoulderClearanceMm ?? undefined,
  },
  {
    label: 'Fill to neck',
    kind: 'length',
    fillOnly: true,
    value: (m, u) => len(m.fill?.hs.neckClearanceMm, u),
    numeric: (m) => m.fill?.hs.neckClearanceMm,
  },
  {
    label: 'Fill source',
    fillOnly: true,
    value: (m) => (!m.fill ? '—' : m.fill.overflow ? 'Overflows' : m.fill.simulated ? 'Simulated' : 'Estimated'),
  },
];

const unitOf = (row: Extract<Row, { label: string }>, u: CompareUnits) =>
  row.kind === 'length' ? u : row.kind === 'area' ? (u === 'mm' ? 'cm²' : 'in²') : row.unit ?? '';

/** Signed difference with its percentage of the A value. */
function difference(delta: number, base: number, fmt: (v: number) => string): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const pct = base ? ` (${sign}${Math.abs((delta / base) * 100).toFixed(0)}%)` : '';
  return `${sign}${fmt(Math.abs(delta))}${pct}`;
}

function range(values: (number | undefined)[]): [number, number] | null {
  const v = values.filter((x): x is number => x !== undefined);
  return v.length ? [Math.min(...v), Math.max(...v)] : null;
}

export default function PortfolioDimensionComparison({ sides: picked, sideIndex, units }: Props) {
  const { fillProductId, fillCount } = useCompareSelection();
  const assessments = useStore((s) => s.assessments);
  const fill = useMemo<(FillContext & { packingRuns: number }) | null>(() => {
    const product = PRODUCT_PRESETS.find((p) => p.id === fillProductId);
    if (!product) return null;
    const packing = packingFraction(product, assessments);
    return { product, count: fillCount, packing: packing.value, packingRuns: packing.runs, assessments };
  }, [fillProductId, fillCount, assessments]);
  const rows = fill ? ROWS : ROWS.filter((r) => !r.fillOnly);

  const sides = useMemo(
    () =>
      picked.map((s, i) => {
        const bottles = [...s.bottles].sort((a, b) => a.volume - b.volume);
        return {
          series: s,
          style: SIDE_STYLE[sideIndex[i] ?? i],
          bottles,
          measures: bottles.map((b) => measure(b, fill)),
        };
      }),
    [picked, sideIndex, fill]
  );
  const columns = sides.length > 1 ? 'grid-cols-2' : 'grid-cols-1';
  const headToHead = sides.length === 2 && sides.every((s) => s.bottles.length === 1);

  // One mm-to-px scale for every silhouette, so sizes compare directly
  const tallest = Math.max(...sides.flatMap((s) => s.measures.map((m) => m.heightWithClosure)), 1);
  const pxPerMm = 200 / tallest;

  return (
    <div className="space-y-6">
      {fill && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <span className="font-semibold">
            Fill line: {fill.count} × {fill.product.name}
          </span>
          <span>
            Simulated where a saved headspace assessment matches the bottle, product and count; otherwise estimated
            from bottle volume at a packing fraction of {fill.packing.toFixed(2)}
            {fill.packingRuns
              ? ` (median of ${fill.packingRuns} saved ${fill.product.name} run${fill.packingRuns === 1 ? '' : 's'})`
              : ' (default; save assessments of this product to calibrate)'}
            .
          </span>
        </div>
      )}

      {/* Silhouettes */}
      <div className={`grid ${columns} gap-4`}>
        {sides.map((side, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <SideHeader style={side.style} series={side.series} />
            <div className="overflow-x-auto px-4 py-4">
              <div className="flex items-end gap-4 min-w-max">
                {side.bottles.map((b, k) => (
                  <div key={b.id} className="flex flex-col items-center">
                    <Silhouette
                      bottle={b}
                      pxPerMm={pxPerMm}
                      tallest={tallest}
                      accent={side.style.stroke}
                      fill={side.measures[k].fill}
                    />
                    <div className="mt-2 text-xs font-semibold text-gray-800 whitespace-nowrap">{b.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono whitespace-nowrap">
                      {len(side.measures[k].heightWithClosure, units)} × {len(side.measures[k].width, units)} {units}
                    </div>
                    {side.measures[k].fill && <FillCaption fill={side.measures[k].fill!} units={units} />}
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
          <h4 className="text-sm font-semibold text-gray-900">
            {headToHead ? 'Head-to-head' : 'Range summary'}
          </h4>
          <p className="text-xs text-gray-500">
            {headToHead
              ? 'Side B against Side A; percentages are relative to A'
              : 'Smallest to largest picked bottle on each side'}
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2">Measurement</th>
              {sides.map((side, i) => (
                <th key={i} className={`px-4 py-2 text-right ${side.style.text}`}>
                  {side.style.letter} · {headToHead ? side.bottles[0].name : side.series.name}
                </th>
              ))}
              {headToHead && <th className="px-4 py-2 text-right">Difference (B − A)</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, r) => {
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
                  {headToHead && (
                    <td className="px-4 py-2 text-right font-mono text-gray-600">
                      {cells[0] && cells[1] ? difference(cells[1][0] - cells[0][0], cells[0][0], fmt) : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-bottle detail, rows aligned across both portfolios */}
      <div className={`grid grid-cols-1 ${sides.length > 1 ? '2xl:grid-cols-2' : ''} gap-4`}>
        {sides.map((side, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <SideHeader style={side.style} series={side.series} />
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
                  {rows.map((row, r) =>
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

function SideHeader({ style, series }: { style: (typeof SIDE_STYLE)[number]; series: BottleSeries }) {
  return (
    <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
      <span className={`text-xs font-bold ${style.text}`}>{style.letter}</span>
      <h4 className="text-sm font-semibold text-gray-900 truncate">{series.name}</h4>
      <span className="ml-auto text-xs text-gray-500 whitespace-nowrap">{series.bottles.length} {series.bottles.length === 1 ? 'bottle' : 'bottles'}</span>
    </div>
  );
}

const FILL_COLOR = '#f59e0b';
const FILL_LINE = '#b45309';
const OVERFLOW_LINE = '#dc2626';

function FillCaption({ fill, units }: { fill: BottleFill; units: CompareUnits }) {
  return (
    <div className={`text-[11px] font-mono whitespace-nowrap ${fill.overflow ? 'text-red-600' : 'text-amber-700'}`}>
      {fill.overflow
        ? 'Overflows'
        : `Fill ${len(fill.hs.fillHeightMm, units)} ${units} · ${fill.hs.bulkHeadspacePct.toFixed(0)}% HS`}
      <span className="text-gray-400"> {fill.simulated ? 'sim' : 'est'}</span>
    </div>
  );
}

/** Front-view outline: body from the drawing profile, plus collar, closure and settled fill. */
function Silhouette({
  bottle,
  pxPerMm,
  tallest,
  accent,
  fill,
}: {
  bottle: Bottle;
  pxPerMm: number;
  tallest: number;
  accent: string;
  fill?: BottleFill;
}) {
  const clipId = useId();
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

  const cavity = p
    ? (() => {
        const right = p.inner.map(([r, v]) => `${x(r)},${y(v)}`);
        const left = [...p.inner].reverse().map(([r, v]) => `${x(-r)},${y(v)}`);
        return `M${right.join(' L')} L${left.join(' L')} Z`;
      })()
    : (() => {
        const r = bottle.dimensions.diameter / 2 - (bottle.dimensions.wallThickness ?? 1);
        const floor = bottle.dimensions.wallThickness ?? 1;
        return trapezoid(r, r, floor, top - bottle.dimensions.neckHeight);
      })();
  const fillY = fill ? Math.min(fill.hs.fillHeightMm, top) : 0;
  const lineHalf = fill
    ? p
      ? radiusAt(p.inner, fillY)
      : bottle.dimensions.diameter / 2 - (bottle.dimensions.wallThickness ?? 1)
    : 0;

  return (
    <svg width={w * pxPerMm} height={h * pxPerMm} viewBox={`0 0 ${w} ${h}`} className="block">
      <path d={body} fill={`${accent}22`} stroke={accent} strokeWidth={0.5} strokeLinejoin="round" />
      {fill && (
        <>
          <clipPath id={clipId}>
            <rect x={0} y={y(fillY)} width={w} height={h - y(fillY)} />
          </clipPath>
          <path d={cavity} fill={FILL_COLOR} fillOpacity={0.45} clipPath={`url(#${clipId})`} />
          <line
            x1={x(-lineHalf)}
            x2={x(lineHalf)}
            y1={y(fillY)}
            y2={y(fillY)}
            stroke={fill.overflow ? OVERFLOW_LINE : FILL_LINE}
            strokeWidth={0.7}
            strokeDasharray={fill.simulated ? undefined : '2 1.2'}
          />
        </>
      )}
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