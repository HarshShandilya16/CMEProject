import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { login, googleLogin } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { app as firebaseApp } from '../services/firebase';

export const SignIn: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    setActiveView('profile');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      setActiveView('profile');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth(firebaseApp);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await googleLogin(idToken);
      setActiveView('profile');
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      <h2 className="text-2xl font-bold mb-6">Sign In</h2>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
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
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <button
          type="button"
          onClick={() => setActiveView('signup')}
          className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ml-3 px-4 py-2 rounded`}
        >
          Create account
        </button>
      </form>
      <div className="mt-6">
        <button
          type="button"
          onClick={handleGoogle}
          className={`px-4 py-2 rounded ${
            theme === 'dark' ? 'bg-white text-gray-900' : 'bg-white'
          } border flex items-center gap-2`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303C33.602,32.264,29.176,36,24,36c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.156,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.156,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.123,0,9.828-1.965,13.409-5.179l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.142,0-9.556-3.281-11.292-7.796l-6.52,5.025C9.478,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-1.358,3.264-4.573,5.917-8.303,5.917 c-5.142,0-9.556-3.281-11.292-7.796l-6.52,5.025C9.478,39.556,16.227,44,24,44c8.284,0,15.24-5.373,17.577-13.083 C43.862,21.35,44,22.659,43.611,20.083z"/></svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
};
