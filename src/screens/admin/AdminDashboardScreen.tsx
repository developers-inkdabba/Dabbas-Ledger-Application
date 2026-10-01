import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { BarChart3, FolderKanban, Users } from "lucide-react-native";
import { ReactNode, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ExpenseCard } from "../../components/expense/ExpenseCard";
import { AccountButton } from "../../components/shared/AccountButton";
import { AppContainer } from "../../components/shared/AppContainer";
import { EmptyState } from "../../components/shared/EmptyState";
import { DonutChart, FinanceSectionHeader, HeroMetricCard, LinkPill, MetricPill, MiniBarChart, PremiumCard, ProgressBar, SegmentedProgress } from "../../components/shared/FinanceUI";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { ScreenHeader } from "../../components/shared/ScreenHeader";
import { UserAvatar } from "../../components/shared/UserAvatar";
import { chartColors, seriesColors } from "../../constants/theme";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { adminService } from "../../services/admin.service";
import { useFilterStore } from "../../store/filter.store";
import { DashboardBreakdown, Expense, PersonSpend } from "../../types";
import { currency } from "../../utils/formatters";

const CATEGORY_COLORS = seriesColors;

const emptyTotals = {
  pending_manager: { count: 0, total: 0 },
  approved: { count: 0, total: 0 },
  paid: { count: 0, total: 0 },
  rejected: { count: 0, total: 0 }
};

const emptyDashboard = {
  totals: emptyTotals,
  totalTeam: 0,
  totalExpenses: 0,
  recentPending: [] as Expense[],
  people: [] as PersonSpend[],
  categories: [] as DashboardBreakdown[],
  months: [] as DashboardBreakdown[]
};
type DashboardTotals = Record<string, { count: number; total: number }>;

