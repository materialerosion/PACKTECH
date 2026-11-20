/**
 * Series Selector Component
 * Portfolio and bottle picks for the side-by-side comparison.
 */

import { useStore } from '@/store';
import { BottleSeries } from '@/types/bottleSeries';
import { ArrowUpDown, GitCompare } from 'lucide-react';
import { PRODUCT_SHAPE_NAMES } from '@/types/product';
import { PRESET_GROUPS } from '@/components/fill-simulator/ProductPresetSelector';
import { CompareSide, useCompareSelection } from './compareSelection';

export default function SeriesSelector() {
  const { bottleSeries } = useStore();
  const { swap, units, setUnits, view, setView, A, B } = useCompareSelection();
  const portfolios = Object.values(bottleSeries);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <GitCompare className="w-4 h-4" />
        Compare Portfolios
      </h3>

      {portfolios.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-4">Create a portfolio to compare</div>
      ) : (
        <>
          <SidePicker side="A" title="Side A" accent="text-blue-600" portfolios={portfolios} />
          <div className="flex justify-center">
            <button
              onClick={swap}
              disabled={!A.portfolioId && !B.portfolioId}
              className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 disabled:opacity-40"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Swap sides
            </button>
          </div>
          <SidePicker side="B" title="Side B" accent="text-emerald-600" portfolios={portfolios} />

          <FillPicker />

          <div className="pt-3 border-t border-gray-200 space-y-3">
            <Toggle
              label="View"
              value={view}
              options={[
                ['dimensions', 'Dimensions'],
                ['coverage', 'Fill coverage'],
              ]}
              onChange={setView}
            />
            <Toggle
              label="Units"
              value={units}
              options={[
                ['mm', 'mm'],
                ['in', 'inch'],
              ]}
              onChange={setUnits}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SidePicker({
  side,
  title,
  accent,
  portfolios,
}: {
  side: CompareSide;
  title: string;
  accent: string;
  portfolios: BottleSeries[];
}) {
  const pick = useCompareSelection((s) => s[side]);
  const { setPortfolio, setBottles } = useCompareSelection();
  const series = portfolios.find((p) => p.id === pick.portfolioId);
  const bottles = series ? [...series.bottles].sort((a, b) => a.volume - b.volume) : [];
  const isOn = (id: string) => pick.bottleIds === null || pick.bottleIds.includes(id);
  const shown = bottles.filter((b) => isOn(b.id)).length;

  const toggle = (id: string) => {
    const current = pick.bottleIds ?? bottles.map((b) => b.id);
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setBottles(side, next.length === bottles.length ? null : next);
  };

  return (
    <div>
      <label className={`text-xs font-semibold ${accent}`}>{title}</label>
      <select
        value={pick.portfolioId}
        onChange={(e) => setPortfolio(side, e.target.value)}
        className="input text-sm mt-1"
      >
        <option value="">Select portfolio...</option>
        {portfolios.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {series && (
        <div className="mt-2 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100 text-xs">
            <span className="text-gray-500">
              {shown} of {bottles.length} bottles
            </span>
            <span className="flex gap-2">
              <button onClick={() => setBottles(side, null)} className="text-primary-600 hover:underline">
                All
              </button>
              <button onClick={() => setBottles(side, [])} className="text-primary-600 hover:underline">
                None
              </button>
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {bottles.map((b) => (
              <label
                key={b.id}
                className="flex items-center gap-2 px-2.5 py-1 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
              >
                <input type="checkbox" checked={isOn(b.id)} onChange={() => toggle(b.id)} className="rounded" />
                <span className="truncate">{b.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Product and count drawn as a settled fill line in every silhouette. */
function FillPicker() {
  const { fillProductId, fillCount, setFillProduct, setFillCount } = useCompareSelection();
  return (
    <div className="pt-3 border-t border-gray-200 space-y-2">
      <label className="text-xs font-semibold text-gray-700">Fill line</label>
      <select
        value={fillProductId ?? ''}
        onChange={(e) => setFillProduct(e.target.value || null)}
        className="input text-sm"
      >
        <option value="">No fill</option>
        {PRESET_GROUPS.map(([group, presets]) => (
          <optgroup key={group} label={group}>
            {presets.map(({ preset }) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({PRODUCT_SHAPE_NAMES[preset.shape]})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {fillProductId && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-600 font-medium">Count per bottle</span>
          <input
            type="number"
            min={1}
            max={2000}
            value={fillCount}
            onChange={(e) => setFillCount(parseInt(e.target.value))}
            className="input text-sm w-24 text-right"
          />
        </div>
      )}
    </div>
  );
}

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600 font-medium">{label}</span>
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {options.map(([v, text]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              value === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
