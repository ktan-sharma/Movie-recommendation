// Firebase Auth & Firestore logic for login/register
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  doc,
  setDoc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Ensure user doc exists in Firestore for this user (create if missing)


export async function ensureUserDocExists(user) {
  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    const userDoc = {
      uid: user.uid,
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      profilePicture: user.photoURL || '',
    };
    await setDoc(docRef, userDoc);
    return userDoc;
  } else {
    return docSnap.data();
  }
}

// Register user and store info in Firestore
export async function registerUser(name, email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName: name });
  // Store user info in Firestore
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    uid: userCredential.user.uid,
    name,
    email
  });
  return userCredential.user;
}

// Login user
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Logout user
export async function logoutUser() {
  await signOut(auth);
}

// Get current user info
export function onUserStateChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

// Get user info from Firestore
export async function getUserInfo(uid) {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}
