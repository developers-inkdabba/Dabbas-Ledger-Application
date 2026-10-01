import { router } from "expo-router";
import { useThemeColors } from "../../hooks/useTheme";
import { useAuthStore } from "../../store/auth.store";
import { MotionPressable } from "./Motion";
import { UserAvatar } from "./UserAvatar";

export const AccountButton = () => {
  const user = useAuthStore((state) => state.user);
  const c = useThemeColors();

  return (
    <MotionPressable
      onPress={() => router.push("/profile" as never)}
      haptic
      pressScale={0.92}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      style={{ width: 46, height: 46, borderRadius: 23, padding: 2, borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surfaceGlass, alignItems: "center", justifyContent: "center" }}
    >
      <UserAvatar name={user?.name} size={40} />
    </MotionPressable>
  );
};
