import { Fingerprint, LockKeyhole, ScanFace } from "lucide-react-native";
import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { GradientBackground } from "../GradientBackground";
import { StatusStrip } from "../shared/AppContainer";
import { Logo } from "../Logo";
import { MotionPressable, MotionView } from "../shared/Motion";
import { useReducedMotion } from "../shared/MotionPreferences";
import { PrimaryButton } from "../ui/PrimaryButton";

type Props = {
  label: string;
  loading?: boolean;
  error?: string;
  onUnlock: () => void;
  onUsePassword: () => void;
};

/** Breathing ring around the biometric glyph; pauses when motion is reduced. */
const PulseRing = ({ color }: { color: string }) => {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [pulse, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.45 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 76, height: 76, borderRadius: 14, borderWidth: 2, borderColor: color }, style]} />;
};

export const BiometricLockScreen = ({ label, loading, error, onUnlock, onUsePassword }: Props) => {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const shadow = useElevation("medium");
  const Icon = label.toLowerCase().includes("face") ? ScanFace : Fingerprint;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}>
        <View style={{ alignItems: "center", width: "100%", maxWidth: 420 }}>
          <MotionView direction="scale" style={[{ marginBottom: 22, height: 92, width: 92, borderRadius: 20, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceGlass, borderWidth: 1, borderColor: c.glassBorder }, shadow]}>
            <Logo width={64} height={64} />
          </MotionView>
          <MotionView delay={80} direction="up" style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.8, color: c.text, textAlign: "center" }}>Dabba's Ledger</Text>
            <Text style={{ marginTop: 6, fontSize: 16, lineHeight: 22, color: c.muted, textAlign: "center" }}>Unlock your workspace</Text>
          </MotionView>

          <MotionView delay={160} direction="up" style={[{ marginTop: 30, width: "100%", borderRadius: 20, borderCurve: "continuous", borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surfaceGlass, padding: 24 }, shadow]}>
            <MotionPressable onPress={onUnlock} disabled={loading} haptic pressScale={0.92} accessibilityRole="button" accessibilityLabel={`Unlock with ${label}`} style={{ alignSelf: "center", alignItems: "center", justifyContent: "center", width: 96, height: 96 }}>
              <PulseRing color={c.primary} />
              <View style={{ width: 76, height: 76, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Icon color={c.primary} size={38} strokeWidth={1.7} />
              </View>
            </MotionPressable>
            <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 21, color: c.textSoft, textAlign: "center" }}>Protected with device biometrics</Text>

            {error ? (
              <MotionView key={error} direction="down" style={{ marginTop: 16, borderRadius: 16, backgroundColor: c.errorSoft, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.error, textAlign: "center" }}>{error}</Text>
              </MotionView>
            ) : null}

            <View style={{ marginTop: 20, gap: 6 }}>
              <PrimaryButton label={loading ? "Unlocking..." : `Unlock with ${label}`} onPress={onUnlock} loading={loading} icon={<LockKeyhole color={c.onPrimary} size={18} />} />
              <MotionPressable onPress={onUsePassword} accessibilityRole="button" accessibilityLabel="Use PIN instead" style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.primary }}>Use PIN instead</Text>
              </MotionPressable>
            </View>
          </MotionView>
        </View>
      </ScrollView>
      <StatusStrip />
    </GradientBackground>
  );
};
