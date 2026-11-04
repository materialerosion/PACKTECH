/**
 * Portfolios picked in the Compare tab, shared between the sidebar and the main view.
 */

import { create } from 'zustand';

export type CompareUnits = 'mm' | 'in';
export type CompareView = 'dimensions' | 'coverage';

interface CompareSelection {
  portfolioA: string;
  portfolioB: string;
  units: CompareUnits;
  view: CompareView;
  setPortfolioA: (id: string) => void;
  setPortfolioB: (id: string) => void;
  swap: () => void;
  setUnits: (units: CompareUnits) => void;
  setView: (view: CompareView) => void;
}

export const useCompareSelection = create<CompareSelection>()((set) => ({
  portfolioA: '',
  portfolioB: '',
  units: 'mm',
  view: 'dimensions',
  setPortfolioA: (portfolioA) => set({ portfolioA }),
  setPortfolioB: (portfolioB) => set({ portfolioB }),
  swap: () => set((s) => ({ portfolioA: s.portfolioB, portfolioB: s.portfolioA })),
  setUnits: (units) => set({ units }),
  setView: (view) => set({ view }),
}));
