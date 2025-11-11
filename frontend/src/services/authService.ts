import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const AUTH_API = 'http://localhost:3001';

export async function register(name: string, email: string, password: string) {
  const res = await axios.post(`${AUTH_API}/api/auth/register`, { name, email, password });
  const { token, user } = res.data;
  useAuthStore.getState().setAuth(token, user);
  return user;
}

export async function login(email: string, password: string) {
  const res = await axios.post(`${AUTH_API}/api/auth/login`, { email, password });
  const { token, user } = res.data;
  useAuthStore.getState().setAuth(token, user);
  return user;
}

export function logout() {
  useAuthStore.getState().clearAuth();
}

export async function fetchMe() {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('No token');
  const res = await axios.get(`${AUTH_API}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.user;
}
