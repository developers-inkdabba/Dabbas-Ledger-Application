import { StyleSheet, Text, View } from "react-native";
import { statusConfig } from "../../constants/theme";
import { useThemeColors } from "../../hooks/useTheme";
import { ExpenseStatus, SettlementStatus } from "../../types";
import { MotionView } from "./Motion";

const fallbackConfig: Record<string, { label: string; tone: "warning" | "success" | "error" | "info" | "neutral" }> = {
  unpaid: { label: "Unpaid", tone: "warning" },
  partially_paid: { label: "Partial", tone: "info" },
  draft: { label: "Draft", tone: "neutral" },
  syncing: { label: "Syncing", tone: "neutral" }
};

export const StatusBadge = ({ status, compact = false }: {
  status: ExpenseStatus | SettlementStatus | "draft" | "syncing";
  compact?: boolean;
}) => {
  const c = useThemeColors();
  const cfg = statusConfig[status] || fallbackConfig[status] || { label: status, tone: "info" };
  const tones = {
    warning: { bg: c.warningSoft, fg: c.warning },
    success: { bg: c.successSoft, fg: c.success },
    error: { bg: c.errorSoft, fg: c.error },
    info: { bg: c.infoSoft, fg: c.info },
    neutral: { bg: c.surfaceMuted, fg: c.muted }
  };
  const tone = tones[cfg.tone] || tones.info;

  return (
    <MotionView key={status} direction="scale" accessibilityLabel={`Status: ${cfg.label}`}
      style={[s.pill, { backgroundColor: tone.bg, paddingHorizontal: compact ? 8 : 10, paddingVertical: compact ? 3 : 5 }]}>
      <View style={[s.dot, { backgroundColor: tone.fg, width: compact ? 6 : 7, height: compact ? 6 : 7 }]} />
      <Text maxFontSizeMultiplier={1.3} style={[s.label, { color: tone.fg, fontSize: compact ? 11 : 12 }]}>{cfg.label}</Text>
    </MotionView>
  );
};

const s = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderRadius: 10, gap: 5 },
  dot: { borderRadius: 10 },
  label: { fontWeight: "700", letterSpacing: 0.1 }
});
