import { create } from 'zustand';

/** Simulated seconds per real second; the per-frame compute budget still caps it. */
export const SIM_SPEEDS = [1, 2, 4, 16] as const;
export type SimSpeed = (typeof SIM_SPEEDS)[number];

interface SimSpeedState {
  speed: SimSpeed;
  setSpeed: (speed: SimSpeed) => void;
}

export const useSimSpeed = create<SimSpeedState>((set) => ({
  speed: 4,
  setSpeed: (speed) => set({ speed }),
}));
