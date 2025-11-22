// src/App.tsx
import { useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import Dashboard from './pages/Dashboard.tsx';
import { OptionChainTable } from './components/OptionChainTable';
import { useAppStore } from './store/useAppStore';
import Home from './pages/Home';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Profile } from './pages/Profile';
import Analytics from './pages/Analytics';

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
      className={`min-h-screen ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      {/* Navbar */}
      <Navbar />

      {/* Main Content Area - Full Width */}
      <main
        className={`${
          theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        } transition-colors`}
      >
        {/* Content based on active view */}
        {activeView === 'home' && <Home />}
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'optionchain' && <OptionChainTable />}
        {activeView === 'analytics' && <Analytics />}
        {activeView === 'signin' && <SignIn />}
        {activeView === 'signup' && <SignUp />}
        {activeView === 'profile' && <Profile />}
      </main>
    </div>
  );
}

export default App;