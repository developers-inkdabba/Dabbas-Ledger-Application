import { PropsWithChildren, useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { useIsDark, useThemeColors } from "../../hooks/useTheme";
import { useReducedMotion } from "./MotionPreferences";

/**
 * Bottom sheet on phones, centred card on unfolded foldables and tablets.
 * Presents with a spring, dismisses with a quick ease so it never feels sticky.
 */
export function AdaptiveSheet({ visible, onClose, children, scroll = true }: PropsWithChildren<{
  visible: boolean; onClose: () => void; scroll?: boolean;
}>) {
  const c = useThemeColors();
  const dark = useIsDark();
  const { wide, height, gutter } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [present, setPresent] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setPresent(true);
      progress.value = reduced ? 1 : withSpring(1, { damping: 26, stiffness: 240, mass: 0.9 });
      return;
    }
    progress.value = reduced ? 0 : withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    const timer = setTimeout(() => setPresent(false), reduced ? 0 : 210);
    return () => clearTimeout(timer);
  }, [visible, reduced, progress]);

  const backdrop = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value) }));
  const panel = useAnimatedStyle(() => ({
    opacity: wide ? Math.min(1, progress.value) : 1,
    transform: wide
      ? [{ scale: 0.94 + 0.06 * progress.value }]
      : [{ translateY: (1 - progress.value) * Math.min(height, 720) }],
  }));

  return (
    <Modal visible={present} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: wide ? "center" : "flex-end", paddingHorizontal: wide ? gutter : 0, paddingTop: insets.top + 12 }}>
        <Animated.View style={[StyleSheet.absoluteFill, backdrop]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close dialog" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} />
        </Animated.View>
        <Animated.View accessibilityViewIsModal pointerEvents={visible ? "auto" : "none"} style={[{
          width: "100%", maxWidth: 600, maxHeight: Math.max(120, height - insets.top - 24), alignSelf: "center",
          borderRadius: wide ? 32 : 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderCurve: "continuous",
          overflow: "hidden", borderWidth: 1, borderBottomWidth: wide ? 1 : 0, borderColor: c.glassBorder,
          backgroundColor: dark ? "rgba(26,26,33,0.98)" : "rgba(250,250,253,0.98)",
          boxShadow: dark ? "0px -10px 40px -10px rgba(0,0,0,0.7)" : "0px -10px 40px -12px rgba(27,22,64,0.22)"
        }, panel]}>
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12) + 20 }}>
              <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: c.borderStrong, alignSelf: "center", marginBottom: 20 }} />
              {children}
            </ScrollView>
          ) : (
            <>
              <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: c.borderStrong, alignSelf: "center", marginTop: 10 }} />
              {children}
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
