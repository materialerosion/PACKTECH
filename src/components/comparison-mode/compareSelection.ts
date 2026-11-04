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
  setPortfolio: (side: CompareSide, id: string) => void;
  setBottles: (side: CompareSide, ids: string[] | null) => void;
  swap: () => void;
  setUnits: (units: CompareUnits) => void;
  setView: (view: CompareView) => void;
}

export const useCompareSelection = create<CompareSelection>()((set) => ({
  A: { portfolioId: '', bottleIds: null },
  B: { portfolioId: '', bottleIds: null },
  units: 'mm',
  view: 'dimensions',
  setPortfolio: (side, portfolioId) => set({ [side]: { portfolioId, bottleIds: null } }),
  setBottles: (side, bottleIds) => set((s) => ({ [side]: { ...s[side], bottleIds } })),
  swap: () => set((s) => ({ A: s.B, B: s.A })),
  setUnits: (units) => set({ units }),
  setView: (view) => set({ view }),
}));
