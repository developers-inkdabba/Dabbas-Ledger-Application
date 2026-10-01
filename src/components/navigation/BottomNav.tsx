import { BottomTabBarProps } from "expo-router/js-tabs";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ClipboardCheck, Home, LucideIcon, Plus, Receipt, User } from "lucide-react-native";
import { memo, useEffect, useState } from "react";
import { Keyboard, LayoutRectangle, Platform, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMotionValue } from "../../hooks/useMotionValue";
import { useIsDark, useThemeColors } from "../../hooks/useTheme";
import { MotionPressable } from "../shared/Motion";

const tabs: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: "index", label: "Home", Icon: Home },
  { name: "expenses", label: "Expenses", Icon: Receipt },
  { name: "add", label: "Add", Icon: Plus },
  { name: "approvals", label: "Approvals", Icon: ClipboardCheck },
  { name: "profile", label: "Profile", Icon: User },
];

const tick = () => { if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => undefined); };

/** Opaque rounded bar on a solid dock strip, with a spring-driven selection lens. */
export const BottomNav = ({ state, navigation }: BottomTabBarProps) => {
  const c = useThemeColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const [frames, setFrames] = useState<Record<string, LayoutRectangle>>({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const selected = state.routes[state.index]?.name;
  const frame = frames[selected];
  const x = useMotionValue(frame?.x ?? 0, { spring: true });
  const w = useMotionValue(frame?.width ?? 0, { spring: true });
  const lens = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;

  return (
    // Solid backing strip: scrolled content ends at its top edge instead of showing
    // through or around the bar. It also swallows taps meant for hidden content.
    <View style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      paddingTop: 8, paddingLeft: insets.left + 14, paddingRight: insets.right + 14, paddingBottom: Math.max(insets.bottom, 10) + 4,
      backgroundColor: c.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider
    }}>
      <View style={{
        width: "100%", maxWidth: 520, alignSelf: "center", flexDirection: "row", alignItems: "center",
        borderRadius: 20, borderCurve: "continuous", borderWidth: 1, padding: 6,
        borderColor: c.border,
        backgroundColor: dark ? "#1A1A21" : "#FFFFFF",
        boxShadow: dark ? "none" : "0px 4px 14px -8px rgba(27,22,64,0.18)"
      }}>
        {frame && selected !== "add" ? (
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 6, bottom: 6, borderRadius: 14, backgroundColor: c.primarySoft }, lens]} />
        ) : null}
        {tabs.map(({ name, label, Icon }) => {
          const route = state.routes.find((item) => item.name === name);
          const focused = selected === name;
          const isAdd = name === "add";
          return (
            <MotionPressable key={name}
              onLayout={({ nativeEvent: { layout } }) => setFrames(old => old[name]?.x === layout.x && old[name]?.width === layout.width ? old : { ...old, [name]: layout })}
              accessibilityRole="tab" accessibilityLabel={isAdd ? "Add expense" : label} accessibilityState={{ selected: focused }}
              pressScale={isAdd ? 0.9 : 0.94}
              onPress={() => {
                if (!route) return;
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (event.defaultPrevented) return;
                if (isAdd) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined); router.push("/add" as never); }
                else if (!focused) { tick(); navigation.navigate(route.name); }
              }}
              onLongPress={() => { if (route) navigation.emit({ type: "tabLongPress", target: route.key }); }}
              style={{ flex: 1, minWidth: 0, minHeight: 56, alignItems: "center", justifyContent: "center", borderRadius: 14 }}>
              {isAdd ? <AddGlyph color={c.primary} fg={c.onPrimary} /> : <TabGlyph Icon={Icon} label={label} focused={focused} active={c.primary} idle={c.muted} />}
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
};

const TabGlyph = memo(function TabGlyph({ Icon, label, focused, active, idle }: { Icon: LucideIcon; label: string; focused: boolean; active: string; idle: string }) {
  const p = useMotionValue(focused ? 1 : 0, { spring: true });
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -p.value * 1.5 }, { scale: 1 + p.value * 0.1 }] }));
  const text = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 1], [0.85, 1]) }));
  const color = focused ? active : idle;
  return (
    <>
      <Animated.View style={icon}><Icon size={21} color={color} strokeWidth={focused ? 2.3 : 1.8} /></Animated.View>
      <Animated.Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[{ marginTop: 3, fontSize: 10.5, letterSpacing: 0.1, fontWeight: focused ? "700" : "600", color }, text]}>{label}</Animated.Text>
    </>
  );
});

const AddGlyph = ({ color, fg }: { color: string; fg: string }) => (
  <View style={{
    width: 48, height: 48, borderRadius: 14, backgroundColor: color, alignItems: "center", justifyContent: "center",
    boxShadow: `0px 6px 12px -6px ${color}`
  }}>
    <Plus size={24} color={fg} strokeWidth={2.6} />
  </View>
);
