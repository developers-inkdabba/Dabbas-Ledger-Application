import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { BarChart3, Camera, Clock3, FileText, FolderKanban, Plus, ReceiptText, ShieldCheck, Users, WalletCards } from "lucide-react-native";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getCategoryMeta, withAlpha } from "../../constants/categoryMeta";
import { AccountButton } from "../../components/shared/AccountButton";
import { AdaptiveGrid } from "../../components/shared/AdaptiveGrid";
import { AppContainer } from "../../components/shared/AppContainer";
import { EmptyState } from "../../components/shared/EmptyState";
import { ErrorState } from "../../components/shared/ErrorState";
import { DonutChart, FinanceSectionHeader, GroupedSection, HeroMetricCard, LinkPill, MetricPill, MiniBarChart, PremiumCard, ProgressBar, SegmentedProgress } from "../../components/shared/FinanceUI";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { ServiceGrid, ServiceGroupItem } from "../../components/shared/ServiceGrid";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { UserAvatar } from "../../components/shared/UserAvatar";
import { chartColors, seriesColors } from "../../constants/theme";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { adminService } from "../../services/admin.service";
import { expenseService } from "../../services/expense.service";
import { useAuthStore } from "../../store/auth.store";
import { useFilterStore } from "../../store/filter.store";
import { DashboardBreakdown, Expense, PersonSpend } from "../../types";
import { currency, shortDate } from "../../utils/formatters";

const CATEGORY_COLORS = seriesColors;

const emptyDashboard = {
  totals: {
    pending_manager: { count: 0, total: 0 },
    approved: { count: 0, total: 0 },
    paid: { count: 0, total: 0 },
    rejected: { count: 0, total: 0 }
  },
  totalSpend: 0,
  paidAmount: 0,
  totalTeam: 0,
  totalExpenses: 0,
  balanceDue: 0,
  recentPending: [] as Expense[],
  people: [] as PersonSpend[],
  categories: [] as DashboardBreakdown[],
  months: [] as DashboardBreakdown[]
};

