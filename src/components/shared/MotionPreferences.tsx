import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion as useSystemReducedMotion } from "react-native-reanimated";

const MotionContext = createContext(false);

/** One accessibility subscription for the whole app, including live setting changes. */
export function MotionPreferences({ children }: PropsWithChildren) {
  const initial = useSystemReducedMotion();
  const [reduced, setReduced] = useState(initial);
  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => undefined);
    return () => { active = false; subscription.remove(); };
  }, []);
  return <MotionContext.Provider value={reduced}>{children}</MotionContext.Provider>;
}

export const useReducedMotion = () => useContext(MotionContext);
