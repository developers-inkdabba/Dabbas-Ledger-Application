import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, ShadowLevel, shadows } from "../constants/theme";
import { useThemeStore } from "../store/theme.store";

/** Resolves the persisted theme preference against the OS scheme. */
export const useIsDark = () => {
  const theme = useThemeStore((state) => state.theme);
  const scheme = useColorScheme();
  return (theme === "system" ? scheme || "light" : theme) === "dark";
};

/** Returns the resolved colour palette for the current theme. */
export const useThemeColors = () => (useIsDark() ? darkColors : lightColors);

/** Glass depth: an inset top highlight plus a soft outer shadow, per theme. */
export const useElevation = (level: ShadowLevel = "soft") => {
  const dark = useIsDark();
  return useMemo(() => ({ boxShadow: (dark ? shadows.dark : shadows.light)[level] }), [dark, level]);
};
