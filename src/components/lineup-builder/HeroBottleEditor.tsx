/**
 * Hero Bottle Editor
 * Pick one size from the active series as the "hero": the 3D view focuses on
 * it, the rest of the lineup fades out, and the editor below edits only it.
 */

import { useStore, useActiveSeries } from '@/store';
import { LayoutGrid } from 'lucide-react';
import IndividualEditor from './IndividualEditor';

export default function HeroBottleEditor() {
  const { ui, setHeroBottle } = useStore();
  const activeSeries = useActiveSeries();

  if (!activeSeries || activeSeries.bottles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <p>Select a series to edit its bottles</p>
      </div>
    );
  }

  const heroIndex = activeSeries.bottles.findIndex((b) => b.id === ui.heroBottleId);
  const hero = heroIndex >= 0 ? activeSeries.bottles[heroIndex] : null;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-600 font-medium">Hero Bottle</label>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {activeSeries.bottles.map((bottle) => {
            const active = bottle.id === hero?.id;
            return (
              <button
                key={bottle.id}
                onClick={() => setHeroBottle(bottle.id)}
                className={`
                  px-2 py-1.5 rounded-md border text-left transition-colors
                  ${active
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
                  }
                `}
              >
                <span className="block text-xs font-semibold truncate">{bottle.name}</span>
                <span className="block text-[10px] text-gray-500 truncate">
                  {bottle.dimensions.diameter.toFixed(2)} mm · {bottle.dimensions.neckFinish}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {hero ? (
        <>
          <button
            onClick={() => setHeroBottle(null)}
            className="btn btn-secondary w-full flex items-center justify-center gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            Return to Full Lineup
          </button>
          <IndividualEditor bottleIndex={heroIndex} />
        </>
      ) : (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          Choose a size, or click a bottle in the 3D view, to make it the hero. The rest of the
          lineup fades back so you can edit that bottle and cap on their own.
        </p>
      )}
    </div>
  );
}
