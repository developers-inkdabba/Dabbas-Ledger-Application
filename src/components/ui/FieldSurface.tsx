import { PropsWithChildren } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle } from "react-native-reanimated";
import { useMotionValue } from "../../hooks/useMotionValue";
import { useThemeColors } from "../../hooks/useTheme";

/** Glass input well: tint and focus ring animate on the UI thread. */
export function FieldSurface({ focused = false, invalid = false, children, style, radius = 16 }: PropsWithChildren<{
  focused?: boolean; invalid?: boolean; style?: StyleProp<ViewStyle>; radius?: number;
}>) {
  const c = useThemeColors();
  const progress = useMotionValue(focused ? 1 : 0, { duration: 200 });
  const surface = useAnimatedStyle(() => ({
    borderColor: invalid ? c.error : interpolateColor(progress.value, [0, 1], [c.border, c.primary]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [c.surfaceStrong, c.backgroundElevated]),
  }));
  const ring = useAnimatedStyle(() => ({ opacity: invalid ? 1 : progress.value, transform: [{ scale: 0.985 + progress.value * 0.015 }] }));
  return (
    <View>
      <Animated.View pointerEvents="none" style={[{
        position: "absolute", top: -4, left: -4, right: -4, bottom: -4,
        borderRadius: radius + 4, borderWidth: 4, borderColor: invalid ? c.errorSoft : c.primarySoft
      }, ring]} />
      <Animated.View style={[{ borderRadius: radius, borderWidth: 1, borderCurve: "continuous" }, style, surface]}>{children}</Animated.View>
    </View>
  );
}
