import { ReactNode } from "react";
import { Text, View } from "react-native";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { useThemeColors } from "../../hooks/useTheme";
import { MotionView } from "./Motion";

type Props = {
  title: string;
  subtitle?: string;
  /** Small uppercase label above the title - keep very short */
  eyebrow?: string;
  right?: ReactNode;
  variant?: "large" | "compact";
};

/** iOS large-title header: tight tracking, heavy weight, quiet subtitle. */
export const ScreenHeader = ({ title, subtitle, eyebrow, right, variant = "large" }: Props) => {
  const { width, fontScale, wide } = useResponsiveLayout();
  const c = useThemeColors();
  const small = variant === "compact" || width < 360 || (Boolean(right) && width < 400);
  const size = small ? 28 : wide ? 38 : 34;
  const stack = fontScale > 1.3;

  return (
    <MotionView direction="down" style={{ marginBottom: small ? 20 : 26, paddingTop: 2 }}>
      {eyebrow ? (
        <Text maxFontSizeMultiplier={1.4} style={{ marginBottom: 4, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, color: c.primary }}>
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      <View style={{ flexDirection: stack ? "column" : "row", alignItems: stack ? "flex-start" : "center", gap: 12 }}>
        <Text accessibilityRole="header" style={{ flex: stack ? undefined : 1, fontSize: size, lineHeight: size + 6, fontWeight: "800", letterSpacing: -size * 0.028, color: c.text }}>
          {title}
        </Text>
        {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
      </View>
      {subtitle ? (
        <Text style={{ marginTop: 4, fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.muted }}>{subtitle}</Text>
      ) : null}
    </MotionView>
  );
};
