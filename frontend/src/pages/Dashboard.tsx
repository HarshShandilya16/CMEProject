// src/pages/Dashboard.tsx
import React from 'react';
import PriceChart from '../components/charts/PriceChart';
import { MarketSentimentWidget } from '../components/widgets/MarketSentimentWidget';
import { useAppStore } from '../store/useAppStore';

export const Dashboard: React.FC = () => {
  const currentSymbol = useAppStore((state) => state.currentSymbol);
  const theme = useAppStore((state) => state.theme);

  const cardClass = `${
    theme === 'dark'
      ? 'bg-gray-800 border border-gray-700'
      : 'bg-white'
  } rounded-xl shadow-lg p-6 transition-all hover:shadow-xl`;

  const headingClass = `text-xl font-semibold mb-4 ${
    theme === 'dark' ? 'text-white' : 'text-gray-800'
  }`;

  const textClass = theme === 'dark' ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* Main Price Chart - Large Block */}
      <div className={`col-span-12 lg:col-span-8 ${cardClass}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            {currentSymbol} Price Chart
          </h2>
          <span className={`text-sm ${textClass}`}>Last 30 Days</span>
        </div>
        <PriceChart />
      </div>

      {/* Market Sentiment Widget */}
      <div className="col-span-12 lg:col-span-4">
        <MarketSentimentWidget />
      </div>

      {/* IV vs RV Widget */}
      <div className={`col-span-12 lg:col-span-4 ${cardClass}`}>
        <h3 className={headingClass}>IV vs RV Spread</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={textClass}>Implied Volatility</span>
            <span className="text-xl font-bold text-purple-500">18.5%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={textClass}>Realized Volatility</span>
            <span className="text-xl font-bold text-green-500">16.2%</span>
          </div>
          <div className={`flex items-center justify-between pt-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <span className={`${textClass} font-semibold`}>Spread</span>
            <span className="text-xl font-bold text-orange-500">+2.3%</span>
          </div>
          <div className={`text-sm ${textClass}`}>
            Options are trading at a premium to realized volatility
          </div>
        </div>
      </div>

      {/* Max Pain Widget */}
      <div className={`col-span-12 lg:col-span-4 ${cardClass}`}>
        <h3 className={headingClass}>Max Pain</h3>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">19,500</div>
            <div className={`text-sm ${textClass} mt-2`}>Strike Price</div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={textClass}>Current Price</span>
            <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>19,500</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={textClass}>Distance</span>
            <span className="font-semibold text-green-500">0 pts</span>
          </div>
          <div className={`text-sm ${textClass}`}>
            Price is currently at max pain level
          </div>
        </div>
      </div>

      {/* Open Interest Widget */}
      <div className={`col-span-12 lg:col-span-4 ${cardClass}`}>
        <h3 className={headingClass}>Open Interest</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={textClass}>Total Call OI</span>
            <span className="text-lg font-bold text-green-500">1.2M</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={textClass}>Total Put OI</span>
            <span className="text-lg font-bold text-red-500">1.5M</span>
          </div>
          <div className={`w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-4 flex overflow-hidden`}>
            <div className="bg-green-500 h-4 transition-all" style={{ width: '44.4%' }} />
            <div className="bg-red-500 h-4 transition-all" style={{ width: '55.6%' }} />
          </div>
          <div className={`text-sm ${textClass} text-center`}>
            Put dominance: 55.6%
          </div>
        </div>
      </div>
    </div>
  );
};

