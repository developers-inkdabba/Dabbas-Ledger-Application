import { Pressable } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle } from "react-native-reanimated";
import { useMotionValue } from "../../hooks/useMotionValue";
import { useThemeColors } from "../../hooks/useTheme";

/** iOS-style switch: springy thumb, colour cross-fade, 51x31 like UIKit. */
export const Toggle = ({ value, onValueChange, disabled, accessibilityLabel }: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) => {
  const c = useThemeColors();
  const p = useMotionValue(value ? 1 : 0, { spring: true });
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [c.surfaceMuted, c.success]) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: 2 + p.value * 20 }] }));
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <Animated.View style={[{ width: 51, height: 31, borderRadius: 16, justifyContent: "center" }, track]}>
        <Animated.View style={[{ width: 27, height: 27, borderRadius: 14, backgroundColor: "#FFFFFF", boxShadow: "0px 2px 6px 0px rgba(0,0,0,0.22)" }, thumb]} />
      </Animated.View>
    </Pressable>
  );
};
