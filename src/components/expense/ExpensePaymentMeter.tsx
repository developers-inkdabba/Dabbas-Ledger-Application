import { Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { SettlementStatus } from "../../types";
import { currency, toAmount } from "../../utils/formatters";
import { ProgressBar } from "../shared/FinanceUI";

type Props = {
  amount: number;
  paidAmount?: number;
  settlementStatus?: SettlementStatus;
  showLabel?: boolean;
  compact?: boolean;
};

export const ExpensePaymentMeter = ({ amount, paidAmount = 0, settlementStatus, showLabel = true, compact }: Props) => {
  const c = useThemeColors();
  const total = Math.max(0, toAmount(amount));
  const paid = Math.min(total, Math.max(0, toAmount(paidAmount)));
  const remaining = Math.max(total - paid, 0);
  const progress = total > 0 ? Math.min(paid / total, 1) : 0;
  const status: SettlementStatus = paid >= total && total > 0 ? "paid" : paid > 0 ? "partially_paid" : settlementStatus || "unpaid";
  const done = status === "paid";
  const size = compact ? 12 : 13;

  return (
    <View style={{ marginTop: compact ? 10 : 14, borderRadius: 14, borderCurve: "continuous", backgroundColor: c.surfaceStrong, paddingHorizontal: 14, paddingVertical: compact ? 11 : 14 }}>
      {showLabel ? (
        <View style={{ marginBottom: 10, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <Text style={{ fontSize: size, fontWeight: "700", color: c.textSoft }}>Payment</Text>
          <Text style={{ fontSize: compact ? 15 : 18, fontWeight: "800", letterSpacing: -0.3, color: done ? c.success : c.primary, fontVariant: ["tabular-nums"] }}>{Math.round(progress * 100)}%</Text>
        </View>
      ) : null}
      <ProgressBar progress={progress} height={compact ? 6 : 8} color={done ? c.success : c.primary} />
      <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ flex: 1, fontSize: size, fontWeight: "600", color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
          {currency(paid)} <Text style={{ color: c.muted, fontWeight: "500" }}>of {currency(total)}</Text>
        </Text>
        <Text style={{ fontSize: size, fontWeight: "700", color: done ? c.success : c.warning }} numberOfLines={1}>
          {done ? "Fully paid" : `${currency(remaining)} left`}
        </Text>
      </View>
    </View>
  );
};