export const AdminDashboardScreen = () => {
  const c = useThemeColors();
  const query = useQuery({ queryKey: ["admin-dashboard"], queryFn: adminService.dashboard });
  const resetFilters = useFilterStore((state) => state.reset);
  const setUserId = useFilterStore((state) => state.setUserId);
  const data = query.data || emptyDashboard;
  const totals: DashboardTotals = data.totals || emptyTotals;
  const allSpend = Object.values(totals).reduce((sum, item) => sum + item.total, 0);
  const pendingCount = totals.pending_manager?.count || 0;
  const topPeople = (data.people || []).filter((p) => p.total > 0).slice(0, 5);
  const recentPending = (data.recentPending || []).slice(0, 3);

  const statusDonutData = [
    { label: "Pending", value: totals.pending_manager?.total || 0, color: chartColors.pending },
    { label: "Approved", value: totals.approved?.total || 0, color: chartColors.approved },
    { label: "Paid", value: totals.paid?.total || 0, color: chartColors.paid },
    { label: "Rejected", value: totals.rejected?.total || 0, color: chartColors.rejected }
  ];

  // Category chart data
  const categories = data.categories || [];
  const categoryTotal = useMemo(() => categories.reduce((s, c) => s + c.total, 0), [categories]);
  const categoryBarData = useMemo(
    () => categories.slice(0, 6).map((item, i) => ({ value: item.total, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
    [categories]
  );
  const categoryDonutData = useMemo(
    () => categories.slice(0, 6).map((item, i) => ({ label: item.label, value: item.total, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
    [categories]
  );

  // Monthly chart data
  const months = data.months || [];
  const monthBarData = useMemo(
    () => months.slice(-6).map((item) => ({ label: item.label.slice(0, 3), value: item.total, color: chartColors.approved })),
    [months]
  );
  const monthMax = useMemo(() => Math.max(...months.map((m) => m.total), 1), [months]);

  const openPersonExpenses = (person: PersonSpend) => {
    resetFilters();
    setUserId(person.userId);
    router.push("/expenses" as never);
  };

  if (query.isLoading) return <AppContainer><LoadingSkeleton /></AppContainer>;

  return (
    <AppContainer>
      <ScreenHeader title="Admin" subtitle="Company finance controls" right={<AccountButton />} />

      <HeroMetricCard
        eyebrow="Company spend"
        label="All-time spend"
        value={currency(allSpend)}
        sublabel={`${data.totalExpenses || 0} claims · ${data.totalTeam || 0} members`}
        right={
          <DonutChart
            size={100}
            strokeWidth={11}
            trackColor={c.surfaceMuted}
            data={statusDonutData.some((d) => d.value > 0) ? statusDonutData : [{ label: "Empty", value: 1, color: c.surfaceMuted }]}
            center={
              <>
                <Text style={{ fontSize: 20, fontWeight: "800", color: c.text, fontVariant: ["tabular-nums"] }}>{String(pendingCount)}</Text>
                <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", color: c.muted }}>Review</Text>
              </>
            }
          />
        }
        footer={
          <>
            <SegmentedProgress segments={statusDonutData} />
            <View style={{ marginTop: 14, flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><MetricPill label="Pending" value={String(pendingCount)} tone="warning" /></View>
              <View style={{ flex: 1 }}><MetricPill label="Paid" value={currency(totals.paid?.total || 0)} tone="primary" /></View>
              <View style={{ flex: 1 }}><MetricPill label="Approved" value={currency(totals.approved?.total || 0)} tone="success" /></View>
            </View>
          </>
        }
      />

      <View style={{ marginBottom: 8, flexDirection: "row", gap: 10 }}>
        <AdminShortcut index={0} label="Team" tint="#0A84FF" icon={<Users color="#FFFFFF" size={20} strokeWidth={2.2} />} onPress={() => router.push("/admin/team" as never)} />
        <AdminShortcut index={1} label="Projects" tint="#FF9F0A" icon={<FolderKanban color="#FFFFFF" size={20} strokeWidth={2.2} />} onPress={() => router.push("/admin/projects" as never)} />
        <AdminShortcut index={2} label="Reports" tint="#30C06A" icon={<BarChart3 color="#FFFFFF" size={20} strokeWidth={2.2} />} onPress={() => router.push("/reports" as never)} />
      </View>

      {categories.length > 0 ? (
        <>
          <FinanceSectionHeader
            title="Spend by category"
            subtitle="All-time breakdown across the team"
            right={<LinkPill label="Analytics" onPress={() => router.push("/reports" as never)} />}
          />
          <PremiumCard style={{ marginBottom: 4, padding: 18 }}>
            <View style={{ flexDirection: "row", gap: 16, alignItems: "center", marginBottom: 18 }}>
              <DonutChart
                size={104}
                strokeWidth={12}
                trackColor={c.surfaceMuted}
                data={categoryDonutData}
                center={
                  <>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>{categories.length}</Text>
                    <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.4, color: c.muted, textTransform: "uppercase" }}>Types</Text>
                  </>
                }
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <MiniBarChart data={categoryBarData} height={80} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 4, marginTop: 10 }}>
                  {categories.slice(0, 6).map((item, i) => (
                    <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: c.muted }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            {categories.slice(0, 5).map((item, i) => {
              const pct = categoryTotal > 0 ? item.total / categoryTotal : 0;
              return (
                <View key={item.label} style={{ marginBottom: i < Math.min(categories.length, 5) - 1 ? 12 : 0 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: c.text }} numberOfLines={1}>{item.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted }}>{item.count} claims</Text>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] }}>{currency(item.total)}</Text>
                  </View>
                  <ProgressBar progress={pct} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                </View>
              );
            })}
          </PremiumCard>
        </>
      ) : null}

      {months.length > 0 ? (
        <>
          <FinanceSectionHeader title="Monthly spend trend" subtitle={`Last ${Math.min(months.length, 6)} months`} />
          <PremiumCard style={{ marginBottom: 4, padding: 18 }}>
            <MiniBarChart data={monthBarData} height={110} />
            <View style={{ marginTop: 16, gap: 12 }}>
              {months.slice(-6).map(item => {
                const pct = monthMax > 0 ? item.total / monthMax : 0;
                return (
                  <View key={item.label}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: c.text }}>{item.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted }}>{item.count} claims</Text>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] }}>{currency(item.total)}</Text>
                    </View>
                    <ProgressBar progress={pct} color={chartColors.approved} />
                  </View>
                );
              })}
            </View>
          </PremiumCard>
        </>
      ) : null}

      <FinanceSectionHeader title="Top spenders" subtitle="Tap to open ledger" right={<LinkPill label="All" onPress={() => router.push("/expenses" as never)} />} />
      <PremiumCard style={{ marginBottom: 4, paddingVertical: 6, paddingHorizontal: 16 }}>
        {topPeople.length ? (
          topPeople.map((person, i) => {
            const pct = allSpend > 0 ? person.total / allSpend : 0;
            return (
              <MotionPressable key={person.userId} onPress={() => openPersonExpenses(person)} haptic pressScale={0.98} accessibilityRole="button" accessibilityLabel={`${person.name}, ${currency(person.total)}`}>
                <View style={{ borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: c.divider, paddingVertical: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <UserAvatar name={person.name} size={38} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }} numberOfLines={1}>{person.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted }}>{person.count} claims</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: c.text, fontVariant: ["tabular-nums"] }}>{currency(person.total)}</Text>
                  </View>
                  <ProgressBar progress={pct} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                </View>
              </MotionPressable>
            );
          })
        ) : (
          <Text style={{ paddingVertical: 16, fontSize: 14, fontWeight: "500", color: c.muted }}>No team spend yet.</Text>
        )}
      </PremiumCard>

      <FinanceSectionHeader title="Pending approvals" right={<LinkPill label="Open" onPress={() => router.push("/approvals" as never)} />} />
      {recentPending.length ? (
        recentPending.map((expense) => (
          <ExpenseCard key={expense._id} expense={expense} onPress={() => router.push(`/expenses/${expense._id}`)} />
        ))
      ) : (
        <EmptyState title="All clear" message="No expenses awaiting review." />
      )}
    </AppContainer>
  );
};

/** Control-Centre style launcher: solid tinted plate on glass. */
const AdminShortcut = ({ label, icon, tint, index, onPress }: { label: string; icon: ReactNode; tint: string; index: number; onPress: () => void }) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  return (
    <MotionView delay={80 + index * 50} direction="up" style={{ flex: 1 }}>
      <MotionPressable
        onPress={onPress}
        haptic
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[{ alignItems: "center", borderRadius: 18, borderCurve: "continuous", borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surfaceGlass, paddingVertical: 16 }, shadow]}
      >
        <View style={{ marginBottom: 8, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: tint, boxShadow: `0px 8px 16px -8px ${tint}` }}>{icon}</View>
        <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>{label}</Text>
      </MotionPressable>
    </MotionView>
  );
};
