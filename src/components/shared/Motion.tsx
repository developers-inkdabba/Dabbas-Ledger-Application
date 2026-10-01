import * as Haptics from "expo-haptics";
import { forwardRef, PropsWithChildren, ReactNode, useEffect } from "react";
import { Platform, Pressable, PressableProps, StyleProp, View, ViewProps, ViewStyle } from "react-native";
import Animated, { AnimatedStyle, cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { spring, useMotionValue } from "../../hooks/useMotionValue";
import { useReducedMotion } from "./MotionPreferences";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SurfaceProps = ViewProps & PropsWithChildren<{ delay?: number; direction?: "up" | "down" | "fade" | "scale" }>;

/** One-shot entrance: fade, lift and a hint of scale, driven on the UI thread. */
export const MotionView = ({ children, delay = 0, direction = "fade", style, ...props }: SurfaceProps) => {
  const reduced = useReducedMotion();
  const progress = useMotionValue(1, { initial: reduced ? 1 : 0, duration: 520, delay });
  const animated = useAnimatedStyle(() => {
    const p = progress.value;
    const lift = direction === "up" ? 14 : direction === "down" ? -10 : 0;
    const scale = direction === "scale" ? 0.94 + p * 0.06 : direction === "fade" ? 1 : 0.985 + p * 0.015;
    return { opacity: p, transform: [{ translateY: (1 - p) * lift }, { scale }] };
  });
  return <Animated.View {...props} style={[animated, style]}>{children}</Animated.View>;
};

type PressableMotionProps = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
  /** Light tactile tick on press (selection-style, skipped on web). */
  haptic?: boolean;
  /** How far the element sinks while pressed. */
  pressScale?: number;
};

/** Press feedback runs entirely on the UI thread: no React renders per frame. */
export const MotionPressable = forwardRef<View, PressableMotionProps>(function MotionPressable(
  { children, disabled, onPressIn, onPressOut, onHoverIn, onHoverOut, onBlur, onPress, style, haptic, pressScale = 0.965, ...props }, ref
) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const hover = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.08,
    transform: [{ scale: 1 - pressed.value * (1 - pressScale) + hover.value * 0.01 }]
  }));
  useEffect(() => {
    if (disabled || reduced) { cancelAnimation(pressed); cancelAnimation(hover); pressed.value = 0; hover.value = 0; }
    return () => { cancelAnimation(pressed); cancelAnimation(hover); };
  }, [disabled, reduced, pressed, hover]);
  return (
    <AnimatedPressable {...props} ref={ref} disabled={disabled}
      onPress={event => {
        if (haptic && Platform.OS !== "web") void Haptics.selectionAsync().catch(() => undefined);
        onPress?.(event);
      }}
      onPressIn={event => { if (!disabled && !reduced) pressed.value = withTiming(1, { duration: 110 }); onPressIn?.(event); }}
      onPressOut={event => { pressed.value = reduced ? 0 : withSpring(0, spring); onPressOut?.(event); }}
      onHoverIn={event => { if (!disabled && !reduced) hover.value = withTiming(1, { duration: 180 }); onHoverIn?.(event); }}
      onHoverOut={event => { hover.value = withTiming(0, { duration: reduced ? 0 : 180 }); onHoverOut?.(event); }}
      onBlur={event => { pressed.value = 0; onBlur?.(event); }}
      style={[style, animated]}>
      {children}
    </AnimatedPressable>
  );
});
