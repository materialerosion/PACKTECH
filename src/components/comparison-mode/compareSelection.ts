/**
 * Portfolios and bottles picked in the Compare tab, shared between the sidebar
 * and the main view.
 */

import { create } from 'zustand';

export type CompareUnits = 'mm' | 'in';
export type CompareView = 'dimensions' | 'coverage';
export type CompareSide = 'A' | 'B';

interface SidePick {
  portfolioId: string;
  /** Bottle ids to show; null shows the whole portfolio. */
  bottleIds: string[] | null;
}

interface CompareSelection {
  A: SidePick;
  B: SidePick;
  units: CompareUnits;
  view: CompareView;
  /** PRODUCT_PRESETS id drawn as a settled fill in every silhouette; null hides the fill. */
  fillProductId: string | null;
  fillCount: number;
  /**
   * Measurement labels kept in a head-to-head. Null keeps every row.
   */
  importantRows: string[] | null;
  setPortfolio: (side: CompareSide, id: string) => void;
  setBottles: (side: CompareSide, ids: string[] | null) => void;
  swap: () => void;
  setUnits: (units: CompareUnits) => void;
  setView: (view: CompareView) => void;
  setFillProduct: (id: string | null) => void;
  setFillCount: (count: number) => void;
  setImportantRows: (labels: string[] | null) => void;
}

export const useCompareSelection = create<CompareSelection>()((set) => ({
  A: { portfolioId: '', bottleIds: null },
  B: { portfolioId: '', bottleIds: null },
  units: 'mm',
  view: 'dimensions',
  fillProductId: null,
  fillCount: 100,
  importantRows: null,
  setPortfolio: (side, portfolioId) => set({ [side]: { portfolioId, bottleIds: null } }),
  setBottles: (side, bottleIds) => set((s) => ({ [side]: { ...s[side], bottleIds } })),
  swap: () => set((s) => ({ A: s.B, B: s.A })),
  setUnits: (units) => set({ units }),
  setView: (view) => set({ view }),
  setFillProduct: (fillProductId) => set({ fillProductId }),
  setFillCount: (count) => set({ fillCount: Math.max(1, Math.min(2000, Math.round(count) || 1)) }),
  setImportantRows: (importantRows) => set({ importantRows }),
}));
