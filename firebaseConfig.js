// firebaseConfig.js
// NOTE: React Native Firebase uses native configuration files:
// - google-services.json (Android)
// - GoogleService-Info.plist (iOS)
//
// These files contain your Firebase configuration and should NOT be committed to git.
// Download them from Firebase Console for each environment (dev, staging, prod)

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import asyncStorage from '@react-native-async-storage/async-storage';

// Firebase is automatically initialized using the native config files
// No need to pass configuration here for React Native Firebase

export { auth, firestore, storage, asyncStorage };
