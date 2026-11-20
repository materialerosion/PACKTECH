/**
 * Generated Bottles Display Component
 * Shows the bottles in a series with fill range information.
 * Provides both a visual shelf view and a detailed list view.
 * Includes a portfolio summary: diameter / neck finish counts and bottle-to-bottle step differences.
 */

import { useState, useMemo } from 'react';
import { useStore, useActiveSeries } from '@/store';
import { BottleSeries, FillRange } from '@/types/bottleSeries';
import { Bottle } from '@/types/bottle';
import { FillRangeService } from '@/services/fillRangeService';
import { GENERATION_ALGORITHM_NAMES } from '@/types/bottleSeries';
import {
  MYT_AREAS,
  MYT_LINES_SOURCE,
  MytArea,
  formatMytLines,
  mytLinesForCapacity,
} from '@/data/presets/myerstownLines';
import { groupCaps } from '@/services/portfolioService';
import { List, LayoutGrid, Trash2, BarChart3, Factory, CircleDot, ClipboardCheck, X } from 'lucide-react';

const MYERSTOWN_PRESET_ID = 'myerstown-stock-hdpe';

type DisplayMode = 'list' | 'grid' | 'caps';

export default function GeneratedBottlesDisplay() {
  const {
    deleteBottleSeries,
  } = useStore();

  const activeSeries = useActiveSeries();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const [selectedBottleIndex, setSelectedBottleIndex] = useState<number | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(true);

  const fillRanges = useMemo(
    () => activeSeries ? FillRangeService.calculateSeriesFillRanges(activeSeries) : [],
    [activeSeries]
  );

  if (!activeSeries) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <p>Generate a series to see bottles here</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">{activeSeries.name}</h3>
          <p className="text-xs text-gray-500">
            {activeSeries.bottles.length} bottles · {groupCaps(activeSeries.bottles).length} caps
            {activeSeries.category !== 'portfolio' && activeSeries.config.bottleCount > 0 && !activeSeries.bottles[0]?.presetId
              ? ` · ${GENERATION_ALGORITHM_NAMES[activeSeries.config.algorithm]}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Analysis toggle */}
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className={`p-1.5 rounded transition-colors ${showAnalysis ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            title="Toggle portfolio summary"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setDisplayMode('list')}
              className={`p-1.5 rounded ${displayMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('grid')}
              className={`p-1.5 rounded ${displayMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('caps')}
              className={`p-1.5 rounded ${displayMode === 'caps' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title="Caps"
            >
              <CircleDot className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              deleteBottleSeries(activeSeries.id);
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete series"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAnalysis && <PortfolioSummaryPanel bottles={activeSeries.bottles} />}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {displayMode === 'caps' ? (
          <CapsView bottles={activeSeries.bottles} />
        ) : displayMode === 'list' ? (
          <BottleListView
            series={activeSeries}
            fillRanges={fillRanges}
            selectedIndex={selectedBottleIndex}
            onSelect={setSelectedBottleIndex}
          />
        ) : (
          <BottleGridView
            series={activeSeries}
            fillRanges={fillRanges}
            selectedIndex={selectedBottleIndex}
            onSelect={setSelectedBottleIndex}
          />
        )}
      </div>

      {/* Selected bottle details */}
      {selectedBottleIndex !== null && activeSeries.bottles[selectedBottleIndex] && (
        <BottleDetailsPanel
          bottle={activeSeries.bottles[selectedBottleIndex]}
          fillRange={fillRanges[selectedBottleIndex]}
          index={selectedBottleIndex}
        />
      )}
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────

interface BottleViewProps {
  series: BottleSeries;
  fillRanges: FillRange[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}

function BottleListView({ series, fillRanges, selectedIndex, onSelect }: BottleViewProps) {
  const { sendBottleToFill, removeBottleFromSeries } = useStore();
  return (
    <div className="space-y-1">
      {/* Table header */}
      <div className="grid grid-cols-8 gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <span>#</span>
        <span>Volume</span>
        <span>Height</span>
        <span>Diameter</span>
        <span>Weight</span>
        <span>Min Fill</span>
        <span>Max Fill</span>
        <span />
      </div>

      {/* Table rows */}
      {series.bottles.map((bottle, index) => {
        const range = fillRanges[index];
        return (
          <div
            key={bottle.id}
            onClick={() => onSelect(selectedIndex === index ? null : index)}
            className={`
              grid grid-cols-8 gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm
              ${selectedIndex === index
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50 border border-transparent'
              }
            `}
          >
            <span className="text-gray-400 font-mono">{index + 1}</span>
            <span className="font-medium text-gray-900">{bottle.volume.toFixed(0)} mL</span>
            <span className="text-gray-600">{bottle.dimensions.height.toFixed(1)} mm</span>
            <span className="text-gray-600">{bottle.dimensions.diameter.toFixed(1)} mm</span>
            <span className="text-gray-600">{formatWeight(bottle)}</span>
            <span className="text-green-600">{range.minFill.toFixed(0)} mL</span>
            <span className="text-blue-600">{range.maxFill.toFixed(0)} mL</span>
            <span className="flex justify-end gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendBottleToFill(bottle, series.id);
                }}
                className="p-1 text-gray-400 hover:text-blue-600"
                title="Headspace assessment"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Remove ${bottle.name} from ${series.name}?`)) {
                    onSelect(null);
                    removeBottleFromSeries(series.id, bottle.id);
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Remove from portfolio"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Caps View ────────────────────────────────────────────────────────

function CapsView({ bottles }: { bottles: Bottle[] }) {
  const caps = groupCaps(bottles);
  return (
    <table className="w-full text-xs">
      <thead className="text-gray-500 uppercase tracking-wider">
        <tr>
          <th className="text-left font-medium px-3 py-2">Cap</th>
          <th className="text-left font-medium px-2 py-2">Style</th>
          <th className="text-left font-medium px-2 py-2">Material</th>
          <th className="text-right font-medium px-2 py-2">Ø × H</th>
          <th className="text-left font-medium px-2 py-2">Finishes</th>
          <th className="text-left font-medium px-2 py-2">Bottles</th>
        </tr>
      </thead>
      <tbody>
        {caps.map((c) => (
          <tr key={c.key} className="border-t border-gray-100 align-top">
            <td className="px-3 py-2">
              <div className="font-medium text-gray-900">{c.label}</div>
              {c.source && c.source !== c.label && (
                <div className="text-[10px] text-gray-400">{c.source}</div>
              )}
            </td>
            <td className="px-2 py-2 text-gray-600">{c.style}</td>
            <td className="px-2 py-2 text-gray-600">{c.material ?? '—'}</td>
            <td className="px-2 py-2 text-right font-mono text-gray-700 whitespace-nowrap">
              {c.diameterMm !== null && c.heightMm !== null
                ? `${c.diameterMm.toFixed(1)} × ${c.heightMm.toFixed(1)} mm`
                : '—'}
            </td>
            <td className="px-2 py-2 text-gray-600 font-mono">{c.finishes.join(', ')}</td>
            <td className="px-2 py-2">
              <div className="flex flex-wrap gap-1">
                {c.bottles.map((name) => (
                  <span key={name} className="px-1.5 py-0.5 rounded border bg-white border-gray-200 text-gray-700 font-mono">
                    {name}
                  </span>
                ))}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Grid View ────────────────────────────────────────────────────────

function BottleGridView({ series, fillRanges, selectedIndex, onSelect }: BottleViewProps) {
  // Find max height and diameter for relative sizing
  const maxHeight = Math.max(...series.bottles.map(b => b.dimensions.height));
  const maxDiameter = Math.max(...series.bottles.map(b => b.dimensions.diameter));

  return (
    <div className="flex items-end justify-center gap-4 h-full pb-4">
      {series.bottles.map((bottle, index) => {
        const range = fillRanges[index];
        // Use percentage of max height so bottles scale relative to the tallest
        const heightPercent = (bottle.dimensions.height / maxHeight) * 100;
        // Scale diameter relative to the widest bottle in the series
        const relativeDiameter = Math.max(30, (bottle.dimensions.diameter / maxDiameter) * 60);

        return (
          <div
            key={bottle.id}
            onClick={() => onSelect(selectedIndex === index ? null : index)}
            className={`
              flex flex-col items-center cursor-pointer transition-all
              ${selectedIndex === index ? 'scale-110' : 'hover:scale-105'}
            `}
          >
            {/* Bottle visual */}
            <div
              className={`
                relative overflow-hidden rounded-t-lg border-2 transition-colors
                ${selectedIndex === index
                  ? 'border-blue-500 bg-blue-100'
                  : 'border-gray-300 bg-gray-100'
                }
              `}
              style={{
                width: `${relativeDiameter}px`,
                height: `${heightPercent}%`,
                minHeight: '40px',
                maxHeight: '100%',
              }}
            >
              {/* Fill level indicator */}
              <div
                className="w-full bg-blue-200 rounded-b absolute bottom-0 left-0"
                style={{
                  height: `${((range.targetFill / bottle.volume) * 100)}%`,
                }}
              />
            </div>

            {/* Label */}
            <div className="text-center mt-2">
              <div className="text-xs font-medium text-gray-900">{bottle.volume.toFixed(0)} mL</div>
              <div className="text-[10px] text-gray-500">
                {range.minFill.toFixed(0)}–{range.maxFill.toFixed(0)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatWeight(bottle: Bottle): string {
  if (bottle.plasticWeight === undefined) return '—';
  const tol = bottle.weightTolerance !== undefined ? ` ±${bottle.weightTolerance}` : '';
  return `${bottle.plasticWeight} g${tol}`;
}

// ─── Details Panel ────────────────────────────────────────────────────

interface BottleDetailsPanelProps {
  bottle: Bottle;
  fillRange: FillRange;
  index: number;
}

function BottleDetailsPanel({ bottle, fillRange, index }: BottleDetailsPanelProps) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">
          Bottle #{index + 1} — {bottle.volume.toFixed(1)} mL
        </h4>
      </div>
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-gray-500 block">Dimensions</span>
          <span className="font-medium">
            {bottle.dimensions.height.toFixed(1)} × {bottle.dimensions.diameter.toFixed(1)} mm
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">Body Height</span>
          <span className="font-medium">{bottle.dimensions.bodyHeight.toFixed(1)} mm</span>
        </div>
        <div>
          <span className="text-gray-500 block">Surface Area</span>
          <span className="font-medium">{bottle.surfaceArea.toFixed(1)} cm²</span>
        </div>
        <div>
          <span className="text-gray-500 block">Plastic Weight</span>
          <span className="font-medium">{formatWeight(bottle)}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Neck Finish</span>
          <span className="font-medium">{bottle.dimensions.neckFinish}</span>
        </div>
        {bottle.presetId === MYERSTOWN_PRESET_ID ? (
          <div>
            <span className="text-gray-500 block">MYT Lines</span>
            <span className="font-medium">{formatMytLines(mytLinesForCapacity(bottleCapacity(bottle)))}</span>
          </div>
        ) : (
          <div />
        )}

        <div>
          <span className="text-gray-500 block">Min Fill ({fillRange.minPercent}%)</span>
          <span className="font-medium text-green-600">{fillRange.minFill.toFixed(1)} mL</span>
        </div>
        <div>
          <span className="text-gray-500 block">Target Fill ({fillRange.targetPercent.toFixed(0)}%)</span>
          <span className="font-medium text-blue-600">{fillRange.targetFill.toFixed(1)} mL</span>
        </div>
        <div>
          <span className="text-gray-500 block">Max Fill ({fillRange.maxPercent}%)</span>
          <span className="font-medium text-purple-600">{fillRange.maxFill.toFixed(1)} mL</span>
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Summary Panel ──────────────────────────────────────────

// Capacity steps below this are flagged as near-duplicates
const CLOSE_STEP_PERCENT = 10;

// Capacity comes from the bottle name when it starts with a number (e.g. "70.5 mL"),
// otherwise from the calculated volume.
function bottleCapacity(bottle: Bottle): number {
  const fromName = parseFloat(bottle.name);
  return Number.isFinite(fromName) ? fromName : bottle.volume;
}

function neckSize(finish: string): string {
  const match = finish.match(/\d{2}/);
  return match ? match[0] : finish;
}

function countBy<T extends string | number>(values: T[]): [T, number][] {
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()];
}

function signed(n: number, digits = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

function PortfolioSummaryPanel({ bottles }: { bottles: Bottle[] }) {
  const summary = useMemo(() => {
    const sorted = [...bottles].sort((a, b) => bottleCapacity(a) - bottleCapacity(b));

    const diameters = countBy(sorted.map((b) => Math.round(b.dimensions.diameter * 100) / 100))
      .sort((a, b) => a[0] - b[0]);
    const finishes = countBy(sorted.map((b) => b.dimensions.neckFinish))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const neckSizes = countBy(sorted.map((b) => neckSize(b.dimensions.neckFinish)))
      .sort((a, b) => a[0].localeCompare(b[0]));

    const steps = sorted.slice(1).map((b, i) => {
      const prev = sorted[i];
      const capPrev = bottleCapacity(prev);
      const cap = bottleCapacity(b);
      const capDelta = cap - capPrev;
      const capPct = capPrev > 0 ? (capDelta / capPrev) * 100 : 0;
      const weightDelta =
        b.plasticWeight !== undefined && prev.plasticWeight !== undefined
          ? b.plasticWeight - prev.plasticWeight
          : null;
      return {
        from: prev.name,
        to: b.name,
        capDelta,
        capPct,
        diaDelta: b.dimensions.diameter - prev.dimensions.diameter,
        heightDelta: b.dimensions.height - prev.dimensions.height,
        weightDelta,
        sameFinish: b.dimensions.neckFinish === prev.dimensions.neckFinish,
        sameNeck: neckSize(b.dimensions.neckFinish) === neckSize(prev.dimensions.neckFinish),
        isClose: capPct < CLOSE_STEP_PERCENT,
      };
    });

    const pcts = steps.map((s) => s.capPct);
    const avgStep = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;

    return {
      count: sorted.length,
      capMin: sorted.length ? bottleCapacity(sorted[0]) : 0,
      capMax: sorted.length ? bottleCapacity(sorted[sorted.length - 1]) : 0,
      diameters,
      finishes,
      neckSizes,
      steps,
      avgStep,
      minStep: pcts.length ? Math.min(...pcts) : 0,
      maxStep: pcts.length ? Math.max(...pcts) : 0,
      closeCount: steps.filter((s) => s.isClose).length,
    };
  }, [bottles]);

  if (summary.count === 0) return null;

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 space-y-3 max-h-[55%] overflow-auto">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-gray-700">Portfolio Summary</span>
        <span className="text-[11px] text-gray-500">
          {summary.capMin} – {summary.capMax} mL range
        </span>
      </div>

      <div className="grid grid-cols-5 gap-3 text-xs">
        <SummaryTile label="Bottles" value={summary.count} />
        <SummaryTile label="Diameters" value={summary.diameters.length} />
        <SummaryTile label="Neck Finishes" value={summary.finishes.length} />
        <SummaryTile
          label="Neck Sizes"
          value={summary.neckSizes.length}
          sub={summary.neckSizes.map(([size]) => `${size} mm`).join(' · ')}
        />
        <SummaryTile
          label="Avg Capacity Step"
          value={`${summary.avgStep.toFixed(0)}%`}
          sub={`${summary.minStep.toFixed(0)}% – ${summary.maxStep.toFixed(0)}%`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <ChipGroup
          label="Diameters (mm)"
          items={summary.diameters.map(([d, n]) => ({ key: String(d), label: d.toFixed(2), count: n }))}
        />
        <ChipGroup
          label="Neck finishes"
          items={summary.finishes.map(([f, n]) => ({ key: f, label: f, count: n }))}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Bottle-to-bottle differences</span>
          {summary.closeCount > 0 && (
            <span className="text-[11px] text-amber-600">
              {summary.closeCount} step{summary.closeCount > 1 ? 's' : ''} under {CLOSE_STEP_PERCENT}% capacity
            </span>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left font-medium px-2 py-1">Step</th>
                <th className="text-right font-medium px-2 py-1">Capacity</th>
                <th className="text-right font-medium px-2 py-1">Diameter</th>
                <th className="text-right font-medium px-2 py-1">Height</th>
                <th className="text-right font-medium px-2 py-1">Weight</th>
                <th className="text-left font-medium px-2 py-1">Finish</th>
              </tr>
            </thead>
            <tbody>
              {summary.steps.map((s) => (
                <tr
                  key={`${s.from}-${s.to}`}
                  className={`border-t border-gray-100 ${s.isClose ? 'bg-amber-50' : ''}`}
                >
                  <td className="px-2 py-1 text-gray-700 whitespace-nowrap">
                    {s.from} → {s.to}
                  </td>
                  <td className={`px-2 py-1 text-right font-mono ${s.isClose ? 'text-amber-700 font-semibold' : 'text-gray-900'}`}>
                    {signed(s.capDelta)} mL ({signed(s.capPct, 0)}%)
                  </td>
                  <td className="px-2 py-1 text-right font-mono text-gray-700">
                    {s.diaDelta === 0 ? 'same' : `${signed(s.diaDelta, 2)} mm`}
                  </td>
                  <td className="px-2 py-1 text-right font-mono text-gray-700">
                    {signed(s.heightDelta, 2)} mm
                  </td>
                  <td className="px-2 py-1 text-right font-mono text-gray-700">
                    {s.weightDelta === null ? '—' : `${signed(s.weightDelta)} g`}
                  </td>
                  <td className="px-2 py-1 text-gray-600">
                    {s.sameFinish ? 'same' : s.sameNeck ? 'variant' : 'new size'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {bottles.some((b) => b.presetId === MYERSTOWN_PRESET_ID) && <MyerstownLinesSection bottles={bottles} />}
    </div>
  );
}

// ─── Myerstown Production Lines ───────────────────────────────────────

interface LineRow {
  area: MytArea;
  line: number | null;
  bottles: string[];
}

function MyerstownLinesSection({ bottles }: { bottles: Bottle[] }) {
  const { rows, notInDoc } = useMemo(() => {
    const sorted = [...bottles].sort((a, b) => bottleCapacity(a) - bottleCapacity(b));
    const byKey = new Map<string, LineRow>();
    const notInDoc: string[] = [];

    sorted.forEach((bottle) => {
      const entry = mytLinesForCapacity(bottleCapacity(bottle));
      if (!entry) {
        notInDoc.push(bottle.name);
        return;
      }
      const label = entry.docCapacity ? `${bottle.name} (${entry.docCapacity}cc)` : bottle.name;
      MYT_AREAS.forEach((area) => {
        const assignment = entry[area];
        if (!assignment) return;
        const lines: (number | null)[] = assignment.lines.length ? assignment.lines : [null];
        lines.forEach((line) => {
          const key = `${area}-${line ?? 'x'}`;
          if (!byKey.has(key)) byKey.set(key, { area, line, bottles: [] });
          byKey.get(key)!.bottles.push(label);
        });
      });
    });

    const rows = [...byKey.values()].sort(
      (a, b) =>
        MYT_AREAS.indexOf(a.area) - MYT_AREAS.indexOf(b.area) ||
        (a.line ?? Infinity) - (b.line ?? Infinity)
    );
    return { rows, notInDoc };
  }, [bottles]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
          <Factory className="w-3 h-3" />
          Myerstown Production Lines
        </span>
        <span className="text-[10px] text-gray-400">{MYT_LINES_SOURCE}</span>
      </div>
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left font-medium px-2 py-1">Line</th>
              <th className="text-left font-medium px-2 py-1">Area</th>
              <th className="text-left font-medium px-2 py-1">Bottles</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.area}-${row.line ?? 'x'}`} className="border-t border-gray-100">
                <td className="px-2 py-1 font-mono text-gray-900 whitespace-nowrap">
                  {row.line === null ? <span className="text-gray-400 font-sans">Line not given</span> : `Line ${row.line}`}
                </td>
                <td className="px-2 py-1 text-gray-600">{row.area}</td>
                <td className="px-2 py-1">
                  <div className="flex flex-wrap gap-1">
                    {row.bottles.map((name) => (
                      <span key={name} className="px-1.5 py-0.5 rounded border bg-white border-gray-200 text-gray-700 font-mono">
                        {name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notInDoc.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-1">Not listed in the working doc: {notInDoc.join(', ')}</p>
      )}
    </div>
  );
}

function SummaryTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg p-2 border border-gray-100">
      <span className="text-gray-500 block text-[10px] uppercase tracking-wider">{label}</span>
      <span className="font-bold text-gray-900 text-sm">{value}</span>
      {sub && <span className="text-[10px] text-gray-400 block">{sub}</span>}
    </div>
  );
}

function ChipGroup({ label, items }: { label: string; items: { key: string; label: string; count: number }[] }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">{label}</span>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item.key}
            className={`px-1.5 py-0.5 rounded border font-mono ${
              item.count > 1 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            {item.label}
            {item.count > 1 && <span className="ml-1 font-semibold">×{item.count}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
