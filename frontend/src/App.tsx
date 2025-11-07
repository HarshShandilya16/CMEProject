// src/App.tsx
import { useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Portfolio } from './pages/Portfolio';
import { OptionChainTable } from './components/OptionChainTable';
import { useAppStore } from './store/useAppStore';

function App() {
  const activeView = useAppStore((state) => state.activeView);
  const theme = useAppStore((state) => state.theme);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div
      className={`h-screen grid grid-rows-[auto_1fr] overflow-hidden ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      {/* Navbar */}
      <Navbar />

      {/* Main Layout: Sidebar + Content */}
      <div className="grid grid-cols-[auto_1fr] overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main
          className={`${
            theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
          } overflow-y-auto transition-colors`}
        >
          {/* Content based on active view */}
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'optionchain' && <OptionChainTable />}
          {activeView === 'analytics' && (
            <div className="p-6 text-center">
              <h2
                className={`text-3xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}
              >
                Analytics
              </h2>
              <p
                className={`mt-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Coming Soon...
              </p>
            </div>
          )}
          {activeView === 'portfolio' && <Portfolio />}
        </main>
      </div>
    </div>
  );
}

export default App;
