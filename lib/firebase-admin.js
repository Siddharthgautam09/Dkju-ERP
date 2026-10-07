import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// You generally want to store your service account keys in environment variables
// for security.
// However, if you are running locally with 'firebase login' and have sufficient permissions,
// or on a platform with Google Application Default Credentials (like Vercel with specific env vars),
// we can initialize without credentials.

// NOTE: For local development without a service account JSON,
// using generic applicationDefault() credentials often works if you've run:
// `gcloud auth application-default login`
// OR `firebase login:ci` and set token.
// BUT: 'firebase login' alone is for CLI tools, not Admin SDK runtime necessarily.

// If you don't have a service account set up, this might still fail if not properly configured.
// But it's the only way to bypass "PERMISSION_DENIED" in API routes without complex innovative authentication.

const firebaseAdminConfig = {
  // If you have a service account:
  // credential: cert(serviceAccount)
  // Or generic:
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

function createAdminApp() {
  if (getApps().length <= 0) {
    return initializeApp(firebaseAdminConfig);
  }
  return getApps()[0];
}

const adminApp = createAdminApp();
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
