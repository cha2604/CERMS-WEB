import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAEVSQ6R_r0qSECdSp-R1UXOo2vOMRd0q4",
  authDomain: "cerms-web.firebaseapp.com",
  projectId: "cerms-web",
  storageBucket: "cerms-web.firebasestorage.app",
  messagingSenderId: "817544079075",
  appId: "1:817544079075:web:e48d37e386cf4bc28b07d6",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;