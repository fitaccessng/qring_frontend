import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAg0TIlKOOk3AcDn-VGh9HlDQi2eDjk088",
  authDomain: "qring-7ced9.firebaseapp.com",
  projectId: "qring-7ced9",
  storageBucket: "qring-7ced9.firebasestorage.app",
  messagingSenderId: "103048317220",
  appId: "1:103048317220:web:72f9667db6daae62504bb1",
  measurementId: "G-3B48QKGTH7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Set persistence to LOCAL so user stays logged in
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting Firebase persistence:", error);
});

export default app;