export const DashboardScreen = () => {
  const user = useAuthStore((state) => state.user);
  const isReviewer = user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const isReviewerOrAdmin = isReviewer || isAdmin;
  const resetFilters = useFilterStore((state) => state.reset);
  const setStatus = useFilterStore((state) => state.setStatus);
  const setUserId = useFilterStore((state) => state.setUserId);

  const memberQuery = useQuery({
    queryKey: ["dashboard-expenses"],
    queryFn: expenseService.allForReports,
    enabled: !isReviewerOrAdmin
  });
  const reviewerQuery = useQuery({
    queryKey: ["reviewer-dashboard"],
    queryFn: adminService.dashboard,
    enabled: isReviewerOrAdmin
  });
  const walletQuery = useQuery({
    queryKey: ["settlement-wallet", user?._id],
    queryFn: () => expenseService.listSettlements(user?._id || ""),
    enabled: Boolean(user?._id) && !isReviewerOrAdmin
  });

  const expenses = memberQuery.data || [];
  const memberTotals = expenses.reduce(
    (acc, expense) => {
      acc.total += expense.amount;
      acc.count += 1;
      if (expense.status === "pending_manager") {
        acc.pending += expense.amount;
        acc.pendingCount += 1;
      }
      if (expense.settlementStatus === "paid" || expense.status === "paid") acc.paid += expense.paidAmount || expense.amount;
      if (expense.status === "approved" && expense.remainingAmount > 0) acc.balanceDue += expense.remainingAmount;
      return acc;
    },
    { total: 0, count: 0, pending: 0, pendingCount: 0, paid: 0, balanceDue: 0 }
  );

  const memberCategoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    expenses.forEach((e) => {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
    });
    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], i) => ({ label: label.slice(0, 4), value, color: CATEGORY_COLORS[i] }));
  }, [expenses]);

  const memberMonthData = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("en-IN", { month: "short" });
    const monthMap = new Map<string, { label: string; total: number; sortKey: string }>();
    expenses.forEach((e) => {
      const d = new Date(e.date || e.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(sortKey) || { label: fmt.format(d), total: 0, sortKey };
      cur.total += e.amount;
      monthMap.set(sortKey, cur);
    });
    return Array.from(monthMap.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-5)
      .map((m, i) => ({ label: m.label, value: m.total, color: CATEGORY_COLORS[i] }));
  }, [expenses]);

  const analytics = isReviewerOrAdmin ? reviewerQuery.data || emptyDashboard : emptyDashboard;
  const totals = analytics.totals || emptyDashboard.totals;
  const allSpend = isReviewerOrAdmin ? analytics.totalSpend || 0 : memberTotals.total;
  const pendingAmount = isReviewerOrAdmin ? totals.pending_manager?.total || 0 : memberTotals.pending;
  const pendingCount = isReviewerOrAdmin ? totals.pending_manager?.count || 0 : memberTotals.pendingCount;
  const paidAmount = isReviewerOrAdmin ? analytics.paidAmount || 0 : memberTotals.paid;
  const balanceDue = isReviewerOrAdmin ? analytics.balanceDue || 0 : memberTotals.balanceDue;
  const walletBalance = !isReviewerOrAdmin
    ? (walletQuery.data || []).reduce((sum, item) => sum + Math.max(0, item.unallocatedAmount || 0), 0)
    : 0;
  const recordCount = isReviewerOrAdmin ? analytics.totalExpenses || 0 : memberTotals.count;
  const recentExpenses = isReviewerOrAdmin ? (analytics.recentPending || []).slice(0, 3) : expenses.slice(0, 3);
  const topPeople = (analytics.people || []).filter((p) => p.total > 0).slice(0, 3);

  const reviewerCategories = (analytics.categories || []).slice(0, 5).map((cat, i) => ({
    label: cat.label.slice(0, 4),
    value: cat.total,
    color: CATEGORY_COLORS[i]
  }));
  const reviewerMonths = (analytics.months || []).slice(-5).map((m, i) => ({
    label: m.label,
    value: m.total,
    color: CATEGORY_COLORS[i]
  }));

  const categoryBarData = isReviewerOrAdmin ? reviewerCategories : memberCategoryData;
  const monthBarData = isReviewerOrAdmin ? reviewerMonths : memberMonthData;

  if ((isReviewerOrAdmin && reviewerQuery.isLoading) || (!isReviewerOrAdmin && memberQuery.isLoading)) {
    return <AppContainer><LoadingSkeleton /></AppContainer>;
  }

  if (isReviewerOrAdmin && reviewerQuery.isError) {
    return <AppContainer><HomeHeader role={user?.role} /><ErrorState message={reviewerQuery.error.message} onAction={() => reviewerQuery.refetch()} /></AppContainer>;
  }

  if (!isReviewerOrAdmin && memberQuery.isError) {
    return <AppContainer><HomeHeader role={user?.role} /><ErrorState message={memberQuery.error.message} onAction={() => memberQuery.refetch()} /></AppContainer>;
  }

  const openPending = () => {
    resetFilters();
    setStatus("pending_manager");
    router.push(isReviewerOrAdmin ? "/approvals" : "/expenses" as never);
  };

  const openPerson = (person: PersonSpend) => {
    resetFilters();
    setUserId(person.userId);
    router.push("/expenses" as never);
  };

  return (
    <AppContainer>
      <HomeHeader role={user?.role} />
      <AdaptiveGrid minItemWidth={310} maxColumns={2} gap={18}>
      <DashboardHero
        total={allSpend}
        pending={pendingAmount}
        paid={paidAmount}
        balanceDue={balanceDue}
        pendingCount={pendingCount}
        recordCount={recordCount}
        isReviewer={isReviewerOrAdmin}
        totals={totals}
        onPrimary={isReviewerOrAdmin ? openPending : () => router.push("/add" as never)}
      />
      <DashboardMetricGrid
        total={allSpend}
        pending={pendingAmount}
        paid={paidAmount}
        balanceDue={balanceDue}
        pendingCount={pendingCount}
        recordCount={recordCount}
        isReviewer={isReviewerOrAdmin}
        walletBalance={walletBalance}
      />
      </AdaptiveGrid>
      <DashboardServices isReviewer={isReviewerOrAdmin} pendingCount={pendingCount} />

      {isReviewerOrAdmin ? (
        <ReviewerSnapshot people={topPeople} onPersonPress={openPerson} />
      ) : null}

      {(categoryBarData.length > 0 || monthBarData.length > 0) ? (
        <SpendInsights categoryData={categoryBarData} monthData={monthBarData} />
      ) : null}

      <ActivityPreview
        title={isReviewerOrAdmin ? "Needs review" : "Latest activity"}
        expenses={recentExpenses}
        isReviewer={isReviewerOrAdmin}
        onAll={() => router.push(isReviewerOrAdmin ? "/approvals" : "/expenses" as never)}
        onAdd={() => router.push("/add" as never)}
      />
    </AppContainer>
  );
};

