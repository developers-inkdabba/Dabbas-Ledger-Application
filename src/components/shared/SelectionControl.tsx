import { ComponentType, useState } from "react";
import { LayoutRectangle, ScrollView, StyleProp, Text, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useMotionValue } from "../../hooks/useMotionValue";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { MotionPressable } from "./Motion";

type Option<T extends string> = {
  value: T; label: string; count?: number;
  icon?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

/** iOS segmented control; the thumb springs between measured segments. */
export function SelectionControl<T extends string>({ value, onChange, options, scroll = false, label, style }: {
  value: T; onChange: (value: T) => void; options: Option<T>[];
  scroll?: boolean; label: string; style?: StyleProp<ViewStyle>;
}) {
  const c = useThemeColors();
  const thumbShadow = useElevation("soft");
  const [frames, setFrames] = useState<Record<string, LayoutRectangle>>({});
  const frame = frames[value];
  const x = useMotionValue(frame?.x ?? 0, { spring: true });
  const y = useMotionValue(frame?.y ?? 0, { spring: true });
  const width = useMotionValue(frame?.width ?? 0, { spring: true });
  const height = useMotionValue(frame?.height ?? 0, { spring: true });
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }], width: width.value, height: height.value,
  }));
  const content = (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: "row", padding: 4, gap: 2, flexGrow: 1 }}>
      {frame ? <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, backgroundColor: c.backgroundElevated, borderRadius: 8 }, thumbShadow, thumb]} /> : null}
      {options.map(({ value: key, label: title, count, icon: Icon }) => {
        const active = value === key;
        return (
          <MotionPressable hitSlop={4} key={key} onPress={() => { if (!active) onChange(key); }} haptic={!active} pressScale={0.95}
            accessibilityRole="tab" accessibilityLabel={count === undefined ? title : `${title}, ${count}`} accessibilityState={{ selected: active }}
            onLayout={({ nativeEvent: { layout } }) => setFrames(previous => {
              const old = previous[key];
              return old?.x === layout.x && old?.y === layout.y && old?.width === layout.width && old?.height === layout.height ? previous : { ...previous, [key]: layout };
            })}
            style={{ flex: scroll ? undefined : 1, flexGrow: 1, minWidth: 0, minHeight: 40, paddingHorizontal: scroll ? 16 : 8, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8 }}>
            {Icon ? <Icon size={15} color={active ? c.primary : c.muted} strokeWidth={2} /> : null}
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, lineHeight: 18, textAlign: "center", fontWeight: active ? "700" : "600", color: active ? c.text : c.muted }}>{title}</Text>
            {count !== undefined ? (
              <View style={{ minWidth: 20, height: 18, paddingHorizontal: 5, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: active ? c.primarySoft : c.surfaceMuted }}>
                <Text style={{ fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"], color: active ? c.primary : c.muted }}>{count}</Text>
              </View>
            ) : null}
          </MotionPressable>
        );
      })}
    </View>
  );
  return (
    <View style={[{ borderRadius: 12, backgroundColor: c.surfaceMuted, marginBottom: 18, overflow: "hidden" }, style]}>
      {scroll ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView> : content}
    </View>
  );
}
