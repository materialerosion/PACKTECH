/**
 * Series Selector Component
 * Two portfolio dropdowns for the side-by-side comparison.
 */

import { useStore } from '@/store';
import { groupCaps } from '@/services/portfolioService';
import { ArrowUpDown, GitCompare } from 'lucide-react';
import { useCompareSelection } from './compareSelection';

export default function SeriesSelector() {
  const { bottleSeries } = useStore();
  const { portfolioA, portfolioB, setPortfolioA, setPortfolioB, swap, units, setUnits, view, setView } =
    useCompareSelection();

  const portfolios = Object.values(bottleSeries);
  const label = (id: string) => {
    const s = bottleSeries[id];
    if (!s) return '';
    const caps = groupCaps(s.bottles).length;
    return `${s.bottles.length} bottles · ${caps} cap${caps === 1 ? '' : 's'}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <GitCompare className="w-4 h-4" />
        Compare Portfolios
      </h3>

      {portfolios.length < 2 ? (
        <div className="text-sm text-gray-400 text-center py-4">
          Create at least 2 portfolios to compare
        </div>
      ) : (
        <>
          <PortfolioPicker
            title="Portfolio A"
            accent="text-blue-600"
            value={portfolioA}
            other={portfolioB}
            onChange={setPortfolioA}
            portfolios={portfolios}
            detail={label(portfolioA)}
          />
          <div className="flex justify-center">
            <button
              onClick={swap}
              disabled={!portfolioA && !portfolioB}
              className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 disabled:opacity-40"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Swap
            </button>
          </div>
          <PortfolioPicker
            title="Portfolio B"
            accent="text-emerald-600"
            value={portfolioB}
            other={portfolioA}
            onChange={setPortfolioB}
            portfolios={portfolios}
            detail={label(portfolioB)}
          />

          <div className="pt-2 border-t border-gray-200 space-y-3">
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

function PortfolioPicker({
  title,
  accent,
  value,
  other,
  onChange,
  portfolios,
  detail,
}: {
  title: string;
  accent: string;
  value: string;
  other: string;
  onChange: (id: string) => void;
  portfolios: { id: string; name: string }[];
  detail: string;
}) {
  return (
    <div>
      <label className={`text-xs font-semibold ${accent}`}>{title}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input text-sm mt-1">
        <option value="">Select portfolio...</option>
        {portfolios.map((p) => (
          <option key={p.id} value={p.id} disabled={p.id === other}>
            {p.name}
          </option>
        ))}
      </select>
      {detail && <p className="text-xs text-gray-500 mt-1">{detail}</p>}
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
