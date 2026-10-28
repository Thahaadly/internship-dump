// Firebase Firestore (Modular SDK via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBothEv081tS2ghZ2o0r4dO8qIzCCB_kD4",
  authDomain: "internship-dump.firebaseapp.com",
  projectId: "internship-dump",
  storageBucket: "internship-dump.firebasestorage.app",
  messagingSenderId: "507854623683",
  appId: "1:507854623683:web:2bc0b8dfc25abd94752376",
  measurementId: "G-QFM9EST2G8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp
};
