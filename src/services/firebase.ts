import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Persistence } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { Platform } from "react-native";

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "messagingSenderId", "appId"] as const;
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

export const assertFirebaseConfig = () => {
  if (!missingKeys.length) return;
  throw new Error(`Missing Firebase config: ${missingKeys.join(", ")}. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.`);
};

assertFirebaseConfig();

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const provisioningApp = getApps().some((app) => app.name === "provisioning")
  ? getApp("provisioning")
  : initializeApp(firebaseConfig, "provisioning");

const getPrimaryAuth = () => {
  try {
    if (Platform.OS === "web") return getAuth(firebaseApp);
    const getReactNativePersistence = (FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
    }).getReactNativePersistence;

    if (!getReactNativePersistence) return getAuth(firebaseApp);

    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (err) {
    if (__DEV__) console.warn("Falling back to getAuth:", err);
    return getAuth(firebaseApp);
  }
};

export const auth = getPrimaryAuth();
export const provisioningAuth = getAuth(provisioningApp);

let firestoreInstance: ReturnType<typeof getFirestore>;

try {
  firestoreInstance = initializeFirestore(firebaseApp, {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true
  });
} catch {
  try {
    firestoreInstance = initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true
    });
  } catch {
    firestoreInstance = getFirestore(firebaseApp);
  }
}

export const db = firestoreInstance;
