import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, UseMutationResult, useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarDays, Download, FileSpreadsheet, PieChart, TrendingUp, X } from "lucide-react-native";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { paymentMeta } from "../../constants/categoryMeta";
import { AccountButton } from "../../components/shared/AccountButton";
import { AppContainer } from "../../components/shared/AppContainer";
import { ErrorState } from "../../components/shared/ErrorState";
import { DonutChart, FinanceSectionHeader, HeroMetricCard, MetricPill, MiniBarChart, PremiumCard, ProgressBar, SegmentedProgress } from "../../components/shared/FinanceUI";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { ScreenHeader } from "../../components/shared/ScreenHeader";
import { SelectionControl } from "../../components/shared/SelectionControl";
import { ChoiceChip } from "../../components/ui/ChoiceChip";
import { FormField } from "../../components/ui/FormField";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { chartColors, seriesColors, statuses } from "../../constants/theme";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { useThemeColors } from "../../hooks/useTheme";
import { expenseService } from "../../services/expense.service";
import { ReportFilters, reportService } from "../../services/report.service";
import { Expense, User } from "../../types";
import { formatDateKey, formatReadableDateKey, parseDateKey } from "../../utils/dates";
import { currency } from "../../utils/formatters";

type Segment = "summary" | "analytics";
type StatusSummary = Record<string, { count: number; total: number }>;
type SummaryViewProps = {
  byStatus: StatusSummary;
  total: number;
  count: number;
  filters: ReportFilters;
  setFilters: Dispatch<SetStateAction<ReportFilters>>;
  stackDates: boolean;
  openDatePicker: "from" | "to" | null;
  setOpenDatePicker: Dispatch<SetStateAction<"from" | "to" | null>>;
  pickerDate: Date;
  fromDate?: Date;
  toDate?: Date;
  dateRangeError?: string;
  setDateRangeError: Dispatch<SetStateAction<string | undefined>>;
  onDateChange: (event: DateTimePickerEvent, date?: Date) => void;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  isFetching: boolean;
  exportMutation: UseMutationResult<string, Error, "pdf" | "csv">;
  users: User[];
  canFilterUsers: boolean;
};

const CATEGORY_COLORS = seriesColors;

const PAYMENT_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(paymentMeta).map(([mode, meta]) => [mode, meta.tint])
);

