import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Text } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { MotionPressable } from "./Motion";

/** iOS-style back affordance for pushed stack screens; falls back to Home. */
export const BackButton = ({ label = "Back" }: { label?: string }) => {
  const c = useThemeColors();
  return (
    <MotionPressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as never))}
      haptic
      pressScale={0.92}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={{ alignSelf: "flex-start", marginBottom: 10, marginLeft: -6, flexDirection: "row", alignItems: "center", gap: 2, height: 36, paddingLeft: 4, paddingRight: 12, borderRadius: 10, backgroundColor: c.surfaceGlass, borderWidth: 1, borderColor: c.glassBorder }}
    >
      <ChevronLeft size={22} color={c.primary} strokeWidth={2.4} />
      <Text style={{ fontSize: 16, fontWeight: "600", color: c.primary }}>{label}</Text>
    </MotionPressable>
  );
};
