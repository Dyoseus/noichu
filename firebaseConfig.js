// firebaseConfig.js
import { initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import asyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_mOH0aWrDhAJBZyz9zOcgfxThwETdk1E",
  authDomain: "noichu-43249.firebaseapp.com",
  databaseURL: "https://noichu-43249-default-rtdb.firebaseio.com",
  projectId: "noichu-43249",
  storageBucket: "noichu-43249.appspot.com",
  messagingSenderId: "742048409803",
  appId: "1:742048409803:web:3349ecc7a4e5a43210134e",
  measurementId: "G-K6TH1GVM3Q"
};



export {auth, firestore, storage, asyncStorage };