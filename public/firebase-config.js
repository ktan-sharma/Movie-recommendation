// Firebase configuration and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBl3JJMFSkWYaTFpw2jJLWDGeCyAmgcM2w",
  authDomain: "flickpick-23118.firebaseapp.com",
  projectId: "flickpick-23118",
  storageBucket: "flickpick-23118.appspot.com",
  messagingSenderId: "493432586221",
  appId: "1:493432586221:web:0a15cbb278ee94261c31e4",
  measurementId: "G-PHJKYQ7BTP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
