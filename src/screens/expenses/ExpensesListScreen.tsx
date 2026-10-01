import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { CalendarDays, CheckCircle2, ReceiptText, SlidersHorizontal, WalletCards, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpenseCard } from "../../components/expense/ExpenseCard";
import { AccountButton } from "../../components/shared/AccountButton";
import { AdaptiveSheet } from "../../components/shared/AdaptiveSheet";
import { ListScreen, useListFrame } from "../../components/shared/AppContainer";
import { EmptyState } from "../../components/shared/EmptyState";
import { ErrorState } from "../../components/shared/ErrorState";
import { FilterSheet } from "../../components/shared/FilterSheet";
import { FinanceSectionHeader, HeroMetricCard, MetricPill, PremiumCard, SegmentedProgress } from "../../components/shared/FinanceUI";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { ScreenHeader } from "../../components/shared/ScreenHeader";
import { SelectionControl } from "../../components/shared/SelectionControl";
import { FieldSurface } from "../../components/ui/FieldSurface";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { SearchInput } from "../../components/ui/SearchInput";
import { chartColors, paymentModes } from "../../constants/theme";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { expenseService } from "../../services/expense.service";
import { useAuthStore } from "../../store/auth.store";
import { useFilterStore } from "../../store/filter.store";
import { Expense, PaymentMode, PaymentSettlement, User } from "../../types";
import { formatDateKey, formatReadableDateKey, parseDateKey, todayDateKey } from "../../utils/dates";
import { currency, toAmount } from "../../utils/formatters";
import { allocateSettlement, AllocationMode } from "../../utils/settlements";

