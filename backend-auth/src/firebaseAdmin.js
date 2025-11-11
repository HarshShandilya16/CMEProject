import admin from 'firebase-admin';

let app;

export function initFirebaseAdmin() {
  if (app) return app;
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not set in .env');
  }
  const creds = JSON.parse(credsJson);
  app = admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
  return app;
}

export async function verifyIdToken(idToken) {
  initFirebaseAdmin();
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded;
}
