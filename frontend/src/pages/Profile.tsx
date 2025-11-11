import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { fetchMe } from '../services/authService';

export const Profile: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState(user);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const u = await fetchMe();
        setMe(u);
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (!token) {
    setActiveView('signin');
    return null;
  }

  return (
    <div className={`p-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {me && (
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border'} rounded p-4 max-w-md`}>
          <div className="mb-2"><span className="font-semibold">Name:</span> {me.name}</div>
          <div className="mb-2"><span className="font-semibold">Email:</span> {me.email}</div>
          <div className="text-sm text-gray-500">User ID: {me._id}</div>
        </div>
      )}
    </div>
  );
};
