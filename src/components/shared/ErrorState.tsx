import { AlertTriangle, RotateCw } from "lucide-react-native";
import { Text, View } from "react-native";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { PrimaryButton } from "../ui/PrimaryButton";
import { MotionView } from "./Motion";

type Props = {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const ErrorState = ({ title = "Something went wrong", message, actionLabel = "Try Again", onAction }: Props) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");

  return (
    <MotionView direction="up" style={[{
      marginTop: 12, alignItems: "center", borderRadius: 18, borderCurve: "continuous", borderWidth: 1,
      borderColor: c.glassBorder, backgroundColor: c.surfaceGlass, paddingHorizontal: 24, paddingVertical: 34,
    }, shadow]}>
      <MotionView direction="scale" delay={90} style={{ marginBottom: 14, width: 60, height: 60, borderRadius: 16, backgroundColor: c.errorSoft, alignItems: "center", justifyContent: "center" }}>
        <AlertTriangle color={c.error} size={26} strokeWidth={1.9} />
      </MotionView>
      <Text style={{ textAlign: "center", fontSize: 18, fontWeight: "800", letterSpacing: -0.3, color: c.text }}>{title}</Text>
      <Text style={{ marginTop: 6, maxWidth: 320, textAlign: "center", fontSize: 14, lineHeight: 20, color: c.muted }}>{message}</Text>
      {onAction ? (
        <View style={{ marginTop: 20 }}>
          <PrimaryButton label={actionLabel} onPress={onAction} variant="secondary" compact icon={<RotateCw color={c.primary} size={16} strokeWidth={2.2} />} />
        </View>
      ) : null}
    </MotionView>
  );
};
