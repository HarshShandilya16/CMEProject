// src/pages/Portfolio.tsx
import React from 'react';
import { FiTrash2, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { useAppStore } from '../store/useAppStore';
import { showToast } from '../utils/toast';

export const Portfolio: React.FC = () => {
  const portfolio = useAppStore((state) => state.portfolio);
  const clearPortfolio = useAppStore((state) => state.clearPortfolio);
  const removeLeg = useAppStore((state) => state.removeLeg);
  const theme = useAppStore((state) => state.theme);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all positions?')) {
      clearPortfolio();
      showToast('Portfolio cleared', 'info');
    }
  };

  const handleRemove = (index: number) => {
    removeLeg(index);
    showToast('Position removed', 'info');
  };

  // Calculate totals
  const totalPremium = portfolio.reduce((sum, leg) => {
    return sum + (leg.position === 'buy' ? -leg.premium : leg.premium);
  }, 0);

  const callsCount = portfolio.filter((leg) => leg.type === 'CE').length;
  const putsCount = portfolio.filter((leg) => leg.type === 'PE').length;

  if (portfolio.length === 0) {
    return (
      <div className={`p-6 min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <h1 className={`text-3xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Portfolio
          </h1>
          <div
            className={`${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            } rounded-xl shadow-lg p-12 text-center`}
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              No Active Positions
            </h2>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
              Start building your portfolio by buying or selling options from the Option Chain
            </p>
            <button
              onClick={() => useAppStore.getState().setActiveView('optionchain')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Go to Option Chain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Portfolio
          </h1>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <FiTrash2 size={18} />
            Clear All
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div
            className={`${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            } rounded-xl shadow-lg p-6`}
          >
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Total Positions
            </h3>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              {portfolio.length}
            </div>
          </div>

          <div
            className={`${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            } rounded-xl shadow-lg p-6`}
          >
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Calls / Puts
            </h3>
            <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {callsCount} / {putsCount}
            </div>
          </div>

          <div
            className={`${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            } rounded-xl shadow-lg p-6`}
          >
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Net Premium
            </h3>
            <div
              className={`text-3xl font-bold ${
                totalPremium >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              ₹{Math.abs(totalPremium).toFixed(2)}
            </div>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {totalPremium >= 0 ? 'Credit' : 'Debit'}
            </p>
          </div>
        </div>

        {/* Positions Table */}
        <div
          className={`${
            theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          } rounded-xl shadow-lg overflow-hidden`}
        >
          <div className="overflow-x-auto">
            <table className={`w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Position
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Type
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Strike
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Premium
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    P&L Impact
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {portfolio.map((leg, index) => {
                  const impact = leg.position === 'buy' ? -leg.premium : leg.premium;
                  return (
                    <tr
                      key={index}
                      className={`${
                        theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
                      } transition-colors`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {leg.position === 'buy' ? (
                            <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                              <FiTrendingUp size={12} />
                              BUY
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                              <FiTrendingDown size={12} />
                              SELL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap font-semibold ${leg.type === 'CE' ? 'text-green-500' : 'text-red-500'}`}>
                        {leg.type}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {leg.strike.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        ₹{leg.premium.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            impact >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {impact >= 0 ? '+' : ''}₹{impact.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleRemove(index)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Remove Position"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

