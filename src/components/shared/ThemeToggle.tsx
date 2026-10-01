import { LucideIcon, Monitor, Moon, Sun } from "lucide-react-native";
import { useState } from "react";
import { LayoutRectangle, Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useMotionValue } from "../../hooks/useMotionValue";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { ThemeMode, useThemeStore } from "../../store/theme.store";
import { MotionPressable } from "./Motion";

const options: { value: ThemeMode; label: string; Icon: LucideIcon }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Auto", Icon: Monitor }
];

/** Three-way appearance switch with a sliding thumb, like iOS Display settings. */
export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();
  const c = useThemeColors();
  const shadow = useElevation("soft");
  const [frames, setFrames] = useState<Record<string, LayoutRectangle>>({});
  const frame = frames[theme];
  const x = useMotionValue(frame?.x ?? 0, { spring: true });
  const w = useMotionValue(frame?.width ?? 0, { spring: true });
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ flexDirection: "row", padding: 3, borderRadius: 11, backgroundColor: c.surfaceMuted }}>
      {frame ? <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 3, bottom: 3, left: 0, borderRadius: 8, backgroundColor: c.backgroundElevated }, shadow, thumb]} /> : null}
      {options.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <MotionPressable hitSlop={4} key={value} onPress={() => setTheme(value)} haptic={!active} pressScale={0.93}
            accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`${label} appearance`}
            onLayout={({ nativeEvent: { layout } }) => setFrames(old => old[value]?.x === layout.x && old[value]?.width === layout.width ? old : { ...old, [value]: layout })}
            style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, borderRadius: 8 }}>
            <Icon size={14} color={active ? c.primary : c.muted} strokeWidth={2.2} />
            <Text style={{ fontSize: 12, fontWeight: active ? "700" : "600", color: active ? c.text : c.muted }}>{label}</Text>
          </MotionPressable>
        );
      })}
    </View>
  );
};
