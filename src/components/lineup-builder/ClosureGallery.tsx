/**
 * Closure Gallery
 * Visual previews of uploaded (drawing-based) closures in the active portfolio,
 * with SKU links from NA Packaging Category Portfolio.xlsx.
 */

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bottle } from '@/types/bottle';
import { ClosureModel } from '@/components/3d/Bottle3D';
import {
  CapGroup,
  groupCaps,
  skusForBottle,
  skusForCapGroup,
} from '@/services/portfolioService';
import { SKU_PORTFOLIO_SOURCE } from '@/data/presets/skuPortfolio';
import { CircleDot } from 'lucide-react';

interface ClosureGalleryProps {
  bottles: Bottle[];
  /** Highlight caps used by the current hero bottle. */
  heroBottle?: Bottle | null;
  onSelectBottle?: (bottleId: string) => void;
}

function ClosurePreview({ group }: { group: CapGroup }) {
  const closure = group.closure!;
  const r = Math.max(closure.topDiameter, closure.bottomDiameter) / 2;
  const h = closure.height;
  const span = Math.max(r * 2, h);
  const dist = span * 2.4;

  return (
    <div className="h-28 w-full rounded-md bg-gradient-to-b from-slate-50 to-slate-100 border border-gray-200 overflow-hidden">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [dist * 0.75, dist * 0.45, dist], fov: 32, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#f8fafc']} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[40, 60, 30]} intensity={1.05} />
        <directionalLight position={[-30, 20, -20]} intensity={0.35} />
        <group position={[0, -h * 0.05, 0]}>
          <ClosureModel closure={closure} color={group.capColor} />
        </group>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          target={[0, h * 0.45, 0]}
          autoRotate
          autoRotateSpeed={1.2}
        />
      </Canvas>
    </div>
  );
}

function GenericCapPlaceholder({ label }: { label: string }) {
  return (
    <div className="h-28 w-full rounded-md bg-gray-50 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-1">
      <CircleDot className="w-6 h-6 opacity-40" />
      <span className="text-[10px] px-2 text-center">{label}</span>
    </div>
  );
}

export default function ClosureGallery({ bottles, heroBottle, onSelectBottle }: ClosureGalleryProps) {
  const caps = useMemo(() => groupCaps(bottles), [bottles]);
  const drawn = caps.filter((c) => c.closure);
  const generic = caps.filter((c) => !c.closure);

  const heroSkus = useMemo(
    () => (heroBottle ? skusForBottle(heroBottle) : []),
    [heroBottle]
  );

  if (bottles.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4">
      <div>
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Closures in portfolio</h3>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Drawing-based caps shown below. SKU links from {SKU_PORTFOLIO_SOURCE}.
        </p>
      </div>

      {heroBottle && (
        <div className="rounded-lg bg-primary-50/60 border border-primary-100 px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wider text-primary-700">
            SKUs on hero · {heroBottle.name}
          </div>
          {heroSkus.length === 0 ? (
            <p className="text-[11px] text-gray-500 mt-1">
              No portfolio SKU matched this bottle size yet (needs Bottle Size in the workbook).
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1 max-h-28 overflow-y-auto">
              {heroSkus.slice(0, 8).map((sku) => (
                <li key={`${sku.gtin}-${sku.bottleDo}-${sku.closureDo}-${sku.description}`} className="text-[11px] text-gray-700">
                  <span className="font-medium">{sku.brand}</span>
                  {sku.netContents ? ` · ${sku.netContents}` : ''}
                  <span className="block text-[10px] text-gray-500 truncate">
                    {sku.description}
                    {sku.bottleDo ? ` · bottle ${sku.bottleDo}` : ''}
                    {sku.closureDo ? ` · closure ${sku.closureDo}` : ''}
                  </span>
                </li>
              ))}
              {heroSkus.length > 8 && (
                <li className="text-[10px] text-gray-400">+{heroSkus.length - 8} more</li>
              )}
            </ul>
          )}
        </div>
      )}

      {drawn.length === 0 ? (
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
          No uploaded closure drawings in this portfolio yet. Caps from supplier drawings
          (Berry / Myerstown / Pain &amp; Cardio) appear here with a 3D preview.
        </p>
      ) : (
        <div className="space-y-2.5">
          {drawn.map((group) => {
            const skus = skusForCapGroup(group, bottles);
            const usedByHero = heroBottle ? group.bottles.includes(heroBottle.name) : false;
            const sample = group.sampleBottle;

            return (
              <button
                key={group.key}
                type="button"
                onClick={() => sample && onSelectBottle?.(sample.id)}
                className={`
                  w-full text-left rounded-lg border p-2 transition-colors
                  ${usedByHero
                    ? 'border-primary-400 bg-primary-50/40'
                    : 'border-gray-200 bg-white hover:border-primary-300'
                  }
                `}
              >
                <Suspense fallback={<div className="h-28 bg-gray-50 animate-pulse rounded-md" />}>
                  <ClosurePreview group={group} />
                </Suspense>
                <div className="mt-2 space-y-1">
                  <div className="text-xs font-semibold text-gray-900 leading-snug">{group.label}</div>
                  <div className="text-[10px] text-gray-500">
                    {group.style}
                    {group.material ? ` · ${group.material}` : ''}
                    {group.diameterMm != null && group.heightMm != null
                      ? ` · Ø${group.diameterMm.toFixed(1)} × ${group.heightMm.toFixed(1)} mm`
                      : ''}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {group.bottles.map((name) => (
                      <span
                        key={name}
                        className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] font-mono text-gray-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  {skus.length > 0 && (
                    <div className="text-[10px] text-gray-500 pt-0.5">
                      {skus.length} SKU{skus.length === 1 ? '' : 's'} in category portfolio
                      {skus[0]?.closureDo ? ` · e.g. ${skus[0].closureDo}` : ''}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {generic.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Generic caps (no drawing)
          </div>
          {generic.map((group) => (
            <div key={group.key} className="rounded-lg border border-gray-100 p-2">
              <GenericCapPlaceholder label={group.label} />
              <div className="mt-1.5 text-[10px] text-gray-500">{group.bottles.join(' · ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
