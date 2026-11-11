import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return {
      user: result.user,
      idToken,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };
  } catch (error: any) {
    console.error('Google sign-in popup error:', error);
    throw error;
  }
};

export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const idToken = await result.user.getIdToken();
      return {
        user: result.user,
        idToken,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
    }
    return null;
  } catch (error) {
    console.error('Check redirect result error:', error);
    return null;
  }
};

export const firebaseSignOut = async () => {
  await fbSignOut(auth);
};
