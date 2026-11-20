/**
 * Fill Results Panel
 * Displays simulation results after completion: count, headspace and fill height.
 */

import { useState } from 'react';
import { useStore, useFillSimulation } from '@/store';
import { CheckCircle, BarChart3, Clock, Save } from 'lucide-react';

function clearanceText(mm: number | null): string {
  if (mm === null) return '—';
  return mm >= 0 ? `${mm.toFixed(1)} mm below` : `${(-mm).toFixed(1)} mm above`;
}

export default function FillResultsPanel() {
  const { saveAssessment } = useStore();
  const fillSim = useFillSimulation();
  const { results } = fillSim;
  const [notes, setNotes] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  
  if (!results) return null;
  const hs = results.headspace;
  
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
        Results
      </h4>
      
      {/* Main result */}
      <div className="bg-green-50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">Simulation Complete</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-green-600">Fit Inside</div>
            <div className="text-xl font-bold text-green-800">
              {results.actualQuantity} <span className="text-sm font-normal">/ {results.targetQuantity}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-red-500">Overflow</div>
            <div className="text-xl font-bold text-red-600">
              {results.overflow}
            </div>
          </div>
        </div>
      </div>
      
      {/* Headspace */}
      {hs && (
        <div className="bg-blue-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Headspace</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-blue-600">Bulk headspace</div>
              <div className="text-2xl font-bold text-blue-700">{hs.bulkHeadspacePct.toFixed(1)}%</div>
              <div className="text-[10px] text-blue-500">Capacity above the settled fill line</div>
            </div>
            <div>
              <div className="text-xs text-blue-600">Solid headspace</div>
              <div className="text-lg font-semibold text-blue-700">{hs.solidHeadspacePct.toFixed(1)}%</div>
              <div className="text-[10px] text-blue-500">Capacity not taken by product solids</div>
            </div>
          </div>
          <div className="bg-white/70 rounded p-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Fill height</span>
              <span className="font-medium">
                {hs.fillHeightMm.toFixed(1)} mm ({hs.fillHeightPct.toFixed(0)}% of {hs.overallHeightMm.toFixed(1)} mm)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">To shoulder start</span>
              <span className={`font-medium ${hs.shoulderClearanceMm !== null && hs.shoulderClearanceMm < 0 ? 'text-amber-600' : ''}`}>
                {clearanceText(hs.shoulderClearanceMm)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">To neck finish</span>
              <span className={`font-medium ${hs.neckClearanceMm < 0 ? 'text-red-600' : ''}`}>
                {clearanceText(hs.neckClearanceMm)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Bulk / solid volume</span>
              <span className="font-medium">
                {hs.bulkVolumeMl.toFixed(1)} / {hs.solidVolumeMl.toFixed(1)} mL
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Details */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Overflow Capacity</span>
          <span className="font-medium">{results.bottleVolume.toFixed(1)} mL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Product Volume (each)</span>
          <span className="font-medium">{results.productVolume.toFixed(1)} mm³</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Fill Efficiency</span>
          <span className="font-medium">{results.fillEfficiency.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Sim Time
          </span>
          <span className="font-medium">{results.simulationTime.toFixed(1)}s</span>
        </div>
      </div>

      {/* Save */}
      {hs && (
        <div className="space-y-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (SKU, count claim, insert...)"
            className="input text-sm w-full"
          />
          <button
            onClick={() => {
              setSavedId(saveAssessment(notes));
              setNotes('');
            }}
            disabled={savedId !== null}
            className="btn btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savedId ? 'Assessment saved' : 'Save Assessment'}
          </button>
        </div>
      )}
    </div>
  );
}
