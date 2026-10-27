/**
 * Individual Editor Component
 * Full parameter editing for a single bottle within a series.
 * Reuses patterns from BottleGenerator for consistency.
 */

import { useState, useEffect } from 'react';
import { useStore, useActiveSeries } from '@/store';
import {
  BottleShape,
  CapStyle,
  BottleMaterial,
  BottleDimensions,
  SHAPE_NAMES,
  CAP_STYLE_NAMES,
  MATERIAL_NAMES,
} from '@/types/bottle';
import { FillRangeService } from '@/services/fillRangeService';
import DimensionField from '@/components/ui/DimensionField';
import { Droplets } from 'lucide-react';

interface IndividualEditorProps {
  bottleIndex: number;
}

export default function IndividualEditor({ bottleIndex }: IndividualEditorProps) {
  const {
    activeSeriesId,
    updateBottleInSeries,
    sendBottleToFill,
  } = useStore();

  const activeSeries = useActiveSeries();
  const bottle = activeSeries?.bottles[bottleIndex] ?? null;

  // Local state for dimensions (for responsive editing)
  const [localDims, setLocalDims] = useState<BottleDimensions | null>(null);

  // Sync local dims with bottle
  useEffect(() => {
    if (bottle) {
      setLocalDims({ ...bottle.dimensions });
    }
  }, [bottle?.id, bottleIndex]);

  if (!activeSeries || !activeSeriesId || !bottle || !localDims) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <p>Select a bottle to edit</p>
      </div>
    );
  }

  const fillRange = FillRangeService.calculateFillRange(
    bottle,
    activeSeries.config.fillRangeMin,
    activeSeries.config.fillRangeMax
  );

  const handleDimensionChange = (key: keyof BottleDimensions, value: number) => {
    const newDims = { ...localDims, [key]: value };

    // Auto-update total height when body height changes
    if (key === 'bodyHeight') {
      newDims.height = value + newDims.neckHeight;
    }
    if (key === 'neckHeight') {
      newDims.height = newDims.bodyHeight + value;
    }

    setLocalDims(newDims);
    updateBottleInSeries(activeSeriesId, bottleIndex, { dimensions: newDims });
  };

  const handlePropertyChange = (updates: Record<string, unknown>) => {
    updateBottleInSeries(activeSeriesId, bottleIndex, updates);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Edit: {bottle.name}
        </h3>
      </div>

      {/* Bottle Name */}
      <div>
        <label className="text-xs text-gray-600 font-medium">Name</label>
        <input
          type="text"
          value={bottle.name}
          onChange={(e) => handlePropertyChange({ name: e.target.value })}
          className="input text-sm"
        />
      </div>

      {/* Shape */}
      <div>
        <label className="text-xs text-gray-600 font-medium">Shape</label>
        <select
          value={bottle.shape}
          onChange={(e) => handlePropertyChange({ shape: e.target.value as BottleShape })}
          className="input text-sm"
        >
          {(Object.keys(SHAPE_NAMES) as BottleShape[]).map((shape) => (
            <option key={shape} value={shape}>{SHAPE_NAMES[shape]}</option>
          ))}
        </select>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider">Dimensions (mm)</h4>

        <DimensionField
          compact
          label="Body Height"
          value={localDims.bodyHeight}
          min={10}
          max={400}
          onChange={(v) => handleDimensionChange('bodyHeight', v)}
        />
        <DimensionField
          compact
          label="Diameter"
          value={localDims.diameter}
          min={10}
          max={200}
          onChange={(v) => handleDimensionChange('diameter', v)}
        />
        <DimensionField
          compact
          label="Neck Height"
          value={localDims.neckHeight}
          min={3}
          max={60}
          onChange={(v) => handleDimensionChange('neckHeight', v)}
        />
        <DimensionField
          compact
          label="Neck Diameter"
          value={localDims.neckDiameter}
          min={5}
          max={100}
          onChange={(v) => handleDimensionChange('neckDiameter', v)}
        />
        <DimensionField
          compact
          label="Shoulder Curve"
          value={localDims.shoulderCurveRadius}
          min={0}
          max={50}
          onChange={(v) => handleDimensionChange('shoulderCurveRadius', v)}
        />
        <DimensionField
          compact
          label="Wall Thickness"
          value={localDims.wallThickness}
          min={0.5}
          max={5}
          step={0.1}
          onChange={(v) => handleDimensionChange('wallThickness', v)}
        />
      </div>

      {/* Plastic Weight */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider">Plastic Weight (g)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 font-medium">Weight</label>
            <input
              type="number"
              step={0.01}
              min={0}
              value={bottle.plasticWeight ?? ''}
              onChange={(e) =>
                handlePropertyChange({
                  plasticWeight: e.target.value === '' ? undefined : Math.round(parseFloat(e.target.value) * 100) / 100,
                })
              }
              className="input text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 font-medium">Tolerance (±)</label>
            <input
              type="number"
              step={0.01}
              min={0}
              value={bottle.weightTolerance ?? ''}
              onChange={(e) =>
                handlePropertyChange({
                  weightTolerance: e.target.value === '' ? undefined : Math.round(parseFloat(e.target.value) * 100) / 100,
                })
              }
              className="input text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Material & Cap */}
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 font-medium">Material</label>
          <select
            value={bottle.material}
            onChange={(e) => handlePropertyChange({ material: e.target.value as BottleMaterial })}
            className="input text-sm"
          >
            {(Object.keys(MATERIAL_NAMES) as BottleMaterial[]).map((mat) => (
              <option key={mat} value={mat}>{MATERIAL_NAMES[mat]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-600 font-medium">Cap Style</label>
          <select
            value={bottle.capStyle}
            onChange={(e) => handlePropertyChange({ capStyle: e.target.value as CapStyle })}
            className="input text-sm"
          >
            {(Object.keys(CAP_STYLE_NAMES) as CapStyle[]).map((style) => (
              <option key={style} value={style}>{CAP_STYLE_NAMES[style]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 font-medium">Body Color</label>
          <input
            type="color"
            value={bottle.bodyColor}
            onChange={(e) => handlePropertyChange({ bodyColor: e.target.value })}
            className="w-full h-8 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium">Cap Color</label>
          <input
            type="color"
            value={bottle.capColor}
            onChange={(e) => handlePropertyChange({ capColor: e.target.value })}
            className="w-full h-8 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Volume & Fill Range Display */}
      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-600 font-medium">Volume</span>
          <span className="text-lg font-bold text-blue-700">{bottle.volume.toFixed(1)} mL</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-gray-500">Min Fill</div>
            <div className="font-medium text-green-600">{fillRange.minFill.toFixed(1)} mL</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Target</div>
            <div className="font-medium text-blue-600">{fillRange.targetFill.toFixed(1)} mL</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Max Fill</div>
            <div className="font-medium text-purple-600">{fillRange.maxFill.toFixed(1)} mL</div>
          </div>
        </div>
      </div>

      {/* Send to Fill Simulator */}
      <button
        onClick={() => sendBottleToFill(bottle)}
        className="btn btn-secondary w-full flex items-center justify-center gap-2"
      >
        <Droplets className="w-4 h-4" />
        Send to Fill Simulator
      </button>
    </div>
  );
}