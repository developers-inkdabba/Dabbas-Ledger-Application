import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, CheckCircle2, CheckSquare, ClipboardCheck, Clock, KeyRound, ReceiptText, Square, TrendingUp, UserPlus, WalletCards, X, XCircle } from "lucide-react-native";
import { ReactNode, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { ExpenseCard } from "../../components/expense/ExpenseCard";
import { AppContainer } from "../../components/shared/AppContainer";
import { ConfirmSheet } from "../../components/shared/ConfirmSheet";
import { EmptyState } from "../../components/shared/EmptyState";
import { ErrorState } from "../../components/shared/ErrorState";
import { FinanceSectionHeader, HeroMetricCard, MetricPill, PremiumCard, ProgressBar, SegmentedProgress } from "../../components/shared/FinanceUI";
import { GlassSheen } from "../../components/shared/GlassSheen";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { ScreenHeader } from "../../components/shared/ScreenHeader";
import { SelectionControl } from "../../components/shared/SelectionControl";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { UserAvatar } from "../../components/shared/UserAvatar";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { chartColors } from "../../constants/theme";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { adminService } from "../../services/admin.service";
import { expenseService } from "../../services/expense.service";
import { useAuthStore } from "../../store/auth.store";
import { Expense, User } from "../../types";
import { currency, shortDate } from "../../utils/formatters";

type ReviewDecision = {
  kind: "expense" | "access" | "bulk";
  ids: string[];
  decision: "approve" | "reject";
  title: string;
  message: string;
  confirmLabel: string;
  requiresReason?: boolean;
};

type ApprovalFilter = "all" | "high_value" | "with_receipt" | "missing_receipt";
type ReviewTab = "approvals" | "access";

const rejectionReasons = ["Missing receipt", "Wrong category", "Duplicate claim", "Need more detail"];

export const ApprovalsScreen = () => {
  const user = useAuthStore((state) => state.user);
  const canReview = user?.role === "admin" || user?.role === "manager";

  if (!canReview) return <EmployeeRequestsView />;
  return <ReviewerApprovalsView />;
};

// --- Employee: Enhanced Reimbursement Balance -------------------------------

const EmployeeRequestsView = () => {
  const c = useThemeColors();

  const query = useQuery({
    queryKey: ["my-requests"],
    queryFn: expenseService.allForReports
  });
  const user = useAuthStore((state) => state.user);
  const walletQuery = useQuery({
    queryKey: ["settlement-wallet", user?._id],
    queryFn: () => expenseService.listSettlements(user?._id || ""),
    enabled: Boolean(user?._id)
  });

  const expenses = query.data || [];
  const walletBalance = (walletQuery.data || []).reduce((sum, item) => sum + Math.max(0, item.unallocatedAmount || 0), 0);
  const pending = expenses.filter((e) => e.status === "pending_manager");
  const approved = expenses.filter((e) => e.status === "approved");
  const paid = expenses.filter((e) => e.status === "paid" || e.settlementStatus === "paid");
  const rejected = expenses.filter((e) => e.status === "rejected");

  const totalPending = pending.reduce((s, e) => s + e.amount, 0);
  const totalApproved = approved.reduce((s, e) => s + e.remainingAmount, 0);
  const totalPaid = paid.reduce((s, e) => s + (e.paidAmount || e.amount), 0);
  const totalRejected = rejected.reduce((s, e) => s + e.amount, 0);
  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // Oldest approved-but-unpaid expense
  // Per-project balance breakdown
  const projectBalances = approved.reduce<Record<string, { project: string; amount: number }>>((acc, e) => {
    const key = e.projectName || "General";
    if (!acc[key]) acc[key] = { project: key, amount: 0 };
    acc[key].amount += e.remainingAmount;
    return acc;
  }, {});
  const topProjects = Object.values(projectBalances)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const heroShadow = useElevation("medium");

  if (query.isLoading) return <AppContainer><LoadingSkeleton /></AppContainer>;
  if (query.isError) return (
    <AppContainer>
      <ScreenHeader title="My Requests" subtitle="Approval status of your submissions" />
      <ErrorState message={query.error.message} onAction={() => query.refetch()} />
    </AppContainer>
  );

  return (
    <AppContainer>
      <ScreenHeader title="My Requests" subtitle="Approval status of your submissions" />

      {/* Hero reimbursement card */}
      <MotionView
        direction="up"
        style={[{
          marginBottom: 14,
          overflow: "hidden",
          borderRadius: 20,
          borderCurve: "continuous",
          padding: 22,
          backgroundColor: c.surfaceGlass,
          borderWidth: 1,
          borderColor: c.glassBorder
        }, heroShadow]}
      >
        <GlassSheen />
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", color: c.primary, letterSpacing: 0.6 }}>
              Balance owed to me
            </Text>
            <Text
              style={{ marginTop: 6, fontSize: 42, fontWeight: "800", letterSpacing: -1.6, color: c.text, lineHeight: 50, fontVariant: ["tabular-nums"] }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {currency(totalApproved)}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "500", color: c.muted }}>
              Approved and awaiting reimbursement
            </Text>
          </View>
          <View style={{ minWidth: 78, borderRadius: 16, backgroundColor: c.primarySoft, paddingHorizontal: 14, paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: c.primary, fontVariant: ["tabular-nums"] }}>{expenses.length}</Text>
            <Text style={{ marginTop: 1, fontSize: 11, fontWeight: "700", letterSpacing: 0.4, color: c.primary, textTransform: "uppercase" }}>Claims</Text>
          </View>
        </View>

        {/* Progress bar: paid vs total */}
        {grandTotal > 0 ? (
          <View style={{ marginTop: 18 }}>
            <ProgressBar value={totalPaid} max={grandTotal} color={c.primary} height={8} />
            <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: "500", color: c.muted }} numberOfLines={1}>
                {currency(totalPaid)} paid of {currency(grandTotal)}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
                {grandTotal > 0 ? Math.round((totalPaid / grandTotal) * 100) : 0}% settled
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><MetricPill label="Pending" value={String(pending.length)} tone="warning" /></View>
          <View style={{ flex: 1 }}><MetricPill label="Approved" value={currency(totalApproved)} tone="primary" /></View>
          <View style={{ flex: 1 }}><MetricPill label="Rejected" value={String(rejected.length)} tone="error" /></View>
        </View>
      </MotionView>

      <WalletCreditCard
        amount={walletBalance}
        subtitle={walletBalance > 0 ? "Advance amount already paid by your company" : "Extra paid amounts will appear here as advance credit"}
      />

      {/* Status summary tiles */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <StatusTile
          icon={<Clock color={c.warning} size={18} strokeWidth={2.2} />}
          label="Pending"
          count={pending.length}
          amount={totalPending}
          color={c.warning}
          bg={c.warningSoft}
          delay={60}
        />
        <StatusTile
          icon={<CheckCircle2 color={c.success} size={18} strokeWidth={2.2} />}
          label="Approved"
          count={approved.length}
          amount={approved.reduce((s, e) => s + e.amount, 0)}
          color={c.success}
          bg={c.successSoft}
          delay={110}
        />
        <StatusTile
          icon={<XCircle color={c.error} size={18} strokeWidth={2.2} />}
          label="Rejected"
          count={rejected.length}
          amount={totalRejected}
          color={c.error}
          bg={c.errorSoft}
          delay={160}
        />
      </View>

      {/* Per-project balance breakdown */}
      {topProjects.length > 0 ? (
        <PremiumCard delay={120} style={{ marginBottom: 16, padding: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: c.text }}>Balance by project</Text>
            <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: c.primarySoft }}>
              <TrendingUp color={c.primary} size={16} strokeWidth={2.2} />
            </View>
          </View>
          {topProjects.map((proj, index) => (
            <View key={proj.project} style={{ borderTopWidth: index > 0 ? StyleSheet.hairlineWidth : 0, borderTopColor: c.divider, paddingTop: index > 0 ? 12 : 0, marginTop: index > 0 ? 12 : 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: c.text }} numberOfLines={1}>{proj.project}</Text>
                <Text style={{ fontSize: 15, fontWeight: "800", color: c.primary, fontVariant: ["tabular-nums"] }}>{currency(proj.amount)}</Text>
              </View>
              <ProgressBar value={proj.amount} max={totalApproved} color={c.primary} height={6} />
            </View>
          ))}
        </PremiumCard>
      ) : null}

      {/* Pending list */}
      {pending.length > 0 ? (
        <>
          <FinanceSectionHeader title="Waiting for review" subtitle="Your manager will approve or reject these" top={0} />
          {pending.map((expense) => (
            <ExpenseCard key={expense._id} expense={expense} plain onPress={() => router.push(`/expenses/${expense._id}`)} />
          ))}
        </>
      ) : null}

      {/* Approved but unpaid */}
      {approved.length > 0 ? (
        <>
          <FinanceSectionHeader
            title="Approved · payment pending"
            subtitle="Approved by your manager, reimbursement outstanding"
            top={pending.length > 0 ? 4 : 0}
          />
          {approved.map((expense) => (
            <ExpenseCard key={expense._id} expense={expense} plain onPress={() => router.push(`/expenses/${expense._id}`)} />
          ))}
        </>
      ) : null}

      {/* Rejected */}
      {rejected.length > 0 ? (
        <>
          <FinanceSectionHeader title="Rejected" subtitle="Review the reason and resubmit if needed" top={4} />
          {rejected.map((expense) => (
            <ExpenseCard key={expense._id} expense={expense} plain onPress={() => router.push(`/expenses/${expense._id}`)} />
          ))}
        </>
      ) : null}

      {expenses.length === 0 ? (
        <EmptyState
          title="No requests yet"
          message="Submit your first expense and it will appear here with its approval status."
          action={<PrimaryButton label="Add expense" variant="secondary" compact onPress={() => router.push("/add" as never)} />}
        />
      ) : null}
    </AppContainer>
  );
};

