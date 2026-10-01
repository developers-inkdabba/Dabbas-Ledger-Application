import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BiometricLockScreen } from "../src/components/auth/BiometricLockScreen";
import { LaunchScreen } from "../src/components/auth/LaunchScreen";
import { ErrorBoundary } from "../src/components/shared/ErrorBoundary";
import { MotionPreferences, useReducedMotion } from "../src/components/shared/MotionPreferences";
import { useSystemBars } from "../src/hooks/useSystemBars";
import { useIsDark, useThemeColors } from "../src/hooks/useTheme";
import { authenticateWithBiometrics, checkBiometricAvailability, isBiometricEnabled } from "../src/services/biometric.service";
import { useAuthStore } from "../src/store/auth.store";
import { useThemeStore } from "../src/store/theme.store";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1
    }
  }
});

export default function RootLayout() {
  return <MotionPreferences><RootNavigator /></MotionPreferences>;
}

function RootNavigator() {
  const reducedMotion = useReducedMotion();
  const segments = useSegments();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const { theme } = useThemeStore();
  const c = useThemeColors();
  const dark = useIsDark();
  const [lockRequired, setLockRequired] = useState(false);
  const [lockBypassed, setLockBypassed] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockLabel, setLockLabel] = useState("Fingerprint");
  const [lockError, setLockError] = useState<string>();
  const [launchComplete, setLaunchComplete] = useState(false);

  // App-level override also re-themes native UI (date pickers, alerts, keyboards).
  useLayoutEffect(() => {
    Appearance.setColorScheme(theme === "system" ? "unspecified" : theme);
  }, [theme]);
  // Runs before the launch screen returns early, so icons are right from the first frame.
  useSystemBars(dark, c.background);

  useEffect(() => {
    bootstrap().finally(() => SplashScreen.hideAsync());
  }, [bootstrap]);

  useEffect(() => {
    const timer = setTimeout(() => setLaunchComplete(true), 1450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isBootstrapping) return;
    const inAuth = ["login", "signup", "forgot-password"].includes(String(segments[0] || ""));
    if (!isAuthenticated && !inAuth) router.replace("/login");
    if (isAuthenticated && inAuth) router.replace("/(tabs)");
  }, [isBootstrapping, isAuthenticated, segments]);

  useEffect(() => {
    let mounted = true;

    const prepareAppLock = async () => {
      if (isBootstrapping || !isAuthenticated || lockBypassed) {
        if (mounted && !isAuthenticated) setLockRequired(false);
        return;
      }

      const [enabled, availability] = await Promise.all([
        isBiometricEnabled(),
        checkBiometricAvailability()
      ]);

      if (!mounted) return;
      setLockLabel(availability.label);
      setLockRequired(enabled && availability.available);
      if (!availability.available) setLockError(undefined);
    };

    void prepareAppLock();
    return () => {
      mounted = false;
    };
  }, [isBootstrapping, isAuthenticated, lockBypassed]);

  const unlockWithBiometrics = useCallback(async () => {
    setLockLoading(true);
    setLockError(undefined);
    const result = await authenticateWithBiometrics("Unlock Dabba's Ledger");
    setLockLoading(false);

    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLockRequired(false);
      setLockBypassed(false);
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setLockError(result.error);
  }, []);

  const usePasswordInstead = useCallback(async () => {
    setLockBypassed(true);
    setLockRequired(false);
    await logout();
    router.replace("/login");
  }, [logout]);

  if (isBootstrapping || !launchComplete) return <LaunchScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <StatusBar style={dark ? "light" : "dark"} animated />
            {lockRequired ? (
              <BiometricLockScreen
                label={lockLabel}
                loading={lockLoading}
                error={lockError}
                onUnlock={unlockWithBiometrics}
                onUsePassword={usePasswordInstead}
              />
            ) : (
              <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? "none" : "ios_from_right", gestureEnabled: true, fullScreenGestureEnabled: true, contentStyle: { backgroundColor: c.background } }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="signup" />
                <Stack.Screen name="forgot-password" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="expenses/[id]" />
              </Stack>
            )}
          </SafeAreaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
