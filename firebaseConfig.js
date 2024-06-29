import { initializeApp, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';



// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC_mOH0aWrDhAJBZyz9zOcgfxThwETdk1E",
  authDomain: "noichu-43249.firebaseapp.com",
  projectId: "noichu-43249",
  storageBucket: "noichu-43249.appspot.com",
  messagingSenderId: "742048409803",
  appId: "1:742048409803:web:3349ecc7a4e5a43210134e",
  measurementId: "G-K6TH1GVM3Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const storage = getStorage(app);

// Initialize Firebase Auth with React Native persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db, storage, getApp, getAuth };