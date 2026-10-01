import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { FieldSurface } from "../ui/FieldSurface";
import { MotionView } from "../shared/Motion";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  onBlur?: () => void;
};

/** Apple Pay-style amount entry: huge, centred tabular digits. */
export const AmountInput = ({ value, onChangeText, error, onBlur }: Props) => {
  const c = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 20 }}>
      <FieldSurface focused={focused} invalid={Boolean(error)} radius={20} style={{ overflow: "hidden", paddingHorizontal: 22, paddingVertical: 20 }}>
        <Text style={{ textAlign: "center", fontSize: 12, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Amount</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 6 }}>
          <Text style={{ fontSize: 30, fontWeight: "700", color: value ? c.text : c.muted, marginRight: 4 }}>₹</Text>
          <TextInput
            value={value}
            onChangeText={(text) => onChangeText(text.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={c.muted}
            style={{ minWidth: 60, maxWidth: "88%", minHeight: 72, paddingVertical: 0, textAlign: "center", fontSize: 52, fontWeight: "800", letterSpacing: -1.5, color: c.text, fontVariant: ["tabular-nums"] }}
            selectionColor={c.primary}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            accessibilityLabel="Expense amount in Indian rupees"
          />
        </View>
        {error ? (
          <MotionView key={error} direction="down"><Text style={{ marginTop: 6, textAlign: "center", fontSize: 13, fontWeight: "600", color: c.error }}>{error}</Text></MotionView>
        ) : (
          <Text style={{ marginTop: 6, textAlign: "center", fontSize: 13, lineHeight: 18, fontWeight: "500", color: c.muted }}>This amount will be routed for approval.</Text>
        )}
      </FieldSurface>
    </View>
  );
};
