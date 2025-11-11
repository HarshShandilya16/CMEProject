import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { register } from '../services/authService';

export const SignUp: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(name, email, password);
      setActiveView('profile');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      <h2 className="text-2xl font-bold mb-6">Create Account</h2>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <input
          className={`w-full px-4 py-2 rounded ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white border'}`}
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={`w-full px-4 py-2 rounded ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white border'}`}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={`w-full px-4 py-2 rounded ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white border'}`}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Sign Up'}
        </button>
        <button
          type="button"
          onClick={() => setActiveView('signin')}
          className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ml-3 px-4 py-2 rounded`}
        >
          Have an account? Sign In
        </button>
      </form>
    </div>
  );
};
