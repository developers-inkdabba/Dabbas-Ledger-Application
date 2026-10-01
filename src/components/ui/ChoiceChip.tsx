import { Check } from "lucide-react-native";
import { Text } from "react-native";
import { useSelectionStyle } from "../../hooks/useSelectionStyle";
import { useThemeColors } from "../../hooks/useTheme";
import { MotionPressable } from "../shared/Motion";

/** Capsule filter chip; tint and check mark animate in when selected. */
export const ChoiceChip = ({ label, active, onPress, capitalize }: { label: string; active: boolean; onPress: () => void; capitalize?: boolean }) => {
  const c = useThemeColors();
  const selection = useSelectionStyle(active);
  return (
    <MotionPressable hitSlop={4} onPress={onPress} haptic pressScale={0.94} accessibilityRole="button" accessibilityState={{ selected: active }}
      style={[{ maxWidth: "100%", minHeight: 38, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1 }, selection]}>
      {active ? <Check size={13} color={c.primary} strokeWidth={3} /> : null}
      <Text style={{ flexShrink: 1, fontSize: 14, fontWeight: active ? "700" : "500", textTransform: capitalize ? "capitalize" : "none", color: active ? c.primary : c.text }} numberOfLines={1}>
        {label}
      </Text>
    </MotionPressable>
  );
};
