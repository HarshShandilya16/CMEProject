// frontend/src/pages/Home.tsx
import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';

// Helper to get the theme
const getThemeClasses = (theme: 'light' | 'dark') => {
  return {
    bg: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100',
    textPrimary: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-gray-400' : 'text-gray-300',
  };
};

const Home: React.FC = () => {
  // 1. Get state and navigation
  const { theme, setActiveView } = useAppStore();
  const { token } = useAuthStore();
  const classes = getThemeClasses(theme);
  
  // Check if user is logged in (has a token)
  const isLoggedIn = !!token;

  // 2. Add the "brain"
  useEffect(() => {
    if (isLoggedIn) {
      // User is logged in, send them to the dashboard
      setActiveView('dashboard');
    }
  }, [isLoggedIn, setActiveView]); // This runs when the component loads and if login state changes

  // 3. Add the "anti-flash" guard
  // If we are logged in, render nothing while we wait for the redirect.
  if (isLoggedIn) {
    return null;
  }

  // 4. Render the logged-out view
  return (
    <div className={`p-8 md:p-12 ${classes.bg} ${classes.textPrimary} rounded-lg`}>
      <h1 className="text-4xl font-bold">Welcome to Options Pro</h1>
      <p className={`text-lg ${classes.textSecondary} mt-2`}>
        Navigate to the Dashboard to view live market insights, or sign in to access your profile.
      </p>
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => setActiveView('dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition-colors"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => setActiveView('signin')}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default Home;
