import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BIOMETRIC_ENABLED_KEY = "dabba.biometric.enabled";

export type BiometricAvailability = {
  available: boolean;
  enrolled: boolean;
  label: string;
  types: LocalAuthentication.AuthenticationType[];
};

export const getBiometricLabel = (types: LocalAuthentication.AuthenticationType[] = []) => {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "Face ID";
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "Fingerprint";
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return "Iris unlock";
  return Platform.OS === "ios" ? "Face ID" : "Fingerprint";
};

export const checkBiometricAvailability = async (): Promise<BiometricAvailability> => {
  if (Platform.OS === "web") return { available: false, enrolled: false, label: "Biometric unlock", types: [] };
  const [hasHardware, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync()
  ]);

  return {
    available: hasHardware && enrolled,
    enrolled,
    label: getBiometricLabel(types),
    types
  };
};

export const authenticateWithBiometrics = async (reason = "Unlock Dabba's Ledger") => {
  const availability = await checkBiometricAvailability();
  if (!availability.available) {
    return { success: false, error: `${availability.label} is not available on this device.`, availability };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: "Use PIN",
    disableDeviceFallback: false,
    fallbackLabel: "Use device passcode"
  });

  return {
    success: result.success,
    error: result.success ? undefined : "We could not verify your identity. Use your PIN to continue.",
    availability
  };
};

export const enableBiometricLogin = async () => {
  const result = await authenticateWithBiometrics("Enable biometric unlock");
  if (!result.success) return result;
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true", {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
  });
  return result;
};

export const disableBiometricLogin = async () => {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
};

export const isBiometricEnabled = async () => {
  if (Platform.OS === "web") return false;
  return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === "true";
};
