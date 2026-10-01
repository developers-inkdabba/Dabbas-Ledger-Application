import { AlertTriangle, CheckCircle2 } from "lucide-react-native";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { FieldSurface } from "../ui/FieldSurface";
import { PrimaryButton } from "../ui/PrimaryButton";
import { AdaptiveSheet } from "./AdaptiveSheet";
import { MotionPressable, MotionView } from "./Motion";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  reasonLabel?: string;
  reason?: string;
  reasonSuggestions?: string[];
  onReasonChange?: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export const ConfirmSheet = ({
  visible, title, message, confirmLabel = "Confirm", tone = "danger", loading,
  reasonLabel, reason, reasonSuggestions, onReasonChange, onConfirm, onClose
}: Props) => {
  const c = useThemeColors();
  const [focused, setFocused] = useState(false);
  const isDanger = tone === "danger";
  const accent = isDanger ? c.error : c.primary;
  const accentSoft = isDanger ? c.errorSoft : c.primarySoft;
  const Icon = isDanger ? AlertTriangle : CheckCircle2;

  return (
    <AdaptiveSheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: "center" }}>
        <MotionView direction="scale" style={{ marginBottom: 16, width: 64, height: 64, borderRadius: 16, backgroundColor: accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon color={accent} size={28} strokeWidth={2} />
        </MotionView>
        <Text style={{ fontSize: 22, fontWeight: "800", letterSpacing: -0.4, color: c.text, textAlign: "center" }}>{title}</Text>
        <Text style={{ marginTop: 8, maxWidth: 420, fontSize: 15, lineHeight: 21, color: c.muted, textAlign: "center" }}>{message}</Text>
      </View>
      {reasonLabel && onReasonChange !== undefined ? (
        <View style={{ marginTop: 20 }}>
          <Text style={{ marginBottom: 10, marginLeft: 4, fontSize: 13, fontWeight: "700", color: c.textSoft }}>{reasonLabel}</Text>
          {reasonSuggestions?.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {reasonSuggestions.map((item) => {
                const active = reason === item;
                return (
                  <MotionPressable hitSlop={4} key={item} onPress={() => onReasonChange(item)} haptic pressScale={0.94}
                    accessibilityRole="button" accessibilityState={{ selected: active }}
                    style={{ minHeight: 36, justifyContent: "center", borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: active ? accent : "transparent", backgroundColor: active ? accent : accentSoft }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: active ? c.onPrimary : accent }}>{item}</Text>
                  </MotionPressable>
                );
              })}
            </View>
          ) : null}
          <FieldSurface focused={focused} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <TextInput
              value={reason}
              onChangeText={onReasonChange}
              placeholder="Enter a reason..."
              placeholderTextColor={c.muted}
              selectionColor={c.primary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{ minHeight: 72, fontSize: 16, color: c.text }}
            />
          </FieldSurface>
        </View>
      ) : null}
      <View style={{ marginTop: 24, gap: 10 }}>
        <PrimaryButton label={confirmLabel} onPress={onConfirm} variant={isDanger ? "danger" : "primary"} loading={loading} />
        <PrimaryButton label="Cancel" onPress={onClose} variant="ghost" disabled={loading} />
      </View>
    </AdaptiveSheet>
  );
};
