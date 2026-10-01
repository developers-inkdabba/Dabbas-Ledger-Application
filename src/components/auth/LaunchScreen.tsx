import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { appleEase } from "../../hooks/useMotionValue";
import { GradientBackground } from "../GradientBackground";
import { Logo } from "../Logo";
import { useReducedMotion } from "../shared/MotionPreferences";

/** Brand reveal: icon springs in, wordmark rises, a slim loader sweeps. */
export const LaunchScreen = () => {
  const c = useThemeColors();
  const shadow = useElevation("lift");
  const reduced = useReducedMotion();
  const icon = useSharedValue(reduced ? 1 : 0);
  const text = useSharedValue(reduced ? 1 : 0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    icon.value = withSpring(1, { damping: 14, stiffness: 150, mass: 0.8 });
    text.value = withDelay(180, withTiming(1, { duration: 620, easing: appleEase }));
    sweep.value = withDelay(320, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })), -1));
  }, [icon, text, sweep, reduced]);

  const iconStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, icon.value * 1.4), transform: [{ scale: 0.7 + icon.value * 0.3 }, { rotate: `${(1 - icon.value) * -8}deg` }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: (1 - text.value) * 14 }] }));
  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -60 + sweep.value * 150 }] }));

  return (
    <GradientBackground>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
        <Animated.View style={[{ width: 108, height: 108, borderRadius: 22, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceGlass, borderWidth: 1, borderColor: c.glassBorder }, shadow, iconStyle]}>
          <Logo width={72} height={72} />
        </Animated.View>
        <Animated.View style={[{ alignItems: "center" }, textStyle]}>
          <Text style={{ marginTop: 24, fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.9, color: c.text }}>Dabba's Ledger</Text>
          <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.muted, textAlign: "center" }}>Smart reimbursements for modern teams</Text>
          <View style={{ marginTop: 28, width: 90, height: 4, borderRadius: 10, overflow: "hidden", backgroundColor: c.surfaceMuted }}>
            <Animated.View style={[{ width: 40, height: "100%", borderRadius: 10, backgroundColor: c.primary }, barStyle]} />
          </View>
        </Animated.View>
      </View>
    </GradientBackground>
  );
};
