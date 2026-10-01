import { ExpoConfig } from "expo/config";

const packageName = "com.inkdabba.expense";
// EAS CLI does not load .env, so the project ID must resolve without it.
// Env vars still win (e.g. to build under another Expo account).
const DEFAULT_EAS_PROJECT_ID = "a5a3bd39-3549-4ee0-93a1-6f9983ad8455"; // @sasquare/dabbas-ledger
const easProjectId = process.env.EAS_PROJECT_ID || process.env.EXPO_PUBLIC_EAS_PROJECT_ID || DEFAULT_EAS_PROJECT_ID;
const easOwner = process.env.EAS_OWNER || "sasquare";

const config: ExpoConfig = {
  name: "Dabba's Ledger",
  slug: "dabbas-ledger",
  owner: easOwner,
  scheme: "inkdabbaexpense",
  version: "1.0.0",
  orientation: "default",
  icon: "./src/assets/icon.png",
  userInterfaceStyle: "automatic",
  runtimeVersion: "sdk57-1",
  ...(easProjectId ? { updates: { url: `https://u.expo.dev/${easProjectId}` } } : {}),
  ios: {
    supportsTablet: true,
    bundleIdentifier: packageName,
    buildNumber: "1",
    infoPlist: {
      NSCameraUsageDescription: "Dabba's Ledger uses the camera to capture receipt photos.",
      NSPhotoLibraryUsageDescription: "Dabba's Ledger uses your photo library to attach receipt images.",
      NSDocumentsFolderUsageDescription: "Dabba's Ledger lets you attach PDF receipts from Files."
    }
  },
  android: {
    package: packageName,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./src/assets/adaptive-icon.png",
      backgroundColor: "#1D0F49"
    },
    permissions: [
      "android.permission.CAMERA",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_EXTERNAL_STORAGE"
    ]
  },
  web: {
    favicon: "./src/assets/favicon.png"
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./src/assets/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#1D0F49"
      }
    ],
    "expo-asset",
    "expo-font",
    "expo-secure-store",
    "@react-native-community/datetimepicker",
    [
      "expo-camera",
      {
        cameraPermission: "Allow Dabba's Ledger to scan and photograph receipts."
      }
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow Dabba's Ledger to pick receipt images."
      }
    ],
    [
      "expo-document-picker",
      {
        iCloudContainerEnvironment: "Production"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    defaultCompanyId: process.env.EXPO_PUBLIC_DEFAULT_COMPANY_ID || "inkdabba",
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {})
  }
};

export default config;