export const ExpensesListScreen = () => {
  const c = useThemeColors();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementResult, setSettlementResult] = useState<PaymentSettlement | null>(null);
  const [settlementUserId, setSettlementUserId] = useState("");
  const user = useAuthStore((state) => state.user);
  const canSettleTeam = user?.role === "admin" || user?.role === "manager";
  const queryClient = useQueryClient();
  const glass = useElevation("soft");
  const { scrollY, onScroll, contentContainerStyle } = useListFrame({ bottomPadding: 136 });
  // Two columns once there is room (tablets, unfolded foldables, landscape); one on phones.
  const { width } = useResponsiveLayout();
  const columns = width >= 900 ? 2 : 1;
  const {
    search,
    status,
    category,
    paymentMode,
    userId,
    setSearch,
    setStatus,
    setCategory,
    setPaymentMode,
    setUserId,
    reset
  } = useFilterStore();

  const query = useInfiniteQuery({
    queryKey: ["expenses", search, status, category, paymentMode, userId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => expenseService.list({ page: pageParam, search, status, category, paymentMode, userId }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined)
  });
  const insightsQuery = useQuery({ queryKey: ["expense-insights"], queryFn: expenseService.allForReports });

  const expenses = useMemo(() => query.data?.pages.flatMap((page) => page.items) || [], [query.data]);
  const totalRecords = query.data?.pages[0]?.total ?? expenses.length;
  const allExpenses = insightsQuery.data || [];
  const users = useMemo(() => uniqueUsers(allExpenses), [allExpenses]);
  const selectedUser = useMemo(
    () => users.find((u) => [u._id, u.id, u.authUid].includes(userId)),
    [userId, users]
  );
  const scopedExpenses = useMemo(
    () => allExpenses.filter((expense) => matchesActiveFilters(expense, { search, status, category, paymentMode, userId })),
    [allExpenses, search, status, category, paymentMode, userId]
  );
  const filteredTotal = useMemo(
    () => scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [scopedExpenses]
  );
  const sheetFilterCount = [category, paymentMode, userId].filter((item) => item && item !== "all").length;

  const settlementUsers = useMemo(() => {
    if (!canSettleTeam) return [];
    return users.filter((teamUser) => {
      const id = userDocId(teamUser);
      if (!id || [user?._id, user?.id, user?.authUid].includes(id)) return false;
      return allExpenses.some((expense) => ownerIdOf(expense) === id && expense.status === "approved" && expense.remainingAmount > 0);
    });
  }, [allExpenses, canSettleTeam, user?._id, user?.authUid, user?.id, users]);
  const activeSettlementUserId = useMemo(() => {
    if (!canSettleTeam) return user?._id || "";
    if (settlementUserId && settlementUsers.some((teamUser) => userDocId(teamUser) === settlementUserId)) return settlementUserId;
    if (userId !== "all" && settlementUsers.some((teamUser) => userDocId(teamUser) === userId)) return userId;
    return userDocId(settlementUsers[0]);
  }, [canSettleTeam, settlementUserId, settlementUsers, user?._id, userId]);
  const activeSettlementUser = useMemo(
    () => settlementUsers.find((teamUser) => userDocId(teamUser) === activeSettlementUserId),
    [activeSettlementUserId, settlementUsers]
  );
  const settlementExpenses = useMemo(
    () => allExpenses.filter((expense) => ownerIdOf(expense) === activeSettlementUserId),
    [activeSettlementUserId, allExpenses]
  );
  const approvedUnpaidForSettlement = useMemo(
    () => settlementExpenses.filter((e) => e.status === "approved" && e.remainingAmount > 0),
    [settlementExpenses]
  );
  const settlementSummary = useMemo(() => summarizeSettlement(settlementExpenses), [settlementExpenses]);
  const walletQuery = useQuery({
    queryKey: ["settlement-wallet", activeSettlementUserId],
    queryFn: () => expenseService.listSettlements(activeSettlementUserId),
    enabled: Boolean(activeSettlementUserId)
  });
  const walletBalance = useMemo(
    () => (walletQuery.data || []).reduce((sum, item) => sum + Math.max(0, item.unallocatedAmount || 0), 0),
    [walletQuery.data]
  );

  const settlement = useMutation({
    mutationFn: expenseService.settleReceivedAmount,
    onSuccess: (result) => {
      setSettlementResult(result);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-insights"] });
      queryClient.invalidateQueries({ queryKey: ["reviewer-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["all-expenses-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["settlement-wallet"] });
    },
    onError: (error) => Alert.alert("Settlement failed", error instanceof Error ? error.message : "Please try again.")
  });

  const listHeader = (
    <>
      <ScreenHeader
        title="Expenses"
        subtitle={selectedUser ? `${totalRecords} records for ${selectedUser.name}` : `${totalRecords} records in your ledger`}
        right={<AccountButton />}
      />

      <HeroMetricCard
        eyebrow="Ledger view"
        label={selectedUser ? selectedUser.name : "Filtered spend"}
        value={currency(filteredTotal)}
        sublabel={`${scopedExpenses.length} matching record${scopedExpenses.length !== 1 ? "s" : ""}`}
        right={
          <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: c.primarySoft }}>
            <ReceiptText size={24} color={c.primary} strokeWidth={1.9} />
          </View>
        }
      />

      <MotionView delay={60} direction="up" style={{ marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search ledger" />
        </View>
        <MotionPressable
          onPress={() => setFiltersOpen(true)}
          haptic
          pressScale={0.9}
          accessibilityRole="button"
          accessibilityLabel={sheetFilterCount ? `Open filters, ${sheetFilterCount} active` : "Open filters"}
          style={[{ width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: sheetFilterCount ? c.primarySoft : c.surfaceStrong, borderWidth: 1, borderColor: sheetFilterCount ? c.primary : c.border }, glass]}
        >
          <SlidersHorizontal size={19} color={sheetFilterCount ? c.primary : c.text} strokeWidth={2.1} />
          {sheetFilterCount ? (
            <MotionView direction="scale" style={{ position: "absolute", right: -2, top: -2, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: c.background, alignItems: "center", justifyContent: "center", backgroundColor: c.primary }}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: c.onPrimary }}>{sheetFilterCount}</Text>
            </MotionView>
          ) : null}
        </MotionPressable>
      </MotionView>

      <StatusSegmentControl value={status} onChange={setStatus} />

      <MySettlementCard
        summary={settlementSummary}
        walletBalance={walletBalance}
        hasApprovedExpenses={canSettleTeam && approvedUnpaidForSettlement.length > 0}
        canSettleTeam={canSettleTeam}
        selectedUserName={activeSettlementUser?.name || user?.name || "Me"}
        eligibleUserCount={canSettleTeam ? settlementUsers.length : undefined}
        onOpen={() => {
          setSettlementResult(null);
          setSettlementUserId(activeSettlementUserId);
          setSettlementOpen(true);
        }}
      />

      <AdvancedExpenseInsights expenses={scopedExpenses} loading={insightsQuery.isLoading} />
      <FinanceSectionHeader title="Expense activity" subtitle="Sorted by newest first" top={8} />
    </>
  );

  const emptyContent = query.isLoading ? (
    <LoadingSkeleton />
  ) : query.isError ? (
    <ErrorState message={query.error.message} onAction={() => query.refetch()} />
  ) : (
    <EmptyState title="No expenses found" message="Try another filter or add a new company expense." />
  );

  return (
    <ListScreen scrollY={scrollY}>
      <Animated.FlatList
        data={query.isLoading || query.isError ? [] : expenses}
        key={`cols-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ flex: 1, minWidth: 0 }}>
            <ExpenseCard expense={item} onPress={() => router.push(`/expenses/${item._id}`)} />
          </View>
        )}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyContent}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={8}
        initialNumToRender={10}
        ListFooterComponent={query.isFetchingNextPage ? <Text style={{ paddingVertical: 18, textAlign: "center", color: c.muted, fontSize: 14, fontWeight: "600" }}>Loading more...</Text> : null}
      />
      <FilterSheet
        visible={filtersOpen}
        status={status}
        category={category}
        paymentMode={paymentMode}
        userId={userId}
        users={users}
        onStatus={setStatus}
        onCategory={setCategory}
        onPaymentMode={setPaymentMode}
        onUserId={setUserId}
        onReset={reset}
        onClose={() => setFiltersOpen(false)}
      />
      <SettlementSheet
        visible={settlementOpen}
        loading={settlement.isPending}
        result={settlementResult}
        approvedExpenses={approvedUnpaidForSettlement}
        users={settlementUsers}
        canSelectUser={canSettleTeam}
        selectedUserId={activeSettlementUserId}
        onSelectUser={setSettlementUserId}
        onClose={() => {
          setSettlementOpen(false);
          setSettlementResult(null);
          settlement.reset();
        }}
        onSubmit={(payload) => settlement.mutate({ ...payload, userId: canSettleTeam ? activeSettlementUserId : undefined })}
      />
    </ListScreen>
  );
};

// --- My Settlement Card -----------------------------------------------------

const MySettlementCard = ({
  summary,
  walletBalance,
  hasApprovedExpenses,
  canSettleTeam,
  selectedUserName,
  eligibleUserCount,
  onOpen
}: {
  summary: ReturnType<typeof summarizeSettlement>;
  walletBalance: number;
  hasApprovedExpenses: boolean;
  canSettleTeam?: boolean;
  selectedUserName: string;
  eligibleUserCount?: number;
  onOpen: () => void;
}) => {
  const c = useThemeColors();
  return (
    <PremiumCard compact delay={120} style={{ marginBottom: 16, padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.muted }}>
            {canSettleTeam ? "Team payment due" : "Balance owed to me"}
          </Text>
          <Text style={{ marginTop: 3, fontSize: 28, fontWeight: "800", letterSpacing: -0.8, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
            {currency(summary.approvedUnpaid)}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "500", color: c.muted }} numberOfLines={1}>
            {canSettleTeam
              ? `${selectedUserName}${eligibleUserCount !== undefined ? ` · ${eligibleUserCount} eligible users` : ""}`
              : "Approved expenses ready for settlement"}
          </Text>
        </View>
        {hasApprovedExpenses ? (
          <PrimaryButton label="Record" compact onPress={onOpen} />
        ) : null}
      </View>
      <View
        style={{
          marginTop: 16,
          borderRadius: 16,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: walletBalance > 0 ? c.primary : "transparent",
          backgroundColor: walletBalance > 0 ? c.primarySoft : c.surfaceStrong,
          padding: 14
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: walletBalance > 0 ? c.primary : c.surfaceMuted }}>
            <WalletCards color={walletBalance > 0 ? c.onPrimary : c.primary} size={21} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", color: walletBalance > 0 ? c.primary : c.muted }}>
              Wallet credit
            </Text>
            <Text style={{ marginTop: 2, fontSize: 24, lineHeight: 29, fontWeight: "800", letterSpacing: -0.6, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
              {currency(walletBalance)}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: "500", color: c.muted }} numberOfLines={2}>
              {walletBalance > 0 ? "Advance amount available for this employee." : "Extra paid amount will appear here."}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        <MetricPill label="Partial" value={currency(summary.partiallyPaid)} tone="warning" />
        <MetricPill label="This month" value={currency(summary.paidThisMonth)} tone="primary" />
      </View>
    </PremiumCard>
  );
};

// --- Settlement Sheet --------------------------------------------------------

const allocationModes: { value: AllocationMode; label: string }[] = [
  { value: "oldest_first", label: "Oldest first" },
  { value: "newest_first", label: "Newest first" },
  { value: "highest_amount_first", label: "Highest first" }
];

const SettlementSheet = ({
  visible,
  loading,
  result,
  approvedExpenses,
  users,
  canSelectUser,
  selectedUserId,
  onSelectUser,
  onClose,
  onSubmit
}: {
  visible: boolean;
  loading: boolean;
  result: PaymentSettlement | null;
  approvedExpenses: Expense[];
  users: User[];
  canSelectUser: boolean;
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  onClose: () => void;
  onSubmit: (payload: { receivedAmount: string; paymentDate: string; paymentMode?: PaymentMode | ""; referenceNote?: string; allocationMode?: AllocationMode }) => void;
}) => {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [receivedAmount, setReceivedAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayDateKey());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | "">("");
  const [referenceNote, setReferenceNote] = useState("");
  const [allocationMode, setAllocationMode] = useState<AllocationMode>("oldest_first");

  const amount = toAmount(receivedAmount);
  const selectedDate = parseDateKey(paymentDate) || new Date();
  const approvedBalance = useMemo(
    () => approvedExpenses.reduce((sum, expense) => sum + Math.max(0, expense.remainingAmount), 0),
    [approvedExpenses]
  );

  const preview = useMemo(
    () => amount > 0 ? allocateSettlement(approvedExpenses, amount, allocationMode) : null,
    [amount, approvedExpenses, allocationMode]
  );
  const previewRemainingBalance = preview ? Math.max(0, approvedBalance - preview.allocatedAmount) : approvedBalance;

  useEffect(() => {
    if (visible) {
      setReceivedAmount("");
      setPaymentDate(todayDateKey());
      setDatePickerOpen(false);
      setPaymentMode("");
      setReferenceNote("");
      setAllocationMode("oldest_first");
    }
  }, [visible]);

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setDatePickerOpen(false);
    if (event.type === "dismissed" || !date) return;
    setPaymentDate(formatDateKey(date));
  };

  return (
    <AdaptiveSheet visible={visible} onClose={onClose} scroll={false}>
        <View style={{ maxHeight: "100%", paddingBottom: Math.max(insets.bottom, 20) }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider }}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", letterSpacing: -0.4, color: c.text }}>Record payment</Text>
              <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "500", color: c.muted }}>
                {canSelectUser ? "Select employee and allocate payment" : `${approvedExpenses.length} approved expense${approvedExpenses.length !== 1 ? "s" : ""} eligible`}
              </Text>
            </View>
            <MotionPressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" pressScale={0.9} hitSlop={6} style={{ width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceMuted }}>
              <X size={17} color={c.muted} strokeWidth={2.6} />
            </MotionPressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingBottom: 8 }}>
            {result ? (
              <SettlementResultView result={result} onClose={onClose} />
            ) : (
              <>
                {canSelectUser ? (
                  <>
                    <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "700", color: c.textSoft }}>Employee to settle</Text>
                    {users.length ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                        {users.map((teamUser) => {
                          const id = userDocId(teamUser);
                          const active = selectedUserId === id;
                          return (
                            <MotionPressable
                              key={id}
                              onPress={() => onSelectUser(id)}
                              haptic
                              pressScale={0.95}
                              accessibilityRole="button"
                              accessibilityState={{ selected: active }}
                              style={{
                                minHeight: 52,
                                minWidth: 136,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: active ? c.primary : c.border,
                                backgroundColor: active ? c.primarySoft : c.surfaceStrong,
                                paddingHorizontal: 14,
                                justifyContent: "center"
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: "700", color: active ? c.primary : c.text }} numberOfLines={1}>
                                {teamUser.name || teamUser.email}
                              </Text>
                              <Text style={{ marginTop: 2, fontSize: 12, fontWeight: "600", color: c.muted }} numberOfLines={1}>
                                {teamUser.department || teamUser.role}
                              </Text>
                            </MotionPressable>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <Text style={{ marginBottom: 16, fontSize: 13, fontWeight: "600", color: c.warning }}>
                        No employees have approved unpaid expenses right now.
                      </Text>
                    )}
                  </>
                ) : null}

                {/* Amount */}
                <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "700", color: c.textSoft }}>Amount received from organization</Text>
                <View style={{ marginBottom: 18 }}>
                  <FieldSurface focused={amount > 0} radius={16} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 18 }}>
                    <Text style={{ marginRight: 8, fontSize: 28, fontWeight: "700", color: amount > 0 ? c.text : c.muted }}>₹</Text>
                    <TextInput
                      value={receivedAmount}
                      onChangeText={(v) => setReceivedAmount(v.replace(/[^\d.]/g, ""))}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      style={{ flex: 1, fontSize: 30, fontWeight: "800", letterSpacing: -0.8, color: c.text, paddingVertical: 0, fontVariant: ["tabular-nums"] }}
                      placeholderTextColor={c.muted}
                      selectionColor={c.primary}
                    />
                  </FieldSurface>
                </View>

                {/* Allocation mode */}
                <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "700", color: c.textSoft }}>Allocate to expenses</Text>
                <SelectionControl label="Allocation order" value={allocationMode} onChange={setAllocationMode} options={allocationModes} style={{ marginBottom: 18 }} />

                {/* Live preview */}
                {preview && preview.allocations.length > 0 ? (
                  <>
                    <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "700", color: c.textSoft }}>Allocation preview</Text>
                    <PremiumCard compact style={{ marginBottom: 16 }}>
                      <View style={{ marginBottom: 12, flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <MetricPill label="Balance" value={currency(approvedBalance)} tone="warning" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <MetricPill label="Allocated" value={currency(preview.allocatedAmount)} tone="primary" />
                        </View>
                      </View>
                      <View style={{ marginBottom: 8, flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <MetricPill label="After payment" value={currency(previewRemainingBalance)} tone={previewRemainingBalance > 0 ? "warning" : "success"} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <MetricPill label="Records" value={String(preview.allocations.length)} tone="neutral" />
                        </View>
                      </View>
                      {preview.allocations.map((item) => (
                        <View key={item.expenseId} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }} numberOfLines={1}>{item.expenseTitle}</Text>
                            <Text style={{ marginTop: 1, fontSize: 12, fontWeight: "500", color: c.muted }}>
                              {currency(item.previousPaidAmount)} to {currency(item.newPaidAmount)} of {currency(item.expenseAmount)}
                            </Text>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 14, fontWeight: "800", color: c.primary, fontVariant: ["tabular-nums"] }}>+{currency(item.allocatedAmount)}</Text>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: item.settlementStatus === "paid" ? c.success : c.warning }}>
                              {item.settlementStatus === "paid" ? "Fully paid" : `${currency(item.remainingAmount)} left`}
                            </Text>
                          </View>
                        </View>
                      ))}
                      {preview.unallocatedAmount > 0 ? (
                        <View style={{ paddingTop: 10, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider }}>
                          <Text style={{ fontSize: 12, lineHeight: 17, fontWeight: "700", color: c.warning }}>
                            {currency(preview.unallocatedAmount)} will be added to this employee's wallet.
                          </Text>
                          <Text style={{ marginTop: 2, fontSize: 11, lineHeight: 16, fontWeight: "600", color: c.muted }}>
                            The entered amount is higher than the approved open balance, so the extra amount is tracked as advance credit.
                          </Text>
                        </View>
                      ) : null}
                    </PremiumCard>
                  </>
                ) : amount > 0 ? (
                  <Text style={{ marginBottom: 16, fontSize: 13, fontWeight: "600", color: c.warning }}>No approved unpaid expenses to allocate. Submit first, then record payment once approved.</Text>
                ) : null}

                {/* Payment date */}
                <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "700", color: c.textSoft }}>Payment date</Text>
                <MotionPressable
                  onPress={() => setDatePickerOpen(true)}
                  haptic
                  pressScale={0.98}
                  accessibilityRole="button"
                  style={{ marginBottom: 18, minHeight: 60, flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceStrong, paddingHorizontal: 12 }}
                >
                  <View style={{ marginRight: 12, width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.primarySoft }}>
                    <CalendarDays color={c.primary} size={18} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>{formatReadableDateKey(paymentDate) || paymentDate}</Text>
                    <Text style={{ marginTop: 2, fontSize: 12, fontWeight: "500", color: c.muted }}>Date you received the payment</Text>
                  </View>
                  <View style={{ borderRadius: 10, backgroundColor: c.primarySoft, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>Change</Text>
                  </View>
                </MotionPressable>
                {datePickerOpen ? (
                  <View style={{ marginBottom: 16, overflow: "hidden", borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceStrong }}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      maximumDate={new Date()}
                      onChange={onDateChange}
                    />
                    {Platform.OS === "ios" ? (
                      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider, padding: 12 }}>
                        <PrimaryButton label="Done" onPress={() => setDatePickerOpen(false)} variant="ghost" compact />
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Payment mode */}
                <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "700", color: c.textSoft }}>Payment mode</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                  {(["", ...paymentModes] as const).map((mode) => {
                    const active = paymentMode === mode;
                    return (
                      <MotionPressable hitSlop={4}
                        key={mode || "none"}
                        onPress={() => setPaymentMode(mode as PaymentMode | "")}
                        haptic
                        pressScale={0.94}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={{ height: 38, minWidth: 64, alignItems: "center", justifyContent: "center", borderRadius: 10, paddingHorizontal: 16, backgroundColor: active ? c.primary : c.surfaceMuted }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: active ? "700" : "600", color: active ? c.onPrimary : c.text }}>{mode || "Not set"}</Text>
                      </MotionPressable>
                    );
                  })}
                </ScrollView>

                {/* Reference note */}
                <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "700", color: c.textSoft }}>Reference / note</Text>
                <View style={{ marginBottom: 22 }}>
                  <FieldSurface style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                    <TextInput
                      value={referenceNote}
                      onChangeText={setReferenceNote}
                      placeholder="UTR number, bank ref, or any note"
                      placeholderTextColor={c.muted}
                      selectionColor={c.primary}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={{ minHeight: 64, fontSize: 16, color: c.text }}
                    />
                  </FieldSurface>
                </View>

                <PrimaryButton
                  label={
                    amount <= 0
                      ? "Enter amount to record"
                      : preview && preview.allocations.length > 0
                        ? `Record ${currency(amount)} received`
                        : "No eligible expenses"
                  }
                  loading={loading}
                  disabled={amount <= 0 || !preview || preview.allocations.length === 0}
                  onPress={() => onSubmit({ receivedAmount, paymentDate, paymentMode, referenceNote: referenceNote.trim() || undefined, allocationMode })}
                />
              </>
            )}
          </ScrollView>
        </View>
    </AdaptiveSheet>
  );
};

// --- Settlement Result View -------------------------------------------------

const SettlementResultView = ({ result, onClose }: { result: PaymentSettlement; onClose: () => void }) => {
  const c = useThemeColors();
  const fullPaid = result.allocations.filter((item) => item.settlementStatus === "paid").length;
  const partialPaid = result.allocations.filter((item) => item.settlementStatus === "partially_paid").length;

  return (
    <View>
      <MotionView direction="scale" style={{ alignItems: "center", borderRadius: 18, backgroundColor: c.successSoft, padding: 22, marginBottom: 16 }}>
        <CheckCircle2 color={c.success} size={40} strokeWidth={1.9} />
        <Text style={{ marginTop: 10, fontSize: 13, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.success }}>Payment recorded</Text>
        <Text style={{ marginTop: 6, fontSize: 36, fontWeight: "800", letterSpacing: -1.2, color: c.text, fontVariant: ["tabular-nums"] }}>{currency(result.receivedAmount)}</Text>
        <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "500", color: c.muted }}>received from organization</Text>
      </MotionView>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <View style={{ flex: 1 }}><MetricPill label="Allocated" value={currency(result.allocatedAmount)} tone="primary" /></View>
        {result.unallocatedAmount > 0 ? (
          <View style={{ flex: 1 }}><MetricPill label="Wallet credit" value={currency(result.unallocatedAmount)} tone="warning" /></View>
        ) : null}
      </View>
      {result.unallocatedAmount > 0 ? (
        <Text style={{ marginTop: -8, marginBottom: 12, fontSize: 12, lineHeight: 17, fontWeight: "700", color: c.muted }}>
          Extra amount is visible to the employee as wallet/advance balance.
        </Text>
      ) : null}
      <Text style={{ marginBottom: 12, fontSize: 13, fontWeight: "600", color: c.muted }}>
        {fullPaid} expense{fullPaid !== 1 ? "s" : ""} fully settled · {partialPaid} partial
      </Text>
      {result.allocations.map((item) => (
        <View key={item.expenseId} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }} numberOfLines={1}>{item.expenseTitle}</Text>
            <Text style={{ fontSize: 11, fontWeight: "500", color: c.muted }}>{currency(item.newPaidAmount)} of {currency(item.expenseAmount)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>+{currency(item.allocatedAmount)}</Text>
            <Text style={{ fontSize: 10, fontWeight: "700", color: item.settlementStatus === "paid" ? c.success : c.warning }}>
              {item.settlementStatus === "paid" ? "Fully paid" : "Partial"}
            </Text>
          </View>
        </View>
      ))}
      <View style={{ marginTop: 20 }}>
        <PrimaryButton label="Done" onPress={onClose} />
      </View>
    </View>
  );
};

// --- Advanced Expense Insights -----------------------------------------------

const AdvancedExpenseInsights = ({ expenses, loading }: { expenses: Expense[]; loading: boolean }) => {
  const c = useThemeColors();
  if (loading || expenses.length === 0) return null;

  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const statusTotals = {
    pending_manager: sumBy(expenses, "status", "pending_manager"),
    approved: sumBy(expenses, "status", "approved"),
    paid: sumBy(expenses, "status", "paid"),
    rejected: sumBy(expenses, "status", "rejected")
  };
  return (
    <PremiumCard compact delay={180} style={{ marginBottom: 16, padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.muted }}>Filtered total</Text>
          <Text style={{ marginTop: 3, fontSize: 26, fontWeight: "800", letterSpacing: -0.7, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
            {currency(total)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>{expenses.length} records</Text>
          <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "600", color: c.warning }}>
            {countBy(expenses, "status", "pending_manager")} pending
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 14 }}>
        <SegmentedProgress
          segments={[
            { value: statusTotals.pending_manager, color: chartColors.pending },
            { value: statusTotals.approved, color: chartColors.approved },
            { value: statusTotals.paid, color: chartColors.paid },
            { value: statusTotals.rejected, color: chartColors.rejected }
          ]}
        />
      </View>
      <View style={{ marginTop: 14, flexDirection: "row", gap: 8 }}>
        <MetricPill label="Pending" value={currency(statusTotals.pending_manager)} tone="warning" />
        <MetricPill label="Paid" value={currency(statusTotals.paid)} tone="primary" />
      </View>
    </PremiumCard>
  );
};

// --- Helpers -----------------------------------------------------------------

const StatusSegmentControl = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  return <SelectionControl label="Expense status" value={value} onChange={onChange} scroll options={
    ["all", "pending_manager", "approved", "paid", "rejected"].map(item => ({ value: item, label: filterLabel(item) }))
  } />;
};

const filterLabel = (label: string) => {
  if (label === "all") return "All";
  if (label === "partially_paid") return "Partial";
  if (label === "pending_manager") return "Pending";
  return label.replace("_", " ").replace(/^./, (char) => char.toUpperCase());
};

const sumBy = <K extends keyof Expense>(expenses: Expense[], key: K, value: Expense[K]) =>
  expenses.filter((item) => item[key] === value).reduce((sum, item) => sum + item.amount, 0);

const countBy = <K extends keyof Expense>(expenses: Expense[], key: K, value: Expense[K]) =>
  expenses.filter((item) => item[key] === value).length;

const ownerIdOf = (expense: Expense) =>
  typeof expense.userId === "object"
    ? (expense.userId as User)._id || (expense.userId as User).id || ""
    : expense.userId;

const ownerOf = (expense: Expense) =>
  typeof expense.userId === "object" ? (expense.userId as User) : undefined;

const userDocId = (user?: User) => user?._id || user?.id || user?.authUid || "";

const uniqueUsers = (expenses: Expense[]) => {
  const users = new Map<string, User>();
  expenses.forEach((expense) => {
    const user = ownerOf(expense);
    const id = userDocId(user);
    if (user && id) users.set(id, user);
  });
  return Array.from(users.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const matchesActiveFilters = (
  expense: Expense,
  filters: { search: string; status: string; category: string; paymentMode: string; userId: string }
) => {
  const statusOk = filters.status === "all" || expense.status === filters.status || expense.settlementStatus === filters.status;
  const categoryOk = filters.category === "all" || expense.category === filters.category;
  const paymentOk = filters.paymentMode === "all" || expense.paymentMode === filters.paymentMode;
  const userOk = filters.userId === "all" || ownerIdOf(expense) === filters.userId;
  const user = ownerOf(expense);
  const term = filters.search.trim().toLowerCase();
  const searchOk =
    !term ||
    [expense.projectName, expense.clientName, expense.description, expense.category, expense.paymentMode, user?.name, user?.department, user?.email]
      .filter(Boolean)
      .some((item) => String(item).toLowerCase().includes(term));

  return statusOk && categoryOk && paymentOk && userOk && searchOk;
};

const summarizeSettlement = (expenses: Expense[]) => {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const approvedOpen = expenses.filter((e) => e.status === "approved" && e.remainingAmount > 0);
  const partial = expenses.filter((e) => e.settlementStatus === "partially_paid");
  const paidThisMonth = expenses.filter((e) =>
    e.settlementStatus === "paid" && (e.paidAt || e.lastSettledAt || "").slice(0, 7) === nowMonth
  );

  return {
    approvedUnpaid: approvedOpen.reduce((sum, e) => sum + e.remainingAmount, 0),
    partiallyPaid: partial.reduce((sum, e) => sum + e.paidAmount, 0),
    paidThisMonth: paidThisMonth.reduce((sum, e) => sum + e.paidAmount, 0)
  };
};
