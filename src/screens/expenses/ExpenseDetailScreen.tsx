import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ExternalLink, FileWarning } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image, Linking, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpensePaymentMeter } from "../../components/expense/ExpensePaymentMeter";
import { AppContainer } from "../../components/shared/AppContainer";
import { BackButton } from "../../components/shared/BackButton";
import { ConfirmSheet } from "../../components/shared/ConfirmSheet";
import { ErrorState } from "../../components/shared/ErrorState";
import { FinanceSectionHeader, HeroMetricCard, KeyValueRow, PremiumCard } from "../../components/shared/FinanceUI";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { ScreenHeader } from "../../components/shared/ScreenHeader";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { StepperStep, StepperTimeline } from "../../components/shared/StepperTimeline";
import { FieldSurface } from "../../components/ui/FieldSurface";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useIsDark, useThemeColors } from "../../hooks/useTheme";
import { expenseService } from "../../services/expense.service";
import { useAuthStore } from "../../store/auth.store";
import { User } from "../../types";
import { currency, shortDate } from "../../utils/formatters";

type DetailAction = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "primary" | "danger";
  payload: Record<string, unknown>;
};

export const ExpenseDetailScreen = () => {
  const c = useThemeColors();
  const dark = useIsDark();
  const [rejectFocused, setRejectFocused] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [detailAction, setDetailAction] = useState<DetailAction | null>(null);

  const query = useQuery({
    queryKey: ["expense", id],
    queryFn: () => expenseService.get(id),
    enabled: Boolean(id)
  });

  const action = useMutation({
    mutationFn: (payload: Record<string, unknown>) => expenseService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense", id] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-insights"] });
      queryClient.invalidateQueries({ queryKey: ["reviewer-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["all-expenses-analytics"] });
      setRejectReason("");
    },
    onError: (err) => Alert.alert("Action failed", err.message)
  });

  const remove = useMutation({
    mutationFn: () => expenseService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-insights"] });
      queryClient.invalidateQueries({ queryKey: ["reviewer-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["all-expenses-analytics"] });
      router.back();
    },
    onError: (err) => Alert.alert("Delete failed", err.message)
  });

  const expense = query.data;
  const canMemberEdit = user?.role === "employee" && expense?.status === "pending_manager";
  const canApprove =
    (user?.role === "manager" || user?.role === "admin") &&
    expense?.status === "pending_manager";
  const canReject =
    (user?.role === "manager" || user?.role === "admin") &&
    expense?.status === "pending_manager";

  if (query.isError) {
    return (
      <AppContainer form>
        <BackButton />
        <ScreenHeader title="Expense" />
        <ErrorState message={query.error.message} onAction={() => query.refetch()} />
      </AppContainer>
    );
  }
  if (query.isLoading || !expense) return <AppContainer form><BackButton /><LoadingSkeleton /></AppContainer>;

  const owner = typeof expense.userId === "object" ? (expense.userId as User) : undefined;
  const submittedBy = owner?.name || "You";
  const reviewDone = Boolean(expense.approvedAt || expense.status === "rejected");
  const paymentDone = expense.settlementStatus === "paid" || expense.status === "paid" || Boolean(expense.paidAt);
  const receiptPreview = expense.receiptUrl && expense.receiptType?.startsWith("image/") ? (
    <PremiumCard compact style={{ marginBottom: 18, padding: 8 }}>
      <MotionPressable onPress={() => Linking.openURL(expense.receiptUrl!)} pressScale={0.98} accessibilityRole="imagebutton" accessibilityLabel="Open full receipt">
        <Image
          source={{ uri: expense.receiptUrl }}
          style={[s.receiptImage, { backgroundColor: c.surfaceMuted }]}
          resizeMode="cover"
        />
        <View style={{ position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(0,0,0,0.55)" }}>
          <ExternalLink size={14} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>Open full</Text>
        </View>
      </MotionPressable>
    </PremiumCard>
  ) : expense.receiptUrl ? (
    <PremiumCard compact style={{ marginBottom: 18 }}>
      <PrimaryButton
        label="Open Receipt"
        onPress={() => Linking.openURL(expense.receiptUrl!)}
        variant="secondary"
        icon={<ExternalLink size={16} color={c.primary} strokeWidth={2.2} />}
        compact
      />
    </PremiumCard>
  ) : (
    <PremiumCard compact style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.warningSoft }}>
          <FileWarning size={20} color={c.warning} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>No receipt attached</Text>
          <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: "500", color: c.muted }}>
            This claim can still be reviewed, but proof is missing.
          </Text>
        </View>
      </View>
    </PremiumCard>
  );

  const steps: StepperStep[] = [
    {
      id: "submitted",
      label: "Submitted",
      sublabel: `${expense.category} · ${expense.paymentMode}`,
      actor: submittedBy,
      timestamp: shortDate(expense.createdAt),
      status: "done"
    },
    {
      id: "manager-review",
      label: reviewDone ? "Manager review completed" : "Manager review",
      sublabel:
        expense.status === "rejected" && expense.rejectionReason
          ? expense.rejectionReason
          : reviewDone
            ? "Decision recorded"
            : "Waiting for reviewer decision",
      actor: expense.approvedBy?.name,
      timestamp: expense.approvedAt ? shortDate(expense.approvedAt) : expense.status === "rejected" ? shortDate(expense.updatedAt) : undefined,
      status: expense.status === "rejected" ? "error" : reviewDone ? "done" : "active"
    },
    {
      id: "decision",
      label: expense.status === "rejected" ? "Rejected" : expense.approvedAt ? "Approved" : "Approval decision",
      sublabel: expense.status === "rejected" ? expense.rejectionReason : expense.approvedAt ? "Ready for reimbursement" : "Not decided yet",
      actor: expense.approvedBy?.name,
      timestamp: expense.approvedAt ? shortDate(expense.approvedAt) : expense.status === "rejected" ? shortDate(expense.updatedAt) : undefined,
      status: expense.status === "rejected" ? "error" : expense.approvedAt ? "done" : "pending"
    },
    {
      id: "paid",
      label: paymentDone ? "Paid" : expense.settlementStatus === "partially_paid" ? "Partially paid" : "Payment pending",
      sublabel: paymentDone
        ? currency(expense.paidAmount || expense.amount)
        : expense.settlementStatus === "partially_paid"
          ? `${currency(expense.paidAmount)} paid, ${currency(expense.remainingAmount)} left`
          : "Awaiting settlement",
      actor: expense.paidBy?.name,
      timestamp: expense.paidAt ? shortDate(expense.paidAt) : expense.lastSettledAt ? shortDate(expense.lastSettledAt) : undefined,
      status: paymentDone ? "done" : expense.status === "approved" || expense.settlementStatus === "partially_paid" ? "active" : "pending"
    }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <AppContainer form bottomPadding={canApprove || canMemberEdit ? 40 : 112}>
        <BackButton />
        <ScreenHeader title="Expense" subtitle={`${expense.category} · ${shortDate(expense.date)}`} />

        {/* Hero - amount + status */}
        <FinanceSectionHeader title="Receipt" top={0} />
        {receiptPreview}

        <HeroMetricCard
          eyebrow="Transaction detail"
          label="Amount claimed"
          value={currency(expense.amount)}
          sublabel={`${expense.projectName} · ${expense.clientName}`}
          right={<StatusBadge status={expense.status} />}
          trustText={expense.receiptUrl ? "Receipt attached. Timeline and payment state are recorded." : "Receipt missing. Add proof before resubmitting if rejected."}
        />

        {/* Receipt image - first per design spec */}
        {/* Payment progress */}
        <FinanceSectionHeader title="Payment" top={0} />
        <PremiumCard compact style={{ marginBottom: 18, paddingTop: 4 }}>
          <ExpensePaymentMeter
            amount={expense.amount}
            paidAmount={expense.paidAmount}
            settlementStatus={expense.settlementStatus}
            compact={false}
          />
        </PremiumCard>

        {/* Key-value detail rows */}
        <FinanceSectionHeader title="Details" top={0} />
        <PremiumCard style={s.detailCard}>
          <KeyValueRow label="Project" value={expense.projectName} />
          <KeyValueRow label="Client" value={expense.clientName} />
          <KeyValueRow label="Category" value={expense.category} />
          <KeyValueRow label="Payment" value={expense.paymentMode} />
          <KeyValueRow label="Date" value={shortDate(expense.date)} />
          {expense.description ? (
            <KeyValueRow label="Description" value={expense.description} last={!expense.adminNote && !expense.rejectionReason} />
          ) : null}
          {expense.adminNote ? (
            <KeyValueRow label="Admin note" value={expense.adminNote} last={!expense.rejectionReason} />
          ) : null}
          {expense.rejectionReason ? (
            <View style={{ paddingVertical: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.error, marginBottom: 8 }}>
                Rejection reason
              </Text>
              <View style={[s.rejectionBubble, { backgroundColor: c.errorSoft }]}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: c.error, lineHeight: 20 }}>
                  {expense.rejectionReason}
                </Text>
              </View>
            </View>
          ) : null}
        </PremiumCard>

        {/* Lifecycle stepper */}
        <FinanceSectionHeader title="Timeline" top={8} />
        <PremiumCard style={{ marginBottom: 24 }}>
          <StepperTimeline steps={steps} />
        </PremiumCard>

        {/* Reject card (manager action) */}
        {canReject ? (
          <PremiumCard style={{ marginBottom: 20, borderColor: c.errorSoft }}>
            <Text style={{ fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: c.text }}>Reject with reason</Text>
            <Text style={{ marginTop: 2, marginBottom: 12, fontSize: 13, fontWeight: "500", color: c.muted }}>The submitter will see this note.</Text>
            <FieldSurface focused={rejectFocused} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                onFocus={() => setRejectFocused(true)}
                onBlur={() => setRejectFocused(false)}
                style={[s.rejectInput, { color: c.text }]}
                multiline
                textAlignVertical="top"
                underlineColorAndroid="transparent"
                selectionColor={c.primary}
                placeholder="Explain why this is being rejected..."
                placeholderTextColor={c.muted}
              />
            </FieldSurface>
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                label="Reject Expense"
                onPress={() =>
                  setDetailAction({
                    title: "Reject expense?",
                    message: "This expense will move to rejected status.",
                    confirmLabel: "Reject",
                    tone: "danger",
                    payload: { status: "rejected", rejectionReason: rejectReason.trim() }
                  })
                }
                variant="danger"
                loading={action.isPending}
                disabled={!rejectReason.trim()}
              />
            </View>
          </PremiumCard>
        ) : null}

        <ConfirmSheet
          visible={deleteOpen}
          title="Delete expense?"
          message="This pending expense will be permanently removed."
          confirmLabel="Delete"
          onConfirm={() => remove.mutate()}
          onClose={() => setDeleteOpen(false)}
        />
        <ConfirmSheet
          visible={Boolean(detailAction)}
          title={detailAction?.title || ""}
          message={detailAction?.message || ""}
          confirmLabel={detailAction?.confirmLabel}
          tone={detailAction?.tone}
          loading={action.isPending}
          onConfirm={() => {
            if (!detailAction) return;
            action.mutate(detailAction.payload, { onSuccess: () => setDetailAction(null) });
          }}
          onClose={() => setDetailAction(null)}
        />
      </AppContainer>

      {/* Bottom action bar */}
      {canApprove ? (
        <MotionView direction="up" style={[s.actionBar, { backgroundColor: dark ? "rgba(20,20,26,0.94)" : "rgba(255,255,255,0.94)", borderTopColor: c.divider, paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20), paddingBottom: Math.max(insets.bottom, 14) }]}>
          <PrimaryButton
            label="Approve Expense"
            onPress={() =>
              setDetailAction({
                title: "Approve expense?",
                message: `${currency(expense.amount)} for ${expense.projectName} will be approved.`,
                confirmLabel: "Approve",
                tone: "primary",
                payload: { status: "approved" }
              })
            }
            loading={action.isPending}
          />
        </MotionView>
      ) : canMemberEdit ? (
        <MotionView direction="up" style={[s.actionBar, { backgroundColor: dark ? "rgba(20,20,26,0.94)" : "rgba(255,255,255,0.94)", borderTopColor: c.divider, paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20), paddingBottom: Math.max(insets.bottom, 14) }]}>
          <PrimaryButton
            label="Delete Expense"
            onPress={() => setDeleteOpen(true)}
            variant="danger"
          />
        </MotionView>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  receiptImage: {
    width: "100%",
    height: 240,
    borderRadius: 14
  },
  detailCard: {
    marginBottom: 18,
    paddingVertical: 6,
    paddingHorizontal: 18
  },
  rejectionBubble: {
    borderRadius: 14,
    padding: 12
  },
  rejectInput: {
    fontSize: 16,
    minHeight: 72
  },
  actionBar: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12
  }
});
