/**
 * Portfolio Manager
 * Create, rename and delete bottle / cap portfolios and grow them over time.
 */

import { useMemo, useState } from 'react';
import { useStore, useActiveSeries } from '@/store';
import { buildMyerstownBottles } from '@/data/presets/myerstownStock';
import { buildPainCardioBottles } from '@/data/presets/painCardio';
import { buildWestMercuryBottles } from '@/data/presets/westMercury';
import { buildAfrinBottle } from '@/data/presets/afrin';
import { buildAsteproBottles } from '@/data/presets/astepro';
import { closureLabel } from '@/services/portfolioService';
import { FolderPlus, Plus, Trash2, Package } from 'lucide-react';

const MYERSTOWN_PORTFOLIO_NAME = 'Myerstown Stock HDPE Bottles';

export default function PortfolioManager() {
  const {
    bottleSeries,
    bottles,
    activeSeriesId,
    setActiveSeries,
    createPortfolio,
    updateBottleSeries,
    deleteBottleSeries,
    addBottleToSeries,
  } = useStore();
  const active = useActiveSeries();
  const [newName, setNewName] = useState('');
  const [sourceKey, setSourceKey] = useState('');

  const portfolios = Object.values(bottleSeries);
  const hasMyerstown = portfolios.some((s) => s.name === MYERSTOWN_PORTFOLIO_NAME);

  const drawingBottles = useMemo(
    () => [
      ...buildPainCardioBottles().map((bottle) => ({ bottle, group: 'Pain & Cardio drawing' })),
      ...buildWestMercuryBottles().map((bottle) => ({ bottle, group: 'Iconic 2-piece drawing' })),
      { bottle: buildAfrinBottle(), group: 'Nasal spray drawing' },
      ...buildAsteproBottles().map((bottle) => ({ bottle, group: 'Astepro 2-piece drawing' })),
    ],
    []
  );

  // Bottles that can be added: supplier drawings, the Bottle Generator library, plus bottles from any portfolio
  const sources = [
    ...drawingBottles.map(({ bottle: b, group }) => ({ key: `drw:${b.name}`, label: `${b.name} (${group})`, bottle: b })),
    ...Object.values(bottles).map((b) => ({ key: `lib:${b.id}`, label: `${b.name} (library)`, bottle: b })),
    ...portfolios.flatMap((s) =>
      s.bottles.map((b) => ({ key: `${s.id}:${b.id}`, label: `${b.name} (${s.name})`, bottle: b }))
    ),
  ];

  const loadMyerstown = () => {
    const id = createPortfolio(MYERSTOWN_PORTFOLIO_NAME);
    buildMyerstownBottles().forEach((b) => addBottleToSeries(id, b));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Bottle / Cap Portfolios</h2>
      </div>

      {/* Portfolio list */}
      <div className="space-y-2">
        {portfolios.length === 0 && <p className="text-xs text-gray-400">No portfolios yet.</p>}
        {portfolios.map((s) => {
          const caps = new Set(s.bottles.map((b) => closureLabel(b))).size;
          return (
            <div
              key={s.id}
              onClick={() => setActiveSeries(s.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                activeSeriesId === s.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{s.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {s.bottles.length} bottles · {caps} cap{caps === 1 ? '' : 's'}
              </div>
            </div>
          );
        })}
      </div>

      {/* New portfolio */}
      <div className="space-y-2">
        <label className="label">New portfolio</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Bestco Stock PET Bottles"
            className="input text-sm flex-1"
          />
          <button
            onClick={() => {
              createPortfolio(newName.trim());
              setNewName('');
            }}
            disabled={!newName.trim()}
            className="btn btn-primary text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <FolderPlus className="w-4 h-4" />
            Create
          </button>
        </div>
        {!hasMyerstown && (
          <button onClick={loadMyerstown} className="btn btn-secondary w-full text-sm">
            Load {MYERSTOWN_PORTFOLIO_NAME}
          </button>
        )}
      </div>

      {/* Active portfolio */}
      {active && (
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <div>
            <label className="label">Portfolio name</label>
            <input
              type="text"
              value={active.name}
              onChange={(e) => updateBottleSeries(active.id, { name: e.target.value })}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={active.description}
              onChange={(e) => updateBottleSeries(active.id, { description: e.target.value })}
              rows={2}
              placeholder="Site, resin, supplier, purpose..."
              className="input text-sm"
            />
          </div>

          <div>
            <label className="label">Add a bottle</label>
            <div className="flex gap-2">
              <select
                value={sourceKey}
                onChange={(e) => setSourceKey(e.target.value)}
                className="input text-sm flex-1"
              >
                <option value="">Select a bottle to copy in...</option>
                {sources.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const src = sources.find((s) => s.key === sourceKey);
                  if (src) addBottleToSeries(active.id, src.bottle);
                  setSourceKey('');
                }}
                disabled={!sourceKey}
                className="btn btn-primary text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Build new bottles in the Bottle Generator, or copy one from another portfolio, then
              adjust it in Edit Bottle.
            </p>
          </div>

          <button
            onClick={() => {
              if (window.confirm(`Delete portfolio "${active.name}"?`)) deleteBottleSeries(active.id);
            }}
            className="btn btn-secondary w-full text-sm flex items-center justify-center gap-1 text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Delete portfolio
          </button>
        </div>
      )}
    </div>
  );
}
