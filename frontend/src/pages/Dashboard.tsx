// frontend/src/pages/Dashboard.tsx
import React from 'react';
import { useAppStore } from '../store/useAppStore'; 
import PriceChart from '../components/charts/PriceChart'; 
import { MarketSentimentWidget } from '../components/widgets/MarketSentimentWidget'; 
import { MaxPainWidget } from '../components/widgets/MaxPainWidget'; 
import { IVvsRVWidget } from '../components/widgets/IVvsRVWidget'; 
import { OpenInterestWidget } from '../components/widgets/OpenInterestWidget'; 
import { AnimatedWidget } from '../components/animation/AnimatedWidget'; 


const getThemeClasses = (theme: 'light' | 'dark') => {
  return {
    bg: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100', 
    textPrimary: theme === 'dark' ? 'text-white' : 'text-gray-900',
  };
};

const Dashboard: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();
  const classes = getThemeClasses(theme);

  const cardClass = theme === 'dark' 
    ? 'bg-gray-800 border border-gray-700' 
    : 'bg-white border border-gray-200';

  return (
    <div className={`w-full min-h-screen p-4 md:p-6 ${classes.bg}`}>
      
      {}
      <AnimatedWidget delay={0}>
        <h1 className={`text-3xl font-bold mb-6 ${classes.textPrimary}`}>
          {currentSymbol} Dashboard
        </h1>
      </AnimatedWidget>
      
      {}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {}
        <div className="lg:col-span-8">
          <AnimatedWidget delay={0.1}>
            <div className={`${cardClass} rounded-xl shadow-lg p-6 h-full`}>
              <PriceChart />
            </div>
          </AnimatedWidget>
        </div>

        {}
        <div className="lg:col-span-4">
          <AnimatedWidget delay={0.2}>
            <MarketSentimentWidget />
          </AnimatedWidget>
        </div>

        {}
        
        <div className="lg:col-span-3">
          <AnimatedWidget delay={0.3}>
            <MaxPainWidget />
          </AnimatedWidget>
        </div>

        <div className="lg:col-span-3">
          <AnimatedWidget delay={0.4}>
            <IVvsRVWidget />
          </AnimatedWidget>
        </div>

        <div className="lg:col-span-6">
          <AnimatedWidget delay={0.5}>
            <OpenInterestWidget />
          </AnimatedWidget>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
