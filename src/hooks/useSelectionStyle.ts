import { interpolateColor, useAnimatedStyle } from "react-native-reanimated";
import { useMotionValue } from "./useMotionValue";
import { useThemeColors } from "./useTheme";

/** Shared selection feedback for chips and option cards, respecting reduced motion. */
export function useSelectionStyle(selected: boolean) {
  const c = useThemeColors();
  const progress = useMotionValue(selected ? 1 : 0, { duration: 220 });
  return useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [c.border, c.primary]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [c.surface, c.primarySoft])
  }));
}