const StatusTile = ({
  icon,
  label,
  count,
  amount,
  color,
  bg,
  delay
}: {
  icon: ReactNode;
  label: string;
  count: number;
  amount: number;
  color: string;
  bg: string;
  delay: number;
}) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  return (
    <MotionView delay={delay} direction="up" style={[{ flex: 1, minWidth: 0, borderRadius: 16, borderCurve: "continuous", borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surfaceGlass, padding: 14 }, shadow]}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        {icon}
      </View>
      <Text style={{ fontSize: 12, fontWeight: "600", color: c.muted }} numberOfLines={1}>{label}</Text>
      <Text style={{ marginTop: 1, fontSize: 24, fontWeight: "800", letterSpacing: -0.5, color: c.text, fontVariant: ["tabular-nums"] }}>{count}</Text>
      <Text style={{ marginTop: 1, fontSize: 12, fontWeight: "700", color }} numberOfLines={1} adjustsFontSizeToFit>{currency(amount)}</Text>
    </MotionView>
  );
};

const WalletCreditCard = ({ amount, subtitle }: { amount: number; subtitle: string }) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  return (
    <MotionView
      delay={40}
      direction="up"
      style={[{
        marginBottom: 14,
        overflow: "hidden",
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: amount > 0 ? c.primary : c.glassBorder,
        backgroundColor: amount > 0 ? c.primarySoft : c.surfaceGlass,
        padding: 18
      }, shadow]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: amount > 0 ? c.primary : c.primarySoft }}>
          <WalletCards color={amount > 0 ? c.onPrimary : c.primary} size={24} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: amount > 0 ? c.primary : c.muted }}>
            Wallet credit
          </Text>
          <Text style={{ marginTop: 2, fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.8, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
            {currency(amount)}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: "500", color: c.muted }} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
    </MotionView>
  );
};

