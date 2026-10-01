import { useEffect } from "react";
import { cancelAnimation, Easing, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../components/shared/MotionPreferences";

/** Critically damped spring: quick, settles without wobble (UIKit default feel). */
export const spring = { damping: 22, stiffness: 260, mass: 0.9, overshootClamping: false };
/** Apple's "ease-out-expo"-like curve for entrances. */
export const appleEase = Easing.bezier(0.22, 1, 0.36, 1);

/** Animates on the UI thread; values settle immediately when motion is disabled. */
export function useMotionValue(target: number, { initial = target, duration = 260, spring: elastic = false, delay = 0 } = {}) {
  const value = useSharedValue(initial);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) value.value = target;
    else {
      const animation = elastic ? withSpring(target, spring) : withTiming(target, { duration, easing: appleEase });
      value.value = delay > 0 ? withDelay(Math.min(delay, 420), animation) : animation;
    }
    return () => cancelAnimation(value);
  }, [target, duration, elastic, delay, reduced, value]);
  return value;
}
