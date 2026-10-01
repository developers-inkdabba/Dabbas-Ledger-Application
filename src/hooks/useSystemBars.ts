import { setStatusBarStyle } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { AppState } from "react-native";

/**
 * Keeps status-bar icons (signal, battery, clock) readable against the app's
 * own theme, not the phone's. Android applies an in-app night-mode switch
 * asynchronously and can reset icon colour afterwards, so the style is
 * re-asserted once the change settles and whenever the app returns to the
 * foreground. The native window background follows too, so screen transitions
 * and the keyboard never flash the opposite colour.
 */
export function useSystemBars(dark: boolean, background: string) {
  useEffect(() => {
    const style = dark ? "light" : "dark";
    const apply = () => setStatusBarStyle(style, true);
    apply();
    const settle = [setTimeout(apply, 60), setTimeout(apply, 320)];
    void SystemUI.setBackgroundColorAsync(background).catch(() => undefined);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") apply(); });
    return () => { settle.forEach(clearTimeout); subscription.remove(); };
  }, [dark, background]);
}