// --- Reviewer: Bulk Approvals View -----------------------------------------

const ReviewTopTabs = ({
  value,
  onChange,
  approvalCount,
  accessCount
}: {
  value: ReviewTab;
  onChange: (value: ReviewTab) => void;
  approvalCount: number;
  accessCount: number;
}) => {
  return <SelectionControl label="Review section" value={value} onChange={onChange} options={[
    { value: "approvals", label: "Approval requests", count: approvalCount },
    { value: "access", label: "Workspace access", count: accessCount },
  ]} />;
};

const ReviewerApprovalsView = () => {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<ApprovalFilter>("all");
  const [reviewTab, setReviewTab] = useState<ReviewTab>("approvals");

  const query = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const all = await expenseService.allForReports();
      return all.filter((expense) => expense.status === "pending_manager");
    }
  });
  const accessQuery = useQuery({
    queryKey: ["access-requests"],
    queryFn: adminService.accessRequests
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["approvals"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["expense-insights"] });
    queryClient.invalidateQueries({ queryKey: ["reviewer-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["all-expenses-analytics"] });
  };

  const action = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      expenseService.update(id, payload),
    onSuccess: invalidateAll,
    onError: (error) => Alert.alert("Approval failed", error.message)
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, payload }: { ids: string[]; payload: Record<string, unknown> }) => {
      for (const id of ids) {
        await expenseService.update(id, payload);
      }
    },
    onSuccess: () => {
      invalidateAll();
      setSelectedIds(new Set());
      setSelectMode(false);
    },
    onError: (error) => Alert.alert("Bulk action failed", error.message)
  });

  const accessAction = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      decision === "approve" ? adminService.approveAccess(id) : adminService.rejectAccess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["reviewer-dashboard"] });
    },
    onError: (error) => Alert.alert("Access review failed", error.message)
  });

  const pending = query.data || [];
  const accessRequests = accessQuery.data || [];
  const totalPending = pending.reduce((sum, item) => sum + item.amount, 0);
  const oldestPending = pending
    .slice()
    .sort((a, b) => (a.createdAt || a.date).localeCompare(b.createdAt || b.date))[0];
  const filteredPending = useMemo(() => {
    if (activeFilter === "high_value") return pending.filter((expense) => expense.amount >= 5000);
    if (activeFilter === "with_receipt") return pending.filter((expense) => Boolean(expense.receiptUrl));
    if (activeFilter === "missing_receipt") return pending.filter((expense) => !expense.receiptUrl);
    return pending;
  }, [activeFilter, pending]);
  const selectedCount = selectedIds.size;
  const selectedTotal = filteredPending
    .filter((e) => selectedIds.has(e._id))
    .reduce((sum, e) => sum + e.amount, 0);
  const actionLoading = action.isPending || accessAction.isPending || bulkAction.isPending;
  const changeReviewTab = (next: ReviewTab) => {
    setReviewTab(next);
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectMode(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const toggleSelect = (id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    Haptics.selectionAsync();
    setSelectedIds(new Set(filteredPending.map((e) => e._id)));
  };

  const clearSelection = () => {
    Haptics.selectionAsync();
    setSelectedIds(new Set());
  };

  const startBulkReject = () => {
    if (!selectedCount) return;
    setRejectionReason("");
    setDecision({
      kind: "bulk",
      ids: Array.from(selectedIds),
      decision: "reject",
      title: `Reject ${selectedCount} expenses?`,
      message: `${currency(selectedTotal)} across ${selectedCount} expenses will be rejected.`,
      confirmLabel: "Reject All",
      requiresReason: true
    });
  };

  const startBulkApprove = () => {
    if (!selectedCount) return;
    setDecision({
      kind: "bulk",
      ids: Array.from(selectedIds),
      decision: "approve",
      title: `Approve ${selectedCount} expenses?`,
      message: `${currency(selectedTotal)} across ${selectedCount} expenses will be approved.`,
      confirmLabel: "Approve All"
    });
  };

  const confirmDecision = () => {
    if (!decision) return;
    if (decision.kind === "access") {
      accessAction.mutate(
        { id: decision.ids[0], decision: decision.decision },
        { onSuccess: () => setDecision(null) }
      );
      return;
    }
    if (decision.kind === "bulk") {
      const payload =
        decision.decision === "approve"
          ? { status: "approved" }
          : { status: "rejected", rejectionReason: rejectionReason.trim() || "Bulk rejected." };
      bulkAction.mutate(
        { ids: decision.ids, payload },
        { onSuccess: () => { setDecision(null); setRejectionReason(""); } }
      );
      return;
    }
    action.mutate(
      {
        id: decision.ids[0],
        payload:
          decision.decision === "approve"
            ? { status: "approved" }
            : { status: "rejected", rejectionReason: rejectionReason.trim() || "Rejected by reviewer." }
      },
      { onSuccess: () => { setDecision(null); setRejectionReason(""); } }
    );
  };

  if (query.isLoading || accessQuery.isLoading) return <AppContainer><LoadingSkeleton /></AppContainer>;

  return (
    <AppContainer bottomPadding={136}>
      <ScreenHeader title="Approvals" subtitle="Team expenses waiting for a decision" />

      <ReviewTopTabs
        value={reviewTab}
        onChange={changeReviewTab}
        approvalCount={pending.length}
        accessCount={accessRequests.length}
      />

      {reviewTab === "approvals" ? (
      <>
      <HeroMetricCard
        eyebrow="Manager queue"
        label="Awaiting approval"
        value={String(pending.length)}
        sublabel={`${currency(totalPending)} pending${oldestPending ? ` · oldest ${shortDate(oldestPending.createdAt || oldestPending.date)}` : ""}`}
        accentColor={c.warning}
        primaryLabel={pending.length ? "Start review" : undefined}
        onPrimaryPress={pending.length ? () => router.push(`/expenses/${pending[0]._id}`) : undefined}
        trustText={`${accessRequests.length} workspace access request${accessRequests.length !== 1 ? "s" : ""}. Approval actions are audit logged.`}
        right={
          <View style={{ width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: c.warningSoft }}>
            <ClipboardCheck color={c.warning} size={25} strokeWidth={2} />
          </View>
        }
        footer={
          <View style={{ gap: 12 }}>
            <SegmentedProgress
              height={7}
              segments={[
                { value: pending.filter((item) => item.receiptUrl).reduce((sum, item) => sum + item.amount, 0), color: chartColors.approved },
                { value: pending.filter((item) => !item.receiptUrl).reduce((sum, item) => sum + item.amount, 0), color: chartColors.pending }
              ]}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><MetricPill label="Queue" value={currency(totalPending)} tone="warning" /></View>
              <View style={{ flex: 1 }}><MetricPill label="Avg" value={currency(pending.length ? totalPending / pending.length : 0)} tone="primary" /></View>
              {selectMode ? <View style={{ flex: 1 }}><MetricPill label="Selected" value={String(selectedCount)} tone="success" /></View> : null}
            </View>
          </View>
        }
      />

      <ApprovalSegmentControl
        value={activeFilter}
        onChange={(next) => {
          setActiveFilter(next);
          setSelectedIds(new Set());
        }}
        counts={{
          all: pending.length,
          high_value: pending.filter((expense) => expense.amount >= 5000).length,
          with_receipt: pending.filter((expense) => Boolean(expense.receiptUrl)).length,
          missing_receipt: pending.filter((expense) => !expense.receiptUrl).length
        }}
      />
      </>
      ) : null}

      {/* Bulk select toolbar */}
      {reviewTab === "approvals" && pending.length > 0 ? (
        <PremiumCard compact style={{ marginBottom: 14, padding: 12, borderRadius: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <MotionPressable hitSlop={4}
              onPress={toggleSelectMode}
              pressScale={0.94}
              accessibilityRole="button"
              accessibilityState={{ selected: selectMode }}
              style={{
                minHeight: 38,
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                borderRadius: 10,
                paddingHorizontal: 14,
                backgroundColor: selectMode ? c.primary : c.primarySoft
              }}
            >
              {selectMode ? <CheckSquare color={c.onPrimary} size={16} /> : <Square color={c.primary} size={16} />}
              <Text style={{ fontSize: 14, fontWeight: "700", color: selectMode ? c.onPrimary : c.primary }}>
                {selectMode ? "Done" : "Select"}
              </Text>
            </MotionPressable>
            {selectMode ? (
              <>
                <MotionPressable hitSlop={4}
                  onPress={selectAll}
                  pressScale={0.94}
                  accessibilityRole="button"
                  style={{ minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 14, backgroundColor: c.surfaceMuted }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Select all</Text>
                </MotionPressable>
                {selectedCount > 0 ? (
                  <MotionView direction="scale" style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: c.text }}>{selectedCount} of {filteredPending.length}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: c.primary, fontVariant: ["tabular-nums"] }}>{currency(selectedTotal)}</Text>
                  </MotionView>
                ) : null}
              </>
            ) : (
              <Text style={{ flex: 1, fontSize: 13, fontWeight: "500", color: c.muted }}>Long-press a card or tap Select to bulk approve</Text>
            )}
          </View>
          {selectMode && selectedCount > 0 ? (
            <MotionView
              direction="down"
              style={{
                marginTop: 12,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: c.divider,
                paddingTop: 12,
                gap: 10
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: c.text }} numberOfLines={1}>
                  {selectedCount} selected · {currency(selectedTotal)}
                </Text>
                <MotionPressable onPress={clearSelection} hitSlop={8} accessibilityRole="button">
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.primary }}>Clear</Text>
                </MotionPressable>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Reject"
                    variant="ghost"
                    compact
                    loading={bulkAction.isPending}
                    onPress={startBulkReject}
                    icon={<X color={c.error} size={15} />}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={`Approve ${selectedCount}`}
                    compact
                    loading={bulkAction.isPending}
                    onPress={startBulkApprove}
                    icon={<Check color={c.onPrimary} size={16} strokeWidth={2.6} />}
                  />
                </View>
              </View>
            </MotionView>
          ) : null}
        </PremiumCard>
      ) : null}

      {/* Access requests */}
      {reviewTab === "access" ? (
      <>
      <FinanceSectionHeader title="Workspace access" subtitle="New signups waiting to join this company" top={2} />
      {accessQuery.isError ? (
        <ErrorState message={accessQuery.error.message} onAction={() => accessQuery.refetch()} />
      ) : accessRequests.length ? (
        accessRequests.map((member) => (
          <AccessRequestCard
            key={member._id || member.id || member.authUid}
            member={member}
            loading={accessAction.isPending}
            onApprove={() => setDecision({
              kind: "access",
              ids: [member._id || member.id || member.authUid || ""],
              decision: "approve",
              title: "Approve access?",
              message: `${member.name || "This person"} will be able to enter the company workspace.`,
              confirmLabel: "Approve Access"
            })}
            onReject={() => setDecision({
              kind: "access",
              ids: [member._id || member.id || member.authUid || ""],
              decision: "reject",
              title: "Reject access?",
              message: `${member.name || "This person"} will not be able to enter this workspace.`,
              confirmLabel: "Reject Request"
            })}
          />
        ))
      ) : (
        <EmptyState title="No access requests" message="New company signups will appear here." icon={<UserPlus color={c.primary} size={26} strokeWidth={1.8} />} />
      )}
      </>
      ) : null}

      {/* Approval requests */}
      {reviewTab === "approvals" ? (
      <>
      <FinanceSectionHeader
        title="Approval requests"
        subtitle={selectMode ? "Tap cards to select for bulk action" : "Tap for details · long-press to select"}
        top={2}
      />
      {query.isError ? (
        <ErrorState message={query.error.message} onAction={() => query.refetch()} />
      ) : filteredPending.length ? (
        filteredPending.map((expense) => (
          <ApprovalCard
            key={expense._id}
            expense={expense}
            loading={action.isPending}
            selectMode={selectMode}
            selected={selectedIds.has(expense._id)}
            onToggleSelect={() => toggleSelect(expense._id)}
            onLongPress={() => { if (!selectMode) { setSelectMode(true); toggleSelect(expense._id); } }}
            onOpen={() => !selectMode && router.push(`/expenses/${expense._id}`)}
            onApprove={() => !selectMode && setDecision({
              kind: "expense",
              ids: [expense._id],
              decision: "approve",
              title: "Approve expense?",
              message: `${currency(expense.amount)} for ${expense.projectName} will move to approved status.`,
              confirmLabel: "Approve Expense"
            })}
            onReject={() => !selectMode && (setRejectionReason(""), setDecision({
              kind: "expense",
              ids: [expense._id],
              decision: "reject",
              title: "Reject expense?",
              message: `${currency(expense.amount)} for ${expense.projectName} will be rejected.`,
              confirmLabel: "Reject Expense",
              requiresReason: true
            }))}
          />
        ))
      ) : (
        <EmptyState title="All clear" message={pending.length ? "No approvals match this filter." : "There are no expenses waiting for approval."} />
      )}
      </>
      ) : null}

      <ConfirmSheet
        visible={Boolean(decision)}
        title={decision?.title || ""}
        message={decision?.message || ""}
        confirmLabel={decision?.confirmLabel}
        tone={decision?.decision === "approve" ? "primary" : "danger"}
        loading={actionLoading}
        reasonLabel={decision?.requiresReason ? "Reason for rejection" : undefined}
        reason={decision?.requiresReason ? rejectionReason : undefined}
        reasonSuggestions={decision?.requiresReason ? rejectionReasons : undefined}
        onReasonChange={decision?.requiresReason ? setRejectionReason : undefined}
        onConfirm={confirmDecision}
        onClose={() => { setDecision(null); setRejectionReason(""); }}
      />
    </AppContainer>
  );
};

