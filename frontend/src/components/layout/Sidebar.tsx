// src/components/layout/Sidebar.tsx
import React from 'react';
import { FiHome, FiTrendingUp, FiBarChart2, FiPieChart } from 'react-icons/fi';
import { useAppStore } from '../../store/useAppStore';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  view: 'dashboard' | 'optionchain' | 'analytics' | 'portfolio';
  active: boolean;
  onClick: () => void;
  theme: 'light' | 'dark';
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  active,
  onClick,
  theme,
}) => {
  return (
    <li
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
          : theme === 'dark'
          ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </li>
  );
};

export const Sidebar: React.FC = () => {
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const theme = useAppStore((state) => state.theme);
  const portfolio = useAppStore((state) => state.portfolio);

  return (
    <aside
      className={`w-64 ${
        theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900 border-r border-gray-200'
      } h-full overflow-y-auto transition-colors`}
    >
      <div className="p-6">
        <h2
          className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          } mb-4`}
        >
          Navigation
        </h2>
        <ul className="space-y-2">
          <NavItem
            icon={<FiHome />}
            label="Dashboard"
            view="dashboard"
            active={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
            theme={theme}
          />
          <NavItem
            icon={<FiTrendingUp />}
            label="Option Chain"
            view="optionchain"
            active={activeView === 'optionchain'}
            onClick={() => setActiveView('optionchain')}
            theme={theme}
          />
          <NavItem
            icon={<FiBarChart2 />}
            label="Analytics"
            view="analytics"
            active={activeView === 'analytics'}
            onClick={() => setActiveView('analytics')}
            theme={theme}
          />
          <NavItem
            icon={<FiPieChart />}
            label="Portfolio"
            view="portfolio"
            active={activeView === 'portfolio'}
            onClick={() => setActiveView('portfolio')}
            theme={theme}
          />
        </ul>

        {/* Portfolio Summary */}
        {portfolio.length > 0 && (
          <div
            onClick={() => setActiveView('portfolio')}
            className={`mt-6 p-4 rounded-lg cursor-pointer transition-all ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <h3
              className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              } mb-2`}
            >
              Active Positions
            </h3>
            <div
              className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}
            >
              {portfolio.length}
            </div>
            <p
              className={`text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              } mt-1 flex items-center gap-1`}
            >
              Click to view details
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