export const ReportsScreen = () => {
  const [activeSegment, setActiveSegment] = useState<Segment>("summary");
  const [filters, setFilters] = useState<ReportFilters>({});
  const [openDatePicker, setOpenDatePicker] = useState<"from" | "to" | null>(null);
  const [dateRangeError, setDateRangeError] = useState<string>();
  const { width } = useWindowDimensions();
  const stackDates = width < 430;

  const query = useQuery({ queryKey: ["reports", filters], queryFn: () => reportService.summary(filters) });
  const allExpensesQuery = useQuery({
    queryKey: ["all-expenses-analytics"],
    queryFn: expenseService.allForReports,
    staleTime: 30_000
  });

  const exportMutation = useMutation({
    mutationFn: (type: "pdf" | "csv") => reportService.exportFile(type, filters),
    onError: (error) => Alert.alert("Export failed", error.message)
  });

  const summary: Array<{ _id: string; count: number; total: number }> = query.data?.summary || [];
  const byStatus = summary.reduce<StatusSummary>((acc, item) => {
    acc[item._id] = { count: item.count, total: item.total };
    return acc;
  }, {});
  const fromDate = parseDateKey(filters.from);
  const toDate = parseDateKey(filters.to);
  const pickerDate = openDatePicker === "from" ? fromDate || toDate || new Date() : toDate || fromDate || new Date();

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setOpenDatePicker(null);
    if (event.type === "dismissed" || !openDatePicker || !date) return;
    const formatted = formatDateKey(date);
    setDateRangeError(undefined);
    if (openDatePicker === "from" && filters.to && formatted > filters.to) {
      setDateRangeError("Start date cannot be after the end date.");
      return;
    }
    if (openDatePicker === "to" && filters.from && formatted < filters.from) {
      setDateRangeError("End date cannot be before the start date.");
      return;
    }
    setFilters((prev) => ({ ...prev, [openDatePicker]: formatted }));
  };

  const allExpenses = allExpensesQuery.data || [];
  const reportUsers = useMemo(() => uniqueReportUsers(allExpenses), [allExpenses]);
  const filteredAnalyticsExpenses = useMemo(
    () => filterReportExpenses(allExpenses, filters),
    [allExpenses, filters]
  );

  // Analytics derived data
  const analytics = useMemo(() => {
    const expenses = filteredAnalyticsExpenses;
    const total = expenses.reduce((s, e) => s + e.amount, 0);

    // Category breakdown
    const catMap = new Map<string, { label: string; count: number; total: number }>();
    expenses.forEach((e) => {
      const cur = catMap.get(e.category) || { label: e.category, count: 0, total: 0 };
      cur.count += 1;
      cur.total += e.amount;
      catMap.set(e.category, cur);
    });
    const categories = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

    // Monthly breakdown (last 6 months)
    const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short" });
    const monthMap = new Map<string, { label: string; total: number; count: number; sortKey: string }>();
    expenses.forEach((e) => {
      const d = new Date(e.date || e.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(sortKey) || { label: monthFmt.format(d), total: 0, count: 0, sortKey };
      cur.total += e.amount;
      cur.count += 1;
      monthMap.set(sortKey, cur);
    });
    const months = Array.from(monthMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-6);

    // Payment mode breakdown
    const pmMap = new Map<string, { label: string; total: number; count: number }>();
    expenses.forEach((e) => {
      const cur = pmMap.get(e.paymentMode) || { label: e.paymentMode, total: 0, count: 0 };
      cur.total += e.amount;
      cur.count += 1;
      pmMap.set(e.paymentMode, cur);
    });
    const paymentModes = Array.from(pmMap.values()).sort((a, b) => b.total - a.total);

    return { categories, months, paymentModes, total, count: expenses.length };
  }, [filteredAnalyticsExpenses]);

  return (
    <AppContainer>
      <ScreenHeader title="Reports" subtitle="Summary, analytics & export" right={<AccountButton />} />

      <SelectionControl label="Report view" value={activeSegment} onChange={setActiveSegment} options={[
        { value: "summary", label: "Summary", icon: BarChart3 },
        { value: "analytics", label: "Analytics", icon: PieChart },
      ]} />

      {activeSegment === "summary" ? (
        <SummaryView
          byStatus={byStatus}
          total={query.data?.total || 0}
          count={query.data?.items?.length || 0}
          filters={filters}
          setFilters={setFilters}
          stackDates={stackDates}
          openDatePicker={openDatePicker}
          setOpenDatePicker={setOpenDatePicker}
          pickerDate={pickerDate}
          fromDate={fromDate}
          toDate={toDate}
          dateRangeError={dateRangeError}
          setDateRangeError={setDateRangeError}
          onDateChange={onDateChange}
          isError={query.isError}
          errorMessage={query.error?.message}
          onRetry={() => query.refetch()}
          isFetching={query.isFetching}
          exportMutation={exportMutation}
          users={reportUsers}
          canFilterUsers={reportUsers.length > 1}
        />
      ) : (
        <AnalyticsView analytics={analytics} isLoading={allExpensesQuery.isLoading} />
      )}
    </AppContainer>
  );
};

// --- Summary Tab -------------------------------------------------------------

