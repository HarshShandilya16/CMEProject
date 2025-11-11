// src/store/useAppStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PortfolioLeg } from '../data/types';

type Theme = 'light' | 'dark';
type ActiveView = 'home' | 'dashboard' | 'optionchain' | 'analytics' | 'portfolio' | 'signin' | 'signup' | 'profile';

interface AppState {
  currentSymbol: string;
  portfolio: PortfolioLeg[];
  theme: Theme;
  activeView: ActiveView;
  setCurrentSymbol: (symbol: string) => void;
  addLeg: (leg: PortfolioLeg) => void;
  removeLeg: (index: number) => void;
  clearPortfolio: () => void;
  toggleTheme: () => void;
  setActiveView: (view: ActiveView) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentSymbol: 'NIFTY',
      portfolio: [],
      theme: 'dark',
      activeView: 'dashboard',
      setCurrentSymbol: (symbol) => set({ currentSymbol: symbol }),
      addLeg: (leg) => set((state) => ({ portfolio: [...state.portfolio, leg] })),
      removeLeg: (index) =>
        set((state) => ({
          portfolio: state.portfolio.filter((_, i) => i !== index),
        })),
      clearPortfolio: () => set({ portfolio: [] }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: 'app-storage',
    }
  )
);

