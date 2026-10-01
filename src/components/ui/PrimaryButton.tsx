import { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useMotionValue } from "../../hooks/useMotionValue";
import { useIsDark, useThemeColors } from "../../hooks/useTheme";
import { MotionPressable } from "../shared/Motion";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: ReactNode;
  compact?: boolean;
};

/** Rounded-rect button with a lit top edge and a soft tinted shadow. */
export const PrimaryButton = ({ label, onPress, loading, disabled, variant = "primary", icon, compact }: Props) => {
  const c = useThemeColors();
  const dark = useIsDark();
  const pending = useMotionValue(loading ? 1 : 0, { duration: 180 });
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - pending.value, transform: [{ scale: 1 - pending.value * 0.08 }] }));
  const spinnerStyle = useAnimatedStyle(() => ({ opacity: pending.value, transform: [{ scale: 0.7 + pending.value * 0.3 }] }));
  const filled = variant === "primary" || variant === "danger";
  const fill = variant === "danger" ? c.error : c.primary;
  const bg = filled ? fill : variant === "secondary" ? c.primarySoft : c.surfaceGlass;
  const fg = filled ? c.onPrimary : variant === "secondary" ? c.primary : c.text;
  const inactive = disabled || loading;
  const glow = filled && !inactive
    ? `0px 1px 0px 0px rgba(255,255,255,${dark ? 0.2 : 0.18}) inset, 0px 6px 14px -8px ${fill}`
    : variant === "ghost" ? `0px 1px 0px 0px ${dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)"} inset` : "none";

  return (
    <MotionPressable
      onPress={onPress}
      disabled={inactive}
      haptic
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      style={[s.base, {
        minHeight: compact ? 44 : 54,
        paddingHorizontal: compact ? 16 : 22,
        backgroundColor: bg,
        borderColor: variant === "ghost" ? c.border : "transparent",
        opacity: disabled ? 0.45 : 1,
        boxShadow: glow
      }]}
    >
      <Animated.View style={[s.inner, labelStyle]}>
        {icon ?? null}
        <Text maxFontSizeMultiplier={1.5} style={[s.label, { fontSize: compact ? 15 : 16, color: fg }]} numberOfLines={2}>{label}</Text>
      </Animated.View>
      {loading ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center, spinnerStyle]}>
          <ActivityIndicator color={fg} size="small" />
        </Animated.View>
      ) : null}
    </MotionPressable>
  );
};

const s = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 14, borderWidth: 1, overflow: "hidden", borderCurve: "continuous" },
  inner: { flexShrink: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  center: { alignItems: "center", justifyContent: "center" },
  label: { flexShrink: 1, textAlign: "center", fontWeight: "700", letterSpacing: -0.2 }
});
