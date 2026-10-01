import { View } from "react-native";
import Animated, { useAnimatedProps, useAnimatedStyle } from "react-native-reanimated";
import { Circle } from "react-native-svg";
import { useMotionValue } from "../../hooks/useMotionValue";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Horizontal fill that sweeps in from the leading edge. */
export function AnimatedFill({ progress, color, height, trackColor }: { progress: number; color: string; height: number; trackColor: string }) {
  const value = useMotionValue(progress, { initial: 0, duration: 820 });
  const animated = useAnimatedStyle(() => ({ transform: [{ scaleX: value.value }] }));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height, borderRadius: height, overflow: "hidden", backgroundColor: trackColor }}>
      <Animated.View style={[{ height, width: "100%", borderRadius: height, backgroundColor: color, transformOrigin: "left center" }, animated]} />
    </View>
  );
}

/** Column that springs up from the baseline, staggered by `delay`. */
export function AnimatedBar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const progress = useMotionValue(1, { initial: 0, spring: true, delay });
  const animated = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.max(0, progress.value) }] }));
  return <Animated.View style={[{ width: "72%", maxWidth: 26, height, borderRadius: 8, borderCurve: "continuous", backgroundColor: color, transformOrigin: "center bottom" }, animated]} />;
}

/** Donut segment that draws itself around the ring. */
export function AnimatedArc({ size, radius, color, strokeWidth, dash, circumference, offset }: {
  size: number; radius: number; color: string; strokeWidth: number; dash: number; circumference: number; offset: number;
}) {
  const length = useMotionValue(dash, { initial: 0, duration: 900 });
  const position = useMotionValue(-offset, { duration: 900 });
  const props = useAnimatedProps(() => ({ strokeDasharray: [length.value, circumference - length.value], strokeDashoffset: position.value }));
  return <AnimatedCircle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} animatedProps={props} strokeLinecap="butt" fill="transparent" />;
}
