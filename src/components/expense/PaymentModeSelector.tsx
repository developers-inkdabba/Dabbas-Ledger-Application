import { Check } from "lucide-react-native";
import { Text, View } from "react-native";
import { paymentMeta, withAlpha } from "../../constants/categoryMeta";
import { paymentModes } from "../../constants/theme";
import { useSelectionStyle } from "../../hooks/useSelectionStyle";
import { useThemeColors } from "../../hooks/useTheme";
import { PaymentMode } from "../../types";
import { AdaptiveGrid } from "../shared/AdaptiveGrid";
import { MotionPressable, MotionView } from "../shared/Motion";

export const PaymentModeSelector = ({ value, onChange }: { value: PaymentMode; onChange: (value: PaymentMode) => void }) => {
  const c = useThemeColors();
  return (
    <MotionView style={{ marginBottom: 20 }}>
      <Text style={{ marginBottom: 10, marginLeft: 4, fontSize: 12, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>Payment mode</Text>
      <AdaptiveGrid minItemWidth={150} maxColumns={4} gap={10}>
        {paymentModes.map(mode => <PaymentOption key={mode} mode={mode} active={value === mode} onPress={() => onChange(mode)} />)}
      </AdaptiveGrid>
    </MotionView>
  );
};

const PaymentOption = ({ mode, active, onPress }: { mode: PaymentMode; active: boolean; onPress: () => void }) => {
  const c = useThemeColors();
  const selection = useSelectionStyle(active);
  const { Icon, tint } = paymentMeta[mode];
  return (
    <MotionPressable onPress={onPress} haptic pressScale={0.95} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={mode}
      style={[{ width: "100%", minHeight: 60, flexDirection: "row", alignItems: "center", borderRadius: 14, borderCurve: "continuous", borderWidth: 1, paddingVertical: 10, paddingHorizontal: 10 }, selection]}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: active ? tint : withAlpha(tint, 0.14), alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={active ? "#FFFFFF" : tint} strokeWidth={2.2} />
      </View>
      <Text style={{ marginLeft: 10, flex: 1, fontSize: 15, fontWeight: active ? "700" : "600", color: active ? c.primary : c.text }} numberOfLines={1}>{mode}</Text>
      {active ? (
        <MotionView direction="scale" style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
          <Check size={12} color={c.onPrimary} strokeWidth={3.2} />
        </MotionView>
      ) : <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: c.borderStrong }} />}
    </MotionPressable>
  );
};
