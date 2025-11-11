import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
  // eslint-disable-next-line no-console
  console.warn('Firebase config is missing. Set VITE_FIREBASE_* variables in frontend/.env');
}

export const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