// --- Home header -------------------------------------------------------------

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

const HomeHeader = ({ role }: { role?: string }) => {
  const isReviewer = role === "admin" || role === "manager";
  const name = useAuthStore((state) => state.user?.name);
  const c = useThemeColors();
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const firstName = name?.trim().split(/\s+/)[0];
  return (
    <MotionView direction="down" style={{ marginBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 2 }}>
      <View style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: c.primary }} numberOfLines={1}>{today}</Text>
        <Text accessibilityRole="header" style={{ marginTop: 4, fontSize: 32, fontWeight: "800", letterSpacing: -1, lineHeight: 38, color: c.text }} numberOfLines={2}>
          {isReviewer ? "Finance overview" : "Expense workspace"}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 15, fontWeight: "500", color: c.muted }} numberOfLines={1}>
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </Text>
      </View>
      <AccountButton />
    </MotionView>
  );
};

// --- Hero card ----------------------------------------------------------------

const DashboardHero = ({
  total, pending, paid, balanceDue, pendingCount, recordCount, isReviewer, totals, onPrimary
}: {
  total: number;
  pending: number;
  paid: number;
  balanceDue: number;
  pendingCount: number;
  recordCount: number;
  isReviewer: boolean;
  totals: { pending_manager?: { total: number }; approved?: { total: number }; paid?: { total: number }; rejected?: { total: number } };
  onPrimary: () => void;
}) => {
  const c = useThemeColors();
  const statusDonutData = [
    { label: "Pending", value: totals.pending_manager?.total || 0, color: chartColors.pending },
    { label: "Approved", value: totals.approved?.total || 0, color: chartColors.approved },
    { label: "Paid", value: totals.paid?.total || 0, color: chartColors.paid },
    { label: "Rejected", value: totals.rejected?.total || 0, color: chartColors.rejected }
  ];

  const heroValue = isReviewer ? String(pendingCount) : currency(balanceDue || pending);
  const heroLabel = isReviewer ? "Awaiting approval" : "Pending reimbursement";
  const heroSubLabel = isReviewer
    ? `${currency(pending)} in pending claims across ${recordCount} records`
    : `${recordCount} claims tracked. ${currency(paid)} settled so far.`;

  return (
    <HeroMetricCard
      label={heroLabel}
      value={heroValue}
      sublabel={heroSubLabel}
      primaryLabel={isReviewer ? "Review queue" : "Add expense"}
      onPrimaryPress={onPrimary}
      trustText="Your expenses, clearly accounted for."
      accentColor={isReviewer ? c.warning : c.primary}
      right={
        <DonutChart
          size={96}
          strokeWidth={10}
          trackColor={c.surfaceMuted}
          data={statusDonutData.some((d) => d.value > 0) ? statusDonutData : [{ label: "Empty", value: 1, color: "rgba(255,255,255,0.12)" }]}
          center={
            <>
              <Text style={{ fontSize: 18, fontWeight: "800", color: c.text, fontVariant: ["tabular-nums"] }}>{pendingCount}</Text>
              <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.4, color: c.muted, textTransform: "uppercase" }}>Pending</Text>
            </>
          }
        />
      }
      footer={
        <>
          <SegmentedProgress
            segments={[
              { value: pending, color: chartColors.pending },
              { value: paid, color: chartColors.paid },
              { value: Math.max(total - pending - paid, 0), color: c.surfaceMuted }
            ]}
          />
          <View style={{ marginTop: 14, flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><MetricPill label="Pending" value={String(pendingCount)} tone="warning" /></View>
            <View style={{ flex: 1 }}><MetricPill label="Paid" value={currency(paid)} tone="primary" /></View>
            <View style={{ flex: 1 }}><MetricPill label="Balance" value={currency(balanceDue)} tone="warning" /></View>
          </View>
        </>
      }
    />
  );
};

const DashboardMetricGrid = ({
  total,
  pending,
  paid,
  balanceDue,
  pendingCount,
  recordCount,
  isReviewer,
  walletBalance
}: {
  total: number;
  pending: number;
  paid: number;
  balanceDue: number;
  pendingCount: number;
  recordCount: number;
  isReviewer: boolean;
  walletBalance?: number;
}) => {
  const c = useThemeColors();
  const settlementRate = total > 0 ? Math.round((paid / total) * 100) : 0;
  const openAmount = isReviewer ? pending : balanceDue || pending;
  const items = [
    {
      label: isReviewer ? "Open queue" : "Owed balance",
      value: isReviewer ? String(pendingCount) : currency(openAmount),
      caption: isReviewer ? currency(pending) : "Approved unpaid",
      icon: Clock3,
      tone: c.warning,
      bg: c.warningSoft
    },
    {
      label: "Settled",
      value: currency(paid),
      caption: `${settlementRate}% of total`,
      icon: WalletCards,
      tone: c.primary,
      bg: c.primarySoft
    },
    {
      label: "Total spend",
      value: currency(total),
      caption: `${recordCount} records`,
      icon: BarChart3,
      tone: c.info,
      bg: c.infoSoft
    },
    !isReviewer && walletBalance && walletBalance > 0
      ? {
          label: "Wallet credit",
          value: currency(walletBalance),
          caption: "Advance balance",
          icon: WalletCards,
          tone: c.primary,
          bg: c.primarySoft
        }
      : {
          label: "Health",
          value: pendingCount > 0 ? "Review" : "Clear",
          caption: pendingCount > 0 ? `${pendingCount} needs action` : "No pending items",
          icon: ShieldCheck,
          tone: pendingCount > 0 ? c.warning : c.success,
          bg: pendingCount > 0 ? c.warningSoft : c.successSoft
        }
  ];

  return (
    <AdaptiveGrid minItemWidth={140} maxColumns={2} gap={10} style={{ marginBottom: 22 }}>
      {items.map((item, index) => (
        <DashboardStatTile key={item.label} item={item} delay={80 + index * 50} />
      ))}
    </AdaptiveGrid>
  );
};

const DashboardStatTile = ({
  item,
  delay
}: {
  item: {
    label: string;
    value: string;
    caption: string;
    icon: typeof BarChart3;
    tone: string;
    bg: string;
  };
  delay: number;
}) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  const Icon = item.icon;
  return (
    <MotionView
      delay={delay}
      direction="up"
      style={[{
        width: "100%",
        flex: 1,
        minHeight: 138,
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: c.glassBorder,
        backgroundColor: c.surfaceGlass,
        padding: 16
      }, shadow]}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: item.bg }}>
        <Icon size={18} color={item.tone} strokeWidth={2.2} />
      </View>
      <Text style={{ marginTop: 14, fontSize: 13, fontWeight: "600", color: c.muted }} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={{ marginTop: 2, fontSize: 22, lineHeight: 27, fontWeight: "800", letterSpacing: -0.6, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
        {item.value}
      </Text>
      <Text style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: "600", color: item.tone }} numberOfLines={1}>
        {item.caption}
      </Text>
    </MotionView>
  );
};

const DashboardServices = ({ isReviewer, pendingCount }: { isReviewer: boolean; pendingCount: number }) => {
  const groups: ServiceGroupItem[] = [
    {
      title: "Submit",
      items: [
        { id: "new-expense", label: "New Expense", caption: "Create a claim", icon: Plus, onPress: () => router.push("/add" as never) },
        { id: "upload-receipt", label: "Receipt", caption: "Attach proof", icon: Camera, onPress: () => router.push("/add" as never), tone: "info" }
      ]
    },
    {
      title: "Track",
      items: [
        { id: "my-expenses", label: "My Expenses", caption: "All claims", icon: ReceiptText, onPress: () => router.push("/expenses" as never) },
        { id: "pending", label: "Pending", caption: "Waiting status", icon: Clock3, onPress: () => router.push(isReviewer ? "/approvals" : "/expenses" as never), tone: "warning", badge: pendingCount || undefined }
      ]
    },
    {
      title: isReviewer ? "Manage" : "Review",
      items: isReviewer
        ? [
            { id: "approvals", label: "Approvals", caption: "Fast review", icon: Users, onPress: () => router.push("/approvals" as never), tone: "warning" },
            { id: "reports", label: "Reports", caption: "Export-ready", icon: BarChart3, onPress: () => router.push("/reports" as never), tone: "success" },
            { id: "projects", label: "Projects", caption: "Workspace view", icon: FolderKanban, onPress: () => router.push("/admin/projects" as never), tone: "info" },
            { id: "security", label: "Security", caption: "Profile settings", icon: ShieldCheck, onPress: () => router.push("/profile" as never), tone: "primary" }
          ]
        : [
            { id: "reports", label: "Reports", caption: "Spend summary", icon: FileText, onPress: () => router.push("/reports" as never), tone: "success" },
            { id: "payments", label: "Payments", caption: "Settlement view", icon: WalletCards, onPress: () => router.push("/expenses" as never), tone: "info" }
          ]
    }
  ];

  return (
    <View style={{ marginBottom: 8 }}>
      <ServiceGrid groups={groups} />
    </View>
  );
};

// --- Primary actions ----------------------------------------------------------

const ReviewerSnapshot = ({
  people, onPersonPress
}: {
  people: PersonSpend[];
  onPersonPress: (person: PersonSpend) => void;
}) => {
  const c = useThemeColors();
  if (!people.length) return null;
  return (
    <>
      <FinanceSectionHeader
        title="Top spenders"
        right={<LinkPill label="Team" onPress={() => router.push("/admin" as never)} />}
        top={12}
      />
      <GroupedSection style={{ marginBottom: 4 }}>
        {people.map((person, index) => (
          <MotionPressable
            key={person.userId}
            onPress={() => onPersonPress(person)}
            haptic
            pressScale={0.98}
            accessibilityRole="button"
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 62,
              paddingHorizontal: 16,
              paddingVertical: 11,
              gap: 12,
              borderBottomWidth: index === people.length - 1 ? 0 : StyleSheet.hairlineWidth,
              borderBottomColor: c.divider
            }}
          >
            <Text style={{ width: 18, fontSize: 13, fontWeight: "800", color: c.muted, fontVariant: ["tabular-nums"] }}>{index + 1}</Text>
            <UserAvatar name={person.name} size={38} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }} numberOfLines={1}>{person.name}</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted, marginTop: 1 }}>{person.count} expenses</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: c.text, fontVariant: ["tabular-nums"] }}>{currency(person.total)}</Text>
          </MotionPressable>
        ))}
      </GroupedSection>
    </>
  );
};

// --- Spend insights -----------------------------------------------------------

const SpendInsights = ({
  categoryData,
  monthData
}: {
  categoryData: { label: string; value: number; color: string }[];
  monthData: { label: string; value: number; color: string }[];
}) => {
  const categoryTotal = categoryData.reduce((sum, item) => sum + item.value, 0);
  const monthTotal = monthData.reduce((sum, item) => sum + item.value, 0);
  const topCategory = categoryData[0];
  const latestMonth = monthData[monthData.length - 1];

  return (
    <>
      <FinanceSectionHeader
        title="Spend insights"
        right={<LinkPill label="Reports" onPress={() => router.push("/reports" as never)} />}
        top={12}
        bottom={10}
      />
      <PremiumCard compact elevated style={{ marginBottom: 4, padding: 18 }}>
        <AdaptiveGrid minItemWidth={230} maxColumns={2} gap={20}>
          {categoryData.length > 0 ? (
            <InsightPanel
              title="Categories"
              value={topCategory ? currency(topCategory.value) : currency(0)}
              caption={topCategory ? `${topCategory.label} leads spending` : "No category trend"}
              data={categoryData}
              total={categoryTotal}
            />
          ) : null}
          {monthData.length > 0 ? (
            <InsightPanel
              title="Monthly"
              value={latestMonth ? currency(latestMonth.value) : currency(0)}
              caption={latestMonth ? `${latestMonth.label} latest total` : "No monthly trend"}
              data={monthData}
              total={monthTotal}
            />
          ) : null}
        </AdaptiveGrid>
      </PremiumCard>
    </>
  );
};

const InsightPanel = ({
  title,
  value,
  caption,
  data,
  total
}: {
  title: string;
  value: string;
  caption: string;
  data: { label: string; value: number; color: string }[];
  total: number;
}) => {
  const c = useThemeColors();
  const top = data[0];
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.muted }}>{title}</Text>
        <Text style={{ marginTop: 4, fontSize: 24, lineHeight: 29, fontWeight: "800", letterSpacing: -0.6, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 17, fontWeight: "500", color: c.muted }} numberOfLines={1}>
          {caption}
        </Text>
      </View>
      <MiniBarChart data={data} height={96} />
      {top ? (
        <View style={{ marginTop: 12 }}>
          <View style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: c.text }} numberOfLines={1}>{top.label}</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: c.muted, fontVariant: ["tabular-nums"] }}>{Math.round((top.value / Math.max(total, 1)) * 100)}%</Text>
          </View>
          <ProgressBar value={top.value} max={total} color={top.color} height={6} />
        </View>
      ) : null}
    </View>
  );
};

const ActivityPreview = ({
  title,
  expenses,
  isReviewer,
  onAll,
  onAdd
}: {
  title: string;
  expenses: Expense[];
  isReviewer: boolean;
  onAll: () => void;
  onAdd: () => void;
}) => {
  const c = useThemeColors();
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return (
    <>
      <FinanceSectionHeader
        title={title}
        right={<LinkPill label="See all" onPress={onAll} />}
        top={12}
      />
      {expenses.length ? (
        <PremiumCard compact elevated style={{ marginBottom: 20, padding: 0 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.muted }}>
                {isReviewer ? "Review queue" : "Recent ledger"}
              </Text>
              <Text style={{ marginTop: 3, fontSize: 26, lineHeight: 31, fontWeight: "800", letterSpacing: -0.8, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
                {currency(total)}
              </Text>
            </View>
            <View style={{ borderRadius: 10, backgroundColor: isReviewer ? c.warningSoft : c.primarySoft, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: isReviewer ? c.warning : c.primary }}>
                {expenses.length} {expenses.length === 1 ? "item" : "items"}
              </Text>
            </View>
          </View>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />
          {expenses.map((expense, index) => (
            <ActivityRow
              key={expense._id}
              expense={expense}
              last={index === expenses.length - 1}
              onPress={() => router.push(`/expenses/${expense._id}`)}
            />
          ))}
        </PremiumCard>
      ) : (
        <EmptyState
          title={isReviewer ? "Nothing waiting" : "No expenses yet"}
          message={isReviewer ? "Approval requests will appear here." : "Tap Add to submit your first expense."}
          action={<LinkPill label="Add expense" onPress={onAdd} />}
        />
      )}
    </>
  );
};

const ActivityRow = ({ expense, last, onPress }: { expense: Expense; last: boolean; onPress: () => void }) => {
  const c = useThemeColors();
  const { Icon, tint } = getCategoryMeta(expense.category);
  return (
    <MotionPressable
      onPress={onPress}
      haptic
      pressScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${expense.projectName}, ${currency(expense.amount)}`}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: c.divider
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(tint, 0.15) }}>
          <Icon size={20} color={tint} strokeWidth={2.1} />
        </View>
        <View style={{ minWidth: 0, flex: 1 }}>
          <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: "700", color: c.text }} numberOfLines={1}>
            {expense.projectName}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 17, fontWeight: "500", color: c.muted }} numberOfLines={1}>
            {expense.category}{expense.clientName ? ` · ${expense.clientName}` : ""}
          </Text>
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <StatusBadge status={expense.status} compact />
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.muted }}>{shortDate(expense.date)}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", flexShrink: 0, maxWidth: 104 }}>
          <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: "800", letterSpacing: -0.3, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
            {currency(expense.amount)}
          </Text>
          <Text style={{ marginTop: 3, fontSize: 12, fontWeight: "600", color: c.muted }} numberOfLines={1}>
            {expense.paymentMode || "Claim"}
          </Text>
        </View>
      </View>
    </MotionPressable>
  );
};
