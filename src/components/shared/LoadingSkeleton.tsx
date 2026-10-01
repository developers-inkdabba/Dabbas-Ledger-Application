import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import Animated, { cancelAnimation, Easing, SharedValue, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useIsDark, useThemeColors } from "../../hooks/useTheme";
import { useReducedMotion } from "./MotionPreferences";

const SkeletonBlock = ({ height, progress, reduced, radius }: { height: number; progress: SharedValue<number>; reduced: boolean; radius: number }) => {
  const c = useThemeColors();
  const dark = useIsDark();
  const [width, setWidth] = useState(0);
  const shimmer = useAnimatedStyle(() => ({
    opacity: reduced ? 0 : 1,
    transform: [{ translateX: -160 + progress.value * (width + 320) }, { skewX: "-18deg" }],
  }));
  const bone = { position: "absolute" as const, borderRadius: 10, backgroundColor: c.surfaceMuted };
  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height, overflow: "hidden", borderRadius: radius, borderCurve: "continuous", borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surfaceGlass }}>
      <View style={[bone, { left: 20, top: 20, width: 40, height: 40, borderRadius: 14 }]} />
      <View style={[bone, { left: 72, top: 24, height: 12, width: "38%" }]} />
      <View style={[bone, { left: 72, top: 44, height: 10, width: "24%" }]} />
      <View style={[bone, { right: 20, top: 24, height: 14, width: "18%" }]} />
      {height > 110 ? <View style={[bone, { left: 20, bottom: 22, height: 26, width: "52%" }]} /> : null}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -20, bottom: -20, width: 120, backgroundColor: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)" }, shimmer]} />
    </View>
  );
};

/** One shared UI-thread clock; pauses while the app is in the background. */
export const LoadingSkeleton = () => {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    const update = (state: string) => {
      cancelAnimation(progress);
      progress.value = 0;
      if (!reduced && state === "active") {
        progress.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false);
      }
    };
    update(AppState.currentState);
    const subscription = AppState.addEventListener("change", update);
    return () => { subscription.remove(); cancelAnimation(progress); };
  }, [progress, reduced]);
  return (
    <View accessibilityLabel="Loading content" accessibilityState={{ busy: true }} style={{ gap: 12 }}>
      {[150, 88, 88, 88].map((height, index) => <SkeletonBlock key={index} height={height} radius={index === 0 ? 30 : 22} progress={progress} reduced={reduced} />)}
    </View>
  );
};
