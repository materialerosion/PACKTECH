/**
 * Portfolio Evaluation
 * Saved headspace assessments laid out against every bottle / cap in a portfolio.
 */

import { useStore, useFillSimulation, HeadspaceAssessment } from '@/store';
import { closureLabel } from '@/services/portfolioService';
import { formatMytLines, mytLinesForCapacity } from '@/data/presets/myerstownLines';
import { Download, Trash2, Play } from 'lucide-react';

const MYERSTOWN_PRESET_ID = 'myerstown-stock-hdpe';

function capacityFromName(name: string, fallback: number): number {
  const n = parseFloat(name);
  return Number.isFinite(n) ? n : fallback;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(portfolioName: string, rows: HeadspaceAssessment[]) {
  const header = [
    'Date', 'Portfolio', 'Bottle', 'Product', 'Target count', 'Count inside',
    'Capacity (mL)', 'Bulk headspace (%)', 'Solid headspace (%)', 'Fill height (mm)',
    'Fill height (% of height)', 'To shoulder (mm)', 'To neck (mm)', 'Notes',
  ];
  const lines = rows.map((a) => [
    a.date.slice(0, 10), a.seriesName ?? '', a.bottleName, a.productName, a.targetQuantity, a.actualQuantity,
    a.headspace.capacityMl.toFixed(1), a.headspace.bulkHeadspacePct.toFixed(1), a.headspace.solidHeadspacePct.toFixed(1),
    a.headspace.fillHeightMm.toFixed(1), a.headspace.fillHeightPct.toFixed(0),
    a.headspace.shoulderClearanceMm === null ? '' : a.headspace.shoulderClearanceMm.toFixed(1),
    a.headspace.neckClearanceMm.toFixed(1), a.notes,
  ].map(csvCell).join(','));
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${portfolioName.replace(/[^\w-]+/g, '_')}_headspace.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function PortfolioEvaluation() {
  const { bottleSeries, activeSeriesId, assessments, deleteAssessment, sendBottleToFill } = useStore();
  const fillSim = useFillSimulation();
  const portfolioId = activeSeriesId ?? fillSim.sourceSeriesId;
  const portfolio = portfolioId ? bottleSeries[portfolioId] : undefined;

  if (!portfolio) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Pick a portfolio in the sidebar to evaluate it
      </div>
    );
  }

  const saved = assessments.filter((a) => a.seriesId === portfolio.id);
  const isRunning = ['running', 'settling', 'redropping'].includes(fillSim.status);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">Portfolio Evaluation · {portfolio.name}</h3>
          <p className="text-xs text-gray-500">
            {portfolio.bottles.length} bottles · {saved.length} saved assessment{saved.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => exportCsv(portfolio.name, saved)}
          disabled={!saved.length}
          className="btn btn-secondary text-xs flex items-center gap-1 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500 sticky top-0">
            <tr>
              <th className="text-left font-medium px-3 py-1.5">Bottle</th>
              <th className="text-left font-medium px-2 py-1.5">Cap</th>
              <th className="text-right font-medium px-2 py-1.5">Capacity</th>
              <th className="text-left font-medium px-2 py-1.5">Product × count</th>
              <th className="text-right font-medium px-2 py-1.5">Bulk HS</th>
              <th className="text-right font-medium px-2 py-1.5">Solid HS</th>
              <th className="text-right font-medium px-2 py-1.5">Fill height</th>
              <th className="text-left font-medium px-2 py-1.5">Notes</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {portfolio.bottles.map((bottle) => {
              const runs = saved.filter((a) => a.bottleId === bottle.id);
              const isCurrent = fillSim.fillBottle?.id === bottle.id;
              const lines = bottle.presetId === MYERSTOWN_PRESET_ID
                ? formatMytLines(mytLinesForCapacity(capacityFromName(bottle.name, bottle.volume)))
                : null;
              const rowSpan = Math.max(1, runs.length);
              const bottleCells = (
                <>
                  <td rowSpan={rowSpan} className="px-3 py-1.5 align-top">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => sendBottleToFill(bottle, portfolio.id)}
                        disabled={isRunning}
                        title="Assess this bottle"
                        className={`p-0.5 rounded ${isCurrent ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'} disabled:opacity-40`}
                      >
                        <Play className="w-3 h-3" />
                      </button>
                      <span className={`font-medium ${isCurrent ? 'text-blue-700' : 'text-gray-900'}`}>{bottle.name}</span>
                    </div>
                    {lines && <div className="text-[10px] text-gray-400 pl-5">MYT {lines}</div>}
                  </td>
                  <td rowSpan={rowSpan} className="px-2 py-1.5 align-top text-gray-600">
                    {closureLabel(bottle)}
                    <div className="text-[10px] text-gray-400">{bottle.dimensions.neckFinish}</div>
                  </td>
                  <td rowSpan={rowSpan} className="px-2 py-1.5 align-top text-right font-mono text-gray-700">
                    {bottle.volume.toFixed(1)} mL
                  </td>
                </>
              );

              if (!runs.length) {
                return (
                  <tr key={bottle.id} className="border-t border-gray-100">
                    {bottleCells}
                    <td colSpan={6} className="px-2 py-1.5 text-gray-300 italic">Not assessed yet</td>
                  </tr>
                );
              }

              return runs.map((a, i) => (
                <tr key={a.id} className={i === 0 ? 'border-t border-gray-100' : ''}>
                  {i === 0 && bottleCells}
                  <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">
                    <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: a.productColor }} />
                    {a.productName} × {a.actualQuantity}
                    {a.actualQuantity < a.targetQuantity && (
                      <span className="text-red-500"> ({a.targetQuantity - a.actualQuantity} over)</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-700">
                    {a.headspace.bulkHeadspacePct.toFixed(1)}%
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-600">
                    {a.headspace.solidHeadspacePct.toFixed(1)}%
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-600 whitespace-nowrap">
                    {a.headspace.fillHeightMm.toFixed(1)} mm ({a.headspace.fillHeightPct.toFixed(0)}%)
                  </td>
                  <td className="px-2 py-1.5 text-gray-500 max-w-[180px] truncate" title={a.notes}>
                    {a.notes || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => deleteAssessment(a.id)}
                      className="text-gray-300 hover:text-red-500"
                      title="Delete assessment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