const SummaryView = ({
  byStatus, total, count, filters, setFilters, stackDates,
  openDatePicker, setOpenDatePicker, pickerDate, fromDate, toDate,
  dateRangeError, setDateRangeError, onDateChange,
  isError, errorMessage, onRetry, isFetching, exportMutation,
  users, canFilterUsers
}: SummaryViewProps) => {
  const c = useThemeColors();
  const selectedUser = users.find((item) => userDocId(item) === filters.userId);
  return (
    <>
      <HeroMetricCard
        eyebrow="Report total"
        label="Matched spend"
        value={currency(total)}
        sublabel={`${count} expenses matched`}
        right={
          <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: c.primarySoft }}>
            <BarChart3 size={24} color={c.primary} strokeWidth={2} />
          </View>
        }
        footer={
          <>
            <SegmentedProgress
              segments={[
                { value: byStatus.pending_manager?.total || 0, color: chartColors.pending },
                { value: byStatus.approved?.total || 0, color: chartColors.approved },
                { value: byStatus.paid?.total || 0, color: chartColors.paid },
                { value: byStatus.rejected?.total || 0, color: chartColors.rejected }
              ]}
            />
            <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {[
                { label: "Pending", color: chartColors.pending },
                { label: "Approved", color: chartColors.approved },
                { label: "Paid", color: chartColors.paid },
                { label: "Rejected", color: chartColors.rejected }
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.muted }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </>
        }
      />

      <FinanceSectionHeader title="Filters" subtitle="Refine by user, date, project, category, or status" top={2} />
      <PremiumCard style={{ marginBottom: 16, padding: 18 }}>
        {canFilterUsers ? (
          <View style={{ marginBottom: 18 }}>
            <View style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <Text style={s.fieldLabel(c.muted)}>Employee</Text>
              {selectedUser ? (
                <MotionPressable onPress={() => setFilters((prev) => ({ ...prev, userId: undefined }))} hitSlop={8} accessibilityRole="button">
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.primary }}>Clear</Text>
                </MotionPressable>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <ChoiceChip label="All users" active={!filters.userId} onPress={() => setFilters((prev) => ({ ...prev, userId: undefined }))} />
              {users.map((item) => {
                const id = userDocId(item);
                const active = filters.userId === id;
                return (
                  <ChoiceChip key={id} label={item.name || item.email || "Team member"} active={active} onPress={() => setFilters((prev) => ({ ...prev, userId: active ? undefined : id }))} />
                );
              })}
            </View>
          </View>
        ) : null}
        <View style={stackDates ? undefined : { flexDirection: "row", gap: 12 }}>
          <View style={stackDates ? undefined : { flex: 1 }}>
            <ReportDateField label="From" value={filters.from} onPress={() => setOpenDatePicker("from")} onClear={() => { setFilters((prev) => ({ ...prev, from: undefined })); setDateRangeError(undefined); }} />
          </View>
          <View style={stackDates ? undefined : { flex: 1 }}>
            <ReportDateField label="To" value={filters.to} onPress={() => setOpenDatePicker("to")} onClear={() => { setFilters((prev) => ({ ...prev, to: undefined })); setDateRangeError(undefined); }} />
          </View>
        </View>
        {dateRangeError ? <MotionView key={dateRangeError} direction="down"><Text style={{ marginTop: -8, marginBottom: 12, marginLeft: 4, fontSize: 12, fontWeight: "600", color: c.error }}>{dateRangeError}</Text></MotionView> : null}
        {openDatePicker ? (
          <MotionView direction="scale" style={{ marginBottom: 16, overflow: "hidden", borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.backgroundElevated, padding: Platform.OS === "ios" ? 8 : 0 }}>
            <DateTimePicker
              value={Number.isNaN(pickerDate.getTime()) ? new Date() : pickerDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={openDatePicker === "from" ? toDate : undefined}
              minimumDate={openDatePicker === "to" ? fromDate : undefined}
              accentColor={c.primary}
              onChange={onDateChange}
            />
            {Platform.OS === "ios" ? (
              <View style={{ marginTop: 8 }}>
                <PrimaryButton label="Done" onPress={() => setOpenDatePicker(null)} variant="secondary" compact />
              </View>
            ) : null}
          </MotionView>
        ) : null}
        <FormField label="Project" value={filters.projectName || ""} onChangeText={(projectName: string) => setFilters((prev) => ({ ...prev, projectName }))} placeholder="Optional" />
        <FormField label="Category" value={filters.category || ""} onChangeText={(category: string) => setFilters((prev) => ({ ...prev, category }))} placeholder="Travel, Food..." />
        <Text style={[s.fieldLabel(c.muted), { marginBottom: 10 }]}>Status</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {["", ...statuses].map((status) => (
            <ChoiceChip
              key={status || "all"}
              label={status ? (status === "pending_manager" ? "Pending" : status.replace("_", " ")) : "All"}
              capitalize
              active={(filters.status || "") === status}
              onPress={() => setFilters((prev) => ({ ...prev, status: status || undefined }))}
            />
          ))}
        </View>
      </PremiumCard>

      <FinanceSectionHeader title="Breakdown" subtitle="Status totals for selected report" top={4} />
      {isError ? (
        <ErrorState message={errorMessage || "Could not load the report."} onAction={onRetry} />
      ) : (
        <PremiumCard style={{ marginBottom: 16, padding: 18 }}>
          <View style={{ marginBottom: 18, flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><MetricPill label="Pending" value={String(byStatus.pending_manager?.count || 0)} tone="warning" /></View>
            <View style={{ flex: 1 }}><MetricPill label="Paid" value={String(byStatus.paid?.count || 0)} tone="primary" /></View>
          </View>
          <MiniBarChart
            height={110}
            data={[
              { label: "Pending", value: byStatus.pending_manager?.total || 0, color: chartColors.pending },
              { label: "Approved", value: byStatus.approved?.total || 0, color: chartColors.approved },
              { label: "Paid", value: byStatus.paid?.total || 0, color: chartColors.paid },
              { label: "Rejected", value: byStatus.rejected?.total || 0, color: chartColors.rejected }
            ]}
          />
          <View style={{ marginTop: 16 }}>
            <ReportRow label="Pending" color={chartColors.pending} count={byStatus.pending_manager?.count || 0} total={byStatus.pending_manager?.total || 0} />
            <ReportRow label="Approved" color={chartColors.approved} count={byStatus.approved?.count || 0} total={byStatus.approved?.total || 0} />
            <ReportRow label="Paid" color={chartColors.paid} count={byStatus.paid?.count || 0} total={byStatus.paid?.total || 0} />
            <ReportRow label="Rejected" color={chartColors.rejected} count={byStatus.rejected?.count || 0} total={byStatus.rejected?.total || 0} last />
          </View>
        </PremiumCard>
      )}

      <FinanceSectionHeader title="Export" subtitle="Generate a shareable report file" top={4} />
      <PremiumCard style={{ marginBottom: 16, padding: 18 }}>
        <View style={{ gap: 10 }}>
          <PrimaryButton label="Export PDF" onPress={() => exportMutation.mutate("pdf")} loading={exportMutation.isPending} disabled={isError} icon={<Download color={c.onPrimary} size={17} strokeWidth={2.3} />} />
          <PrimaryButton label="Export CSV" onPress={() => exportMutation.mutate("csv")} variant="secondary" disabled={isError} icon={<FileSpreadsheet color={c.primary} size={17} strokeWidth={2.2} />} />
        </View>
      </PremiumCard>

      {isFetching ? <MotionView><Text style={{ textAlign: "center", fontSize: 13, fontWeight: "600", color: c.muted }}>Refreshing...</Text></MotionView> : null}
    </>
  );
};

// --- Analytics Tab ------------------------------------------------------------

const AnalyticsView = ({
  analytics,
  isLoading
}: {
  analytics: {
    categories: { label: string; count: number; total: number }[];
    months: { label: string; total: number; count: number; sortKey: string }[];
    paymentModes: { label: string; total: number; count: number }[];
    total: number;
    count: number;
  };
  isLoading: boolean;
}) => {
  const c = useThemeColors();
  const { compact, fontScale } = useResponsiveLayout();

  if (isLoading) return <LoadingSkeleton />;

  const { categories, months, paymentModes, total, count } = analytics;

  const catDonutData = categories.slice(0, 6).map((cat, i) => ({
    label: cat.label,
    value: cat.total,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }));

  const pmDonutData = paymentModes.map((pm) => ({
    label: pm.label,
    value: pm.total,
    color: PAYMENT_COLORS[pm.label] || CATEGORY_COLORS[paymentModes.indexOf(pm)]
  }));

  const monthBarData = months.map((m, i) => ({
    label: m.label,
    value: m.total,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }));

  const topMonth = months.length ? months.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const topCategory = categories[0] || null;

  return (
    <>
      {/* Hero stats */}
      <HeroMetricCard
        eyebrow="Spend analytics"
        label="Total spend"
        value={currency(total)}
        sublabel={`${count} expenses · ${categories.length} categories`}
        right={
          <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: c.primarySoft }}>
            <TrendingUp size={24} color={c.primary} strokeWidth={2} />
          </View>
        }
        footer={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <MetricPill label="Top category" value={topCategory?.label || "-"} tone="primary" />
            </View>
            <View style={{ flex: 1 }}>
              <MetricPill label="Peak month" value={topMonth?.label || "-"} tone="warning" />
            </View>
          </View>
        }
      />

      {/* Category breakdown */}
      <FinanceSectionHeader title="By category" subtitle="Where is money being spent?" top={4} />
      <PremiumCard style={{ marginBottom: 16, padding: 18 }}>
        <View style={{ flexDirection: compact || fontScale > 1.3 ? "column" : "row", alignItems: "center", gap: 20 }}>
          <DonutChart
            size={140}
            strokeWidth={16}
            data={catDonutData.length ? catDonutData : [{ label: "None", value: 1, color: c.surfaceMuted }]}
            trackColor={c.surfaceMuted}
            center={
              <>
                <Text style={{ fontSize: 22, fontWeight: "800", color: c.text }}>{categories.length}</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 0.4, color: c.muted, textTransform: "uppercase" }}>Categories</Text>
              </>
            }
          />
          <View style={{ flex: 1, minWidth: 0, width: compact ? "100%" : undefined, gap: 10 }}>
            {categories.slice(0, 5).map((cat, i) => (
              <View key={cat.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: c.text }} numberOfLines={1}>{cat.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: "800", color: c.text, fontVariant: ["tabular-nums"] }}>{currency(cat.total)}</Text>
              </View>
            ))}
            {categories.length > 5 ? (
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.muted }}>+{categories.length - 5} more</Text>
            ) : null}
          </View>
        </View>

        {/* Category progress bars */}
        <View style={{ marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider, paddingTop: 16, gap: 12 }}>
          {categories.slice(0, 6).map((cat, i) => (
            <View key={cat.label}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: c.text }} numberOfLines={1}>{cat.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: c.muted }}>{cat.count}×</Text>
                <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] }}>{currency(cat.total)}</Text>
              </View>
              <ProgressBar value={cat.total} max={total} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} height={6} />
            </View>
          ))}
        </View>
      </PremiumCard>

      {/* Monthly trend */}
      <FinanceSectionHeader title="Monthly trend" subtitle="Spending pattern over the last 6 months" top={4} />
      <PremiumCard style={{ marginBottom: 16, padding: 18 }}>
        {months.length > 0 ? (
          <>
            <MiniBarChart data={monthBarData} height={130} />
            <View style={{ marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider, paddingTop: 14, gap: 10 }}>
              {months.map((m) => (
                <View key={m.sortKey} style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ width: 40, fontSize: 13, fontWeight: "700", color: c.muted }}>{m.label}</Text>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <ProgressBar
                      value={m.total}
                      max={Math.max(...months.map((x) => x.total), 1)}
                      color={c.primary}
                      height={6}
                    />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: c.text, minWidth: 64, textAlign: "right", fontVariant: ["tabular-nums"] }}>{currency(m.total)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={{ fontSize: 14, fontWeight: "500", color: c.muted, textAlign: "center", paddingVertical: 24 }}>No monthly data available.</Text>
        )}
      </PremiumCard>

      {/* Payment mode breakdown */}
      <FinanceSectionHeader title="By payment mode" subtitle="How employees are paying out-of-pocket" top={4} />
      <PremiumCard style={{ marginBottom: 16, padding: 18 }}>
        {paymentModes.length > 0 ? (
          <View style={{ flexDirection: compact || fontScale > 1.3 ? "column" : "row", alignItems: "center", gap: 20 }}>
            <DonutChart
              size={110}
              strokeWidth={14}
              data={pmDonutData}
              trackColor={c.surfaceMuted}
              center={
                <>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: c.text }}>{paymentModes.length}</Text>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 0.4, color: c.muted, textTransform: "uppercase" }}>Modes</Text>
                </>
              }
            />
            <View style={{ flex: 1, alignSelf: "stretch", gap: 12 }}>
              {paymentModes.map((pm) => (
                <View key={pm.label}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PAYMENT_COLORS[pm.label] || c.primary, marginRight: 8 }} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: c.text }}>{pm.label}</Text>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: c.text, fontVariant: ["tabular-nums"] }}>{currency(pm.total)}</Text>
                  </View>
                  <ProgressBar value={pm.total} max={analytics.total} color={PAYMENT_COLORS[pm.label] || c.primary} height={6} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 14, fontWeight: "500", color: c.muted, textAlign: "center", paddingVertical: 24 }}>No payment data yet.</Text>
        )}
      </PremiumCard>
    </>
  );
};

