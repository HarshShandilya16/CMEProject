// src/components/layout/Navbar.tsx
import React from 'react';
import { FiSun, FiMoon, FiBell, FiSettings } from 'react-icons/fi';
import { useAppStore } from '../../store/useAppStore';
import { SymbolSelector } from '../SymbolSelector';

export const Navbar: React.FC = () => {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  return (
    <nav
      className={`${
        theme === 'dark'
          ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white'
          : 'bg-gradient-to-r from-white via-gray-50 to-white text-gray-900 border-b border-gray-200'
      } px-6 py-4 shadow-lg transition-colors`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Options Pro
          </h1>
          <SymbolSelector />
        </div>

        <div className="flex items-center gap-6">
          <span
            className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>

          <div className="flex items-center gap-3">
            <button
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Notifications"
            >
              <FiBell size={20} />
            </button>

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-yellow-400'
                  : 'hover:bg-gray-200 text-indigo-600'
              }`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>

            <button
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Settings"
            >
              <FiSettings size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

