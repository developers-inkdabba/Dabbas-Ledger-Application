import { ExpoConfig } from "expo/config";

const packageName = "com.inkdabba.expense";
// Keep CI and local builds linked to the same Expo project, even without .env.
// When changing accounts, override both EAS_PROJECT_ID and EAS_OWNER together.
const DEFAULT_EAS_PROJECT_ID = "f3daf113-5150-4106-b584-21291a14bd83";
const easProjectId = process.env.EAS_PROJECT_ID?.trim() || process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || DEFAULT_EAS_PROJECT_ID;
const easOwner = process.env.EAS_OWNER?.trim() || "inkdabba-dev";

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
