import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const Home: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <div className={`p-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      <h2 className="text-3xl font-bold mb-4">Welcome to Options Pro</h2>
      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
        Navigate to the Dashboard to view live market insights, or sign in to access your profile.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setActiveView('dashboard')}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => setActiveView('signin')}
          className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-4 py-2 rounded`}
        >
          Sign In
        </button>
      </div>
    </div>
  );
};
