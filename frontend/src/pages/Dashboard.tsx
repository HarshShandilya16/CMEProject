// frontend/src/pages/Dashboard.tsx
import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { AnimatedWidget } from '../components/animation/AnimatedWidget';
import SymbolSelector from '../components/SymbolSelector';

// Import ALL Widgets
import PriceChart from '../components/charts/PriceChart';
import { MarketSentimentWidget } from '../components/widgets/MarketSentimentWidget';
import { MaxPainWidget } from '../components/widgets/MaxPainWidget';
import { IVvsRVWidget } from '../components/widgets/IVvsRVWidget';
import { OpenInterestWidget } from '../components/widgets/OpenInterestWidget';
import NewsPanel from '../components/NewsPanel'; // ← Use your existing component
import { GraphicalOptionChain } from '../components/charts/GraphicalOptionChain';

const getThemeClasses = (theme: 'light' | 'dark') => ({
  bg: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100',
  textPrimary: theme === 'dark' ? 'text-white' : 'text-gray-900',
});

const Dashboard: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();
  const classes = getThemeClasses(theme);
  const cardClass = theme === 'dark' 
    ? 'bg-gray-800 border border-gray-700' 
    : 'bg-white border border-gray-200';

  return (
    <div className={`w-full min-h-screen p-4 md:p-6 ${classes.bg}`}>
      
      {/* Header with Symbol Selector */}
      <AnimatedWidget delay={0}>
        <div className={`${cardClass} rounded-xl shadow-lg p-4 md:p-6 mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold ${classes.textPrimary}`}>
                {currentSymbol} Command Center
              </h1>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                Real-time market intelligence and analytics
              </p>
            </div>
            <div className="w-full lg:w-auto">
              <SymbolSelector />
            </div>
          </div>
        </div>
      </AnimatedWidget>
      
      {/* UNIFIED GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* TOP ROW: Price Chart & Key Metrics Stack */}
        <div className="lg:col-span-8">
          <AnimatedWidget delay={0.1}>
            <div className={`${cardClass} rounded-xl shadow-lg p-6`}>
              <PriceChart />
            </div>
          </AnimatedWidget>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="flex-1">
            <AnimatedWidget delay={0.2}>
              <MarketSentimentWidget />
            </AnimatedWidget>
          </div>
          <div className="flex-1">
            <AnimatedWidget delay={0.3}>
              <IVvsRVWidget />
            </AnimatedWidget>
          </div>
          <div className="flex-1">
            <AnimatedWidget delay={0.4}>
              <MaxPainWidget />
            </AnimatedWidget>
          </div>
        </div>

        {/* MIDDLE ROW: Graphical Option Chain & OI Summary */}
        <div className="lg:col-span-8">
          <AnimatedWidget delay={0.5}>
            <GraphicalOptionChain />
          </AnimatedWidget>
        </div>

        <div className="lg:col-span-4">
          <AnimatedWidget delay={0.6}>
            <OpenInterestWidget />
          </AnimatedWidget>
        </div>

        {/* BOTTOM ROW: News Feed (Full Width) */}
        <div className="lg:col-span-12">
          <AnimatedWidget delay={0.7}>
            <NewsPanel /> {/* ← Your existing component */}
          </AnimatedWidget>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;