// --- Shared components --------------------------------------------------------

const ReportRow = ({ label, color, count, total, last }: { label: string; color: string; count: number; total: number; last?: boolean }) => {
  const c = useThemeColors();
  return (
    <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.divider }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.text }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted }}>{count} items</Text>
      <Text style={{ minWidth: 80, textAlign: "right", fontSize: 15, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] }}>{currency(total)}</Text>
    </View>
  );
};

const ReportDateField = ({
  label,
  value,
  onPress,
  onClear
}: {
  label: string;
  value?: string;
  onPress: () => void;
  onClear: () => void;
}) => {
  const c = useThemeColors();
  const displayValue = value ? formatReadableDateKey(value) || value : "Any date";
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[s.fieldLabel(c.muted), { marginBottom: 8 }]}>{label}</Text>
      <MotionPressable
        onPress={onPress}
        haptic
        pressScale={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${label} date, ${displayValue}`}
        style={{ minHeight: 56, flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: value ? c.primary : c.border, backgroundColor: c.surfaceStrong, paddingHorizontal: 10 }}
      >
        <View style={{ marginRight: 10, width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: value ? c.primary : c.primarySoft }}>
          <CalendarDays color={value ? c.onPrimary : c.primary} size={17} strokeWidth={2.2} />
        </View>
        <Text style={{ minWidth: 0, flex: 1, fontSize: 15, fontWeight: "700", color: value ? c.text : c.muted }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
          {displayValue}
        </Text>
        {value ? (
          <MotionPressable onPress={(e) => { e.stopPropagation(); onClear(); }} hitSlop={8} pressScale={0.85} accessibilityRole="button" accessibilityLabel={`Clear ${label} date`} style={{ marginLeft: 8, width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: c.surfaceMuted }}>
            <X color={c.muted} size={14} strokeWidth={2.6} />
          </MotionPressable>
        ) : null}
      </MotionPressable>
    </View>
  );
};

const ownerIdOf = (expense: Expense) =>
  typeof expense.userId === "object"
    ? (expense.userId as User)._id || (expense.userId as User).id || (expense.userId as User).authUid || ""
    : expense.userId;

const ownerOf = (expense: Expense) =>
  typeof expense.userId === "object" ? (expense.userId as User) : undefined;

const userDocId = (user?: User) => user?._id || user?.id || user?.authUid || "";

const uniqueReportUsers = (expenses: Expense[]) => {
  const users = new Map<string, User>();
  expenses.forEach((expense) => {
    const user = ownerOf(expense);
    const id = userDocId(user);
    if (user && id) users.set(id, user);
  });
  return Array.from(users.values()).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
};

const filterReportExpenses = (expenses: Expense[], filters: ReportFilters) =>
  expenses.filter((expense) => {
    if (filters.from && expense.date < filters.from) return false;
    if (filters.to && expense.date > filters.to) return false;
    if (filters.userId && ownerIdOf(expense) !== filters.userId) return false;
    if (filters.projectName && !expense.projectName.toLowerCase().includes(filters.projectName.toLowerCase())) return false;
    if (filters.category && expense.category !== filters.category) return false;
    if (filters.status && expense.status !== filters.status) return false;
    return true;
  });

const s = {
  fieldLabel: (color: string) => ({ marginLeft: 4, fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.5, textTransform: "uppercase" as const, color })
};