// --- Access Request Card -----------------------------------------------------

const ApprovalSegmentControl = ({
  value,
  onChange,
  counts
}: {
  value: ApprovalFilter;
  onChange: (value: ApprovalFilter) => void;
  counts: Record<ApprovalFilter, number>;
}) => {
  return <SelectionControl label="Approval filter" value={value} onChange={onChange} scroll options={[
    { value: "all", label: "All", count: counts.all },
    { value: "high_value", label: "High value", count: counts.high_value },
    { value: "with_receipt", label: "Receipts", count: counts.with_receipt },
    { value: "missing_receipt", label: "Missing receipt", count: counts.missing_receipt },
  ]} />;
};

const AccessRequestCard = ({
  member,
  loading,
  onApprove,
  onReject
}: {
  member: User;
  loading?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const c = useThemeColors();
  return (
    <PremiumCard style={{ marginBottom: 12, padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <UserAvatar name={member.name} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", letterSpacing: -0.2, color: c.text }} numberOfLines={1}>{member.name || "New member"}</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted, marginTop: 2 }} numberOfLines={1}>{member.email}</Text>
            </View>
            <StatusBadge status="pending_manager" compact />
          </View>
          <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <InfoChip icon={<UserPlus color={c.primary} size={12} />} label={member.requestedCompanyName || "Company requested"} c={c} />
            <InfoChip icon={<KeyRound color={c.primary} size={12} />} label={member.companyInviteCode || "Invite code"} c={c} />
          </View>
        </View>
      </View>
      <View style={{ marginTop: 14, flexDirection: "row", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider, paddingTop: 12 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Reject" onPress={onReject} loading={loading} variant="ghost" compact icon={<X color={c.error} size={14} />} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Approve" onPress={onApprove} loading={loading} compact icon={<Check color={c.onPrimary} size={15} strokeWidth={2.6} />} />
        </View>
      </View>
    </PremiumCard>
  );
};

const InfoChip = ({ icon, label, c }: { icon: ReactNode; label: string; c: ReturnType<typeof useThemeColors> }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, backgroundColor: c.primarySoft, paddingHorizontal: 10, paddingVertical: 5 }}>
    {icon}
    <Text style={{ fontSize: 12, fontWeight: "700", color: c.primary }} numberOfLines={1}>{label}</Text>
  </View>
);

// --- Approval Card (with select mode) ---------------------------------------

const ApprovalCard = ({
  expense,
  loading,
  selectMode,
  selected,
  onToggleSelect,
  onLongPress,
  onOpen,
  onApprove,
  onReject
}: {
  expense: Expense;
  loading?: boolean;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onLongPress: () => void;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  const owner = typeof expense.userId === "object" ? (expense.userId as User) : undefined;

  return (
    <MotionView
      direction="up"
      style={[{
        marginBottom: 12,
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? c.primary : c.glassBorder,
        backgroundColor: selected ? c.primarySoft : c.surfaceGlass,
        overflow: "hidden"
      }, shadow]}
    >
      <MotionPressable
        onPress={selectMode ? onToggleSelect : onOpen}
        onLongPress={onLongPress}
        delayLongPress={320}
        pressScale={0.98}
        haptic={!selectMode}
        style={{ padding: 16 }}
        accessibilityRole="button"
        accessibilityState={selectMode ? { selected } : undefined}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
          <View style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
            <UserAvatar name={owner?.name || expense.projectName} size={48} />
            {selectMode ? (
              <View
                style={{
                  position: "absolute",
                  right: -3,
                  bottom: -3,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: c.backgroundElevated,
                  backgroundColor: selected ? c.primary : c.surfaceStrong,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {selected ? <MotionView direction="scale"><Check color={c.onPrimary} size={13} strokeWidth={3} /></MotionView> : null}
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }} numberOfLines={1}>
                  {owner?.name || "Team member"}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted, marginTop: 2 }} numberOfLines={1}>
                  {expense.projectName} · {expense.category}
                </Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: selected ? c.primary : c.text, fontVariant: ["tabular-nums"] }}>{currency(expense.amount)}</Text>
            </View>
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <StatusBadge status={expense.status} compact />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ReceiptText color={expense.receiptUrl ? c.success : c.muted} size={13} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: c.muted }}>{shortDate(expense.date)}</Text>
              </View>
            </View>
          </View>
        </View>
      </MotionPressable>

      {!selectMode ? (
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Reject" onPress={onReject} loading={loading} variant="ghost" compact icon={<X color={c.error} size={15} strokeWidth={2.6} />} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Approve" onPress={onApprove} loading={loading} compact icon={<Check color={c.onPrimary} size={15} strokeWidth={2.6} />} />
          </View>
        </View>
      ) : null}
    </MotionView>
  );
};
