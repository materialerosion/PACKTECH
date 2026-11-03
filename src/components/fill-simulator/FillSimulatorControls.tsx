/**
 * Fill Simulator Controls
 * Sidebar panel for configuring and controlling the fill simulation.
 */

import { useStore, useFillSimulation } from '@/store';
import { Play, RotateCcw, Pause, ClipboardCheck, AlertCircle } from 'lucide-react';
import ProductPresetSelector from './ProductPresetSelector';
import FillResultsPanel from './FillResultsPanel';

export default function FillSimulatorControls() {
  const {
    startFillSimulation,
    pauseFillSimulation,
    resetFillSimulation,
    setTargetQuantity,
    sendBottleToFill,
    bottleSeries,
    activeSeriesId,
    setActiveSeries,
  } = useStore();
  
  const fillSim = useFillSimulation();
  const { fillBottle, fillProduct, targetQuantity, status, droppedCount, insideCount, elapsedTime, currentPass } = fillSim;
  const portfolioId = activeSeriesId ?? fillSim.sourceSeriesId ?? '';
  const portfolio = bottleSeries[portfolioId];
  
  const canStart = fillBottle && fillProduct && (status === 'configuring' || status === 'idle');
  const isRunning = status === 'running' || status === 'settling' || status === 'redropping';
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Technical Packaging Tool</h2>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Headspace assessment</p>
      </div>

      {/* Portfolio and bottle */}
      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-600 font-medium">Portfolio</label>
          <select
            value={portfolioId}
            onChange={(e) => setActiveSeries(e.target.value)}
            className="input text-sm w-full mt-1"
            disabled={isRunning}
          >
            <option value="" disabled>Select a portfolio...</option>
            {Object.values(bottleSeries).map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.bottles.length})</option>
            ))}
          </select>
        </div>
        {portfolio && (
          <div>
            <label className="text-xs text-gray-600 font-medium">Bottle</label>
            <select
              value={fillSim.sourceSeriesId === portfolio.id ? fillBottle?.id ?? '' : ''}
              onChange={(e) => {
                const bottle = portfolio.bottles.find((b) => b.id === e.target.value);
                if (bottle) sendBottleToFill(bottle, portfolio.id);
              }}
              className="input text-sm w-full mt-1"
              disabled={isRunning}
            >
              <option value="" disabled>Select a bottle...</option>
              {portfolio.bottles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.dimensions.neckFinish}{b.closure ? ' · with cap' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Bottle info */}
      {fillBottle ? (
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium">Target Bottle</div>
          <div className="text-sm font-semibold text-blue-900">{fillBottle.name}</div>
          <div className="text-xs text-blue-500 mt-1">
            {fillBottle.volume.toFixed(1)} mL · {fillBottle.dimensions.diameter}mm Ø · {fillBottle.dimensions.bodyHeight}mm H
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-medium text-yellow-800">No bottle selected</div>
            <div className="text-xs text-yellow-600 mt-1">
              Pick a portfolio and bottle above, or send one from the Bottle / Cap Portfolio or Bottle Generator.
            </div>
          </div>
        </div>
      )}
      
      {/* Divider */}
      <div className="border-t border-gray-200" />
      
      {/* Product selection */}
      <ProductPresetSelector />
      
      {/* Target quantity */}
      <div>
        <label className="text-xs text-gray-600 font-medium">Target Quantity</label>
        <input
          type="number"
          value={targetQuantity}
          onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
          min={1}
          max={500}
          className="input text-sm w-full mt-1"
          disabled={isRunning}
        />
      </div>
      
      {/* Control buttons */}
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={startFillSimulation}
            disabled={!canStart}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Start Simulation
          </button>
        ) : (
          <button
            onClick={pauseFillSimulation}
            className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        )}
        <button
          onClick={resetFillSimulation}
          className="btn btn-secondary flex items-center justify-center gap-2"
          title="Reset simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      
      {/* Progress */}
      {(isRunning || status === 'complete') && (
        <>
          <div className="border-t border-gray-200" />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Progress
            </h4>
            
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${
                  status === 'running' ? 'text-blue-600' :
                  status === 'settling' ? 'text-yellow-600' :
                  status === 'redropping' ? 'text-orange-600' :
                  status === 'complete' ? 'text-green-600' :
                  'text-gray-600'
                }`}>
                  {status === 'running' ? 'Dropping...' :
                   status === 'settling' ? 'Settling...' :
                   status === 'redropping' ? 'Re-dropping...' :
                   status === 'complete' ? 'Complete' :
                   status}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Dropped</span>
                <span className="font-medium">{droppedCount} / {targetQuantity}</span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (droppedCount / targetQuantity) * 100)}%` }}
                />
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Inside</span>
                <span className="font-medium text-green-600">{insideCount}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="font-medium">{elapsedTime.toFixed(1)}s</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Pass</span>
                <span className="font-medium">{currentPass + 1} / 3</span>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Results */}
      {status === 'complete' && (
        <>
          <div className="border-t border-gray-200" />
          <FillResultsPanel />
        </>
      )}
    </div>
  );
}
