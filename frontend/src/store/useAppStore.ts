// src/store/useAppStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PortfolioLeg } from '../data/types';
import type { IndexKey } from '../data/marketconstants';

type Theme = 'light' | 'dark';
type ActiveView = 'home' | 'dashboard' | 'optionchain' | 'analytics' | 'portfolio' | 'signin' | 'signup' | 'profile';

interface AppState {
  selectedIndex: IndexKey;
  selectedStock: string | null;
  currentSymbol: string;
  portfolio: PortfolioLeg[];
  theme: Theme;
  activeView: ActiveView;
  
  setSelectedIndex: (index: IndexKey) => void;
  setSelectedStock: (stock: string | null) => void;
  setCurrentSymbol: (symbol: string) => void;
  addLeg: (leg: PortfolioLeg) => void;
  removeLeg: (index: number) => void;
  clearPortfolio: () => void;
  toggleTheme: () => void;
  setActiveView: (view: ActiveView) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedIndex: 'NIFTY',
      selectedStock: null,
      currentSymbol: 'NIFTY',
      portfolio: [],
      theme: 'dark',
      activeView: 'dashboard',
      
      setSelectedIndex: (index) => {
        console.log('🟦 STORE: setSelectedIndex called with:', index);
        set({ 
          selectedIndex: index,
          selectedStock: null,
          currentSymbol: index
        });
        const newState = get();
        console.log('🟦 STORE: After update:', {
          selectedIndex: newState.selectedIndex,
          selectedStock: newState.selectedStock,
          currentSymbol: newState.currentSymbol
        });
      },
      
      setSelectedStock: (stock) => {
        console.log('🟩 STORE: setSelectedStock called with:', stock);
        const state = get();
        const newSymbol = stock || state.selectedIndex;
        console.log('🟩 STORE: Computed newSymbol:', newSymbol);
        set({ 
          selectedStock: stock,
          currentSymbol: newSymbol
        });
        const newState = get();
        console.log('🟩 STORE: After update:', {
          selectedIndex: newState.selectedIndex,
          selectedStock: newState.selectedStock,
          currentSymbol: newState.currentSymbol
        });
      },
      
      setCurrentSymbol: (symbol) => {
        console.log('🟨 STORE: setCurrentSymbol called with:', symbol);
        const upperSymbol = symbol.toUpperCase();
        
        if (['NIFTY', 'BANKNIFTY', 'FINNIFTY'].includes(upperSymbol)) {
          set({ 
            selectedIndex: upperSymbol as IndexKey,
            selectedStock: null,
            currentSymbol: upperSymbol
          });
        } else {
          set({ 
            selectedStock: upperSymbol,
            currentSymbol: upperSymbol
          });
        }
      },
      
      addLeg: (leg) => set((state) => ({ portfolio: [...state.portfolio, leg] })),
      removeLeg: (index) => set((state) => ({ portfolio: state.portfolio.filter((_, i) => i !== index) })),
      clearPortfolio: () => set({ portfolio: [] }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: 'app-storage',
    }
  )
);