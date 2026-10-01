import { FileText } from "lucide-react-native";
import { ReactNode } from "react";
import { Text, View } from "react-native";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { MotionView } from "./Motion";

type Props = {
  title: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export const EmptyState = ({ title, message, icon, action }: Props) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");

  return (
    <MotionView direction="up" style={[{
      marginTop: 12, alignItems: "center", borderRadius: 18, borderCurve: "continuous", borderWidth: 1,
      borderColor: c.glassBorder, backgroundColor: c.surfaceGlass, paddingHorizontal: 24, paddingVertical: 36,
    }, shadow]}>
      <MotionView direction="scale" delay={90} style={{ marginBottom: 16, width: 64, height: 64, borderRadius: 16, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
        {icon || <FileText color={c.primary} size={26} strokeWidth={1.8} />}
      </MotionView>
      <Text style={{ textAlign: "center", fontSize: 18, fontWeight: "800", letterSpacing: -0.3, color: c.text }}>{title}</Text>
      <Text style={{ marginTop: 6, maxWidth: 300, textAlign: "center", fontSize: 14, lineHeight: 20, color: c.muted }}>{message}</Text>
      {action ? <View style={{ marginTop: 20 }}>{action}</View> : null}
    </MotionView>
  );
};
