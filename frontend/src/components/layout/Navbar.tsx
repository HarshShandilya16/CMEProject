// src/components/layout/Navbar.tsx
import React from 'react';
import { FiSun, FiMoon, FiBell, FiSettings } from 'react-icons/fi';
import { useAppStore } from '../../store/useAppStore';
import { SymbolSelector } from '../SymbolSelector';
import { useAuthStore } from '../../store/useAuthStore';
import { logout } from '../../services/authService';

export const Navbar: React.FC = () => {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const { user } = useAuthStore();

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
            {/* Home */}
            <button
              onClick={() => setActiveView('home')}
              className={`px-3 py-1 rounded text-sm ${
                theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Home
            </button>

            {/* Auth actions */}
            {user ? (
              <>
                <button
                  onClick={() => setActiveView('profile')}
                  className={`px-3 py-1 rounded text-sm ${
                    theme === 'dark' ? 'bg-indigo-700 hover:bg-indigo-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {user.name.split(' ')[0]}
                </button>
                <button
                  onClick={() => {
                    logout();
                    setActiveView('home');
                  }}
                  className={`px-3 py-1 rounded text-sm ${
                    theme === 'dark' ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveView('signin')}
                  className={`px-3 py-1 rounded text-sm ${
                    theme === 'dark' ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveView('signup')}
                  className={`px-3 py-1 rounded text-sm ${
                    theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Sign Up
                </button>
              </>
            )}

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

