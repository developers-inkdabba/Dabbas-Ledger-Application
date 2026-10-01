import { Paperclip } from "lucide-react-native";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getCategoryMeta, withAlpha } from "../../constants/categoryMeta";
import { useThemeColors } from "../../hooks/useTheme";
import { Expense } from "../../types";
import { currency, shortDate } from "../../utils/formatters";
import { MotionPressable } from "../shared/Motion";
import { StatusBadge } from "../shared/StatusBadge";

type Props = {
  expense: Expense;
  onPress?: () => void;
  grouped?: boolean;
  last?: boolean;
  plain?: boolean;
};

/** Wallet-style transaction row: tinted category plate, title, amount, status. */
export const ExpenseCard = memo(function ExpenseCard({ expense, onPress, grouped = false, last = false, plain = false }: Props) {
  const c = useThemeColors();
  const { Icon, tint } = getCategoryMeta(expense.category);
  const hasReceipt = Boolean(expense.receiptUrl);
  const showSettlement = expense.status === "approved" || expense.status === "paid" || expense.settlementStatus !== "unpaid";
  const paidAmount = Math.min(expense.amount, Math.max(0, expense.paidAmount || 0));
  const remainingAmount = Math.max(0, expense.remainingAmount ?? expense.amount - paidAmount);
  const paidRatio = expense.amount > 0 ? paidAmount / expense.amount : 0;

  return (
    <MotionPressable
      onPress={onPress}
      haptic={Boolean(onPress)}
      pressScale={0.975}
      accessibilityRole="button"
      accessibilityLabel={`${expense.projectName}, ${currency(expense.amount)}, ${expense.status.replace("_", " ")}`}
      style={[
        s.card,
        grouped
          ? { backgroundColor: "transparent", borderRadius: 0, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.divider }
          : { backgroundColor: c.surfaceStrong, borderRadius: 16, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong }
      ]}
    >
      <View style={[s.content, plain && s.contentPlain]}>
        <View style={s.topRow}>
          <View style={[s.iconWrap, { backgroundColor: withAlpha(tint, 0.15) }]}>
            <Icon size={20} color={tint} strokeWidth={2.1} />
          </View>
          <View style={s.meta}>
            <Text style={[s.project, { color: c.text }]} numberOfLines={1}>{expense.projectName}</Text>
            <Text style={[s.subtext, { color: c.muted }]} numberOfLines={1}>
              {expense.category}{expense.clientName ? ` · ${expense.clientName}` : ""}
            </Text>
          </View>
          <View style={s.amountCol}>
            <Text style={[s.amount, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{currency(expense.amount)}</Text>
            <View style={s.dateRow}>
              {hasReceipt ? <Paperclip size={11} color={c.muted} strokeWidth={2.2} /> : null}
              <Text style={[s.date, { color: c.muted }]}>{shortDate(expense.date)}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer}>
          <StatusBadge status={showSettlement ? expense.settlementStatus : expense.status} compact />
          {showSettlement ? (
            <View style={s.settleWrap}>
              <View style={[s.settleTrack, { backgroundColor: c.surfaceMuted }]}>
                <View style={{ width: `${Math.round(paidRatio * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: remainingAmount > 0 ? c.primary : c.success }} />
              </View>
              <Text style={[s.settleText, { color: remainingAmount > 0 ? c.warning : c.success }]} numberOfLines={1}>
                {remainingAmount > 0 ? `${currency(remainingAmount)} due` : "Settled"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </MotionPressable>
  );
});

const s = StyleSheet.create({
  card: { flexDirection: "row", overflow: "hidden", borderCurve: "continuous" },
  content: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  contentPlain: { paddingHorizontal: 16, paddingVertical: 15 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, borderCurve: "continuous", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  meta: { flex: 1, minWidth: 0 },
  project: { fontSize: 16, fontWeight: "700", lineHeight: 21, letterSpacing: -0.2 },
  subtext: { fontSize: 13, fontWeight: "500", marginTop: 2, lineHeight: 17 },
  amountCol: { alignItems: "flex-end", flexShrink: 0, maxWidth: "38%" },
  amount: { fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -0.3 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  date: { fontSize: 12, fontWeight: "500" },
  footer: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 56 },
  settleWrap: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "flex-end" },
  settleTrack: { flex: 1, maxWidth: 90, height: 5, borderRadius: 3, overflow: "hidden" },
  settleText: { flexShrink: 1, fontSize: 12, fontWeight: "700" }
});
