import { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import Animated, { interpolate, SharedValue, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { useThemeColors } from "../../hooks/useTheme";
import { GradientBackground } from "../GradientBackground";

type FrameOptions = {
  bottomPadding?: number;
  /** Narrow reading column for forms and detail pages. */
  form?: boolean;
};

/**
 * Shared scroll frame: gutters, max width and safe-area padding, plus a
 * UI-thread scroll offset that drives the status-bar scrim. Used directly by
 * FlatList screens so they keep virtualization.
 */
export const useListFrame = ({ bottomPadding = 112, form = false }: FrameOptions = {}) => {
  const insets = useSafeAreaInsets();
  const { compact, gutter, formWidth, wide } = useResponsiveLayout();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => { scrollY.value = event.contentOffset.y; });
  const contentContainerStyle = {
    width: "100%" as const,
    maxWidth: form ? formWidth : 1120,
    alignSelf: "center" as const,
    paddingHorizontal: gutter,
    paddingTop: insets.top + (compact ? 10 : wide ? 28 : 18),
    paddingBottom: bottomPadding + Math.max(insets.bottom, 0)
  };
  return { scrollY, onScroll, contentContainerStyle };
};

/**
 * Static, opaque strip behind the notch/status bar. Always the theme's ground
 * colour, so signal/battery icons keep full contrast and scrolled content is
 * hidden rather than colliding with them. Only the hairline fades in on scroll.
 */
export const StatusStrip = ({ scrollY }: { scrollY?: SharedValue<number> }) => {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const divider = useAnimatedStyle(() => ({ opacity: scrollY ? interpolate(scrollY.value, [0, 24], [0, 1], "clamp") : 0 }));
  if (insets.top <= 0) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: c.background }}>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.borderStrong }, divider]} />
    </View>
  );
};

/** Background, side insets and scrim for screens that render their own FlatList. */
export const ListScreen = ({ scrollY, children }: PropsWithChildren<{ scrollY: SharedValue<number> }>) => {
  const insets = useSafeAreaInsets();
  return (
    <GradientBackground>
      <View style={{ flex: 1, paddingLeft: insets.left, paddingRight: insets.right }}>{children}</View>
      <StatusStrip scrollY={scrollY} />
    </GradientBackground>
  );
};

/** Standard scrolling screen: content glides under a scrim at the status bar. */
export const AppContainer = ({ children, bottomPadding, form }: PropsWithChildren<FrameOptions>) => {
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll, contentContainerStyle } = useListFrame({ bottomPadding, form });
  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, paddingLeft: insets.left, paddingRight: insets.right }}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </Animated.ScrollView>
      </KeyboardAvoidingView>
      <StatusStrip scrollY={scrollY} />
    </GradientBackground>
  );
};
