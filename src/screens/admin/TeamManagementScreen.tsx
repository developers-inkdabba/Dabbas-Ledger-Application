import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Check, Copy, GitBranch, KeyRound, Plus, RefreshCcw, ShieldCheck, Trash2, UserRoundCog, UsersRound, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { AccountButton } from "../../components/shared/AccountButton";
import { AdaptiveSheet } from "../../components/shared/AdaptiveSheet";
import { ListScreen, useListFrame } from "../../components/shared/AppContainer";
import { ConfirmSheet } from "../../components/shared/ConfirmSheet";
import { EmptyState } from "../../components/shared/EmptyState";
import { FinanceSectionHeader, PremiumCard } from "../../components/shared/FinanceUI";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { ScreenHeader } from "../../components/shared/ScreenHeader";
import { SelectionControl } from "../../components/shared/SelectionControl";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { UserAvatar } from "../../components/shared/UserAvatar";
import { CountryPhoneField } from "../../components/ui/CountryPhoneField";
import { FormField } from "../../components/ui/FormField";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { Toggle } from "../../components/ui/Toggle";
import { ThemeColors } from "../../constants/theme";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { adminService } from "../../services/admin.service";
import { useAuthStore } from "../../store/auth.store";
import { CompanyInvite, User } from "../../types";
import { isValidInternationalPhone } from "../../utils/phone";

// --- Delegation Sheet ---------------------------------------------------------

const DelegateSheet = ({
  visible,
  manager,
  candidates,
  onClose
}: {
  visible: boolean;
  manager: User | null;
  candidates: User[];
  onClose: () => void;
}) => {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const setDelegate = useMutation({
    mutationFn: ({ managerId, delegateId }: { managerId: string; delegateId: string }) =>
      adminService.setDelegate(managerId, delegateId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setSelectedId(null);
      onClose();
    },
    onError: (err) => Alert.alert("Could not set delegate", err.message)
  });

  const removeDelegate = useMutation({
    mutationFn: (managerId: string) => adminService.removeDelegate(managerId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ["team"] });
      onClose();
    },
    onError: (err) => Alert.alert("Could not remove delegate", err.message)
  });

  if (!manager) return null;
  const managerId = manager._id || manager.id || "";
  const hasDelegate = Boolean(manager.delegateId);

  return (
    <AdaptiveSheet visible={visible} onClose={onClose}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <GitBranch color={c.primary} size={21} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", letterSpacing: -0.4, color: c.text }}>Delegation</Text>
                <Text style={{ fontSize: 14, fontWeight: "500", color: c.muted, marginTop: 1 }}>
                  For {manager.name} · {manager.role}
                </Text>
              </View>
            </View>

            {/* Current delegate banner */}
            {hasDelegate ? (
              <View style={{ marginBottom: 18, borderRadius: 16, borderWidth: 1, borderColor: c.primary, backgroundColor: c.primarySoft, padding: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.primary, marginBottom: 4 }}>
                  Active delegate
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>
                    {manager.delegateName || "-"}
                  </Text>
                  <PrimaryButton
                    label="Remove"
                    variant="ghost"
                    compact
                    loading={removeDelegate.isPending}
                    onPress={() => removeDelegate.mutate(managerId)}
                    icon={<X color={c.error} size={13} />}
                  />
                </View>
                {manager.delegateUntil ? (
                  <Text style={{ fontSize: 12, fontWeight: "500", color: c.primary, marginTop: 4 }}>
                    Until {new Date(manager.delegateUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.muted, marginBottom: 10, marginLeft: 4 }}>
              {hasDelegate ? "Change delegate" : "Select a delegate from your team"}
            </Text>

            {/* Candidate list */}
            {candidates.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.muted }}>No eligible managers or admins found.</Text>
              </View>
            ) : (
              candidates.map((candidate) => {
                const id = candidate._id || candidate.id || "";
                const isSelected = selectedId === id;
                const isSelf = id === managerId;
                return (
                  <MotionPressable
                    key={id}
                    disabled={isSelf}
                    onPress={() => setSelectedId(isSelected ? null : id)}
                    haptic
                    pressScale={0.98}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, disabled: isSelf }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 14,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderColor: isSelected ? c.primary : c.border,
                      backgroundColor: isSelected ? c.primarySoft : c.surfaceStrong,
                      opacity: isSelf ? 0.4 : 1
                    }}
                  >
                    <UserAvatar name={candidate.name} size={38} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>{candidate.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted, marginTop: 1, textTransform: "capitalize" }}>
                        {candidate.role} · {candidate.department || "General"}
                      </Text>
                    </View>
                    {isSelected ? (
                      <MotionView direction="scale" style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
                        <Check color={c.onPrimary} size={14} strokeWidth={3} />
                      </MotionView>
                    ) : (
                      <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: c.borderStrong }} />
                    )}
                  </MotionPressable>
                );
              })
            )}

            <View style={{ marginTop: 16, gap: 10 }}>
              <PrimaryButton
                label="Assign Delegate"
                disabled={!selectedId}
                loading={setDelegate.isPending}
                onPress={() => {
                  if (!selectedId) return;
                  setDelegate.mutate({ managerId, delegateId: selectedId });
                }}
                icon={<GitBranch color={c.onPrimary} size={16} />}
              />
              <PrimaryButton label="Cancel" variant="ghost" onPress={onClose} disabled={setDelegate.isPending} />
            </View>
    </AdaptiveSheet>
  );
};

// --- Main Screen --------------------------------------------------------------

export const TeamManagementScreen = () => {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { scrollY, onScroll, contentContainerStyle } = useListFrame({ bottomPadding: 140 });

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<User | null>(null);
  const [accessDecision, setAccessDecision] = useState<{ user: User; decision: "approve" | "reject" } | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "employee" as User["role"],
    department: ""
  });

  const phoneValid = !form.phoneNumber || isValidInternationalPhone(form.phoneNumber);

  const query = useQuery({ queryKey: ["team"], queryFn: adminService.team });
  const invitesQuery = useQuery({ queryKey: ["company-invites"], queryFn: adminService.companyInvites });
  const accessQuery = useQuery({ queryKey: ["access-requests"], queryFn: adminService.accessRequests });

  const create = useMutation({
    mutationFn: () => adminService.createUser({ ...form, userCode: form.email, isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setForm({ name: "", email: "", phoneNumber: "", password: "", role: "employee", department: "" });
      setFormOpen(false);
    },
    onError: (error) => Alert.alert("Could not save user", error.message)
  });

  const generateInvite = useMutation({
    mutationFn: adminService.generateCompanyInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-invites"] }),
    onError: (error) => Alert.alert("Could not generate code", error.message)
  });

  const reviewAccess = useMutation({
    mutationFn: ({ user, decision }: { user: User; decision: "approve" | "reject" }) => {
      const id = user._id || user.id || user.authUid || "";
      return decision === "approve" ? adminService.approveAccess(id) : adminService.rejectAccess(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (error) => Alert.alert("Could not review access", error.message)
  });

  const toggle = useMutation({
    mutationFn: (user: User) =>
      adminService.updateUser(user._id || user.id || "", { isActive: !user.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] })
  });

  const remove = useMutation({
    mutationFn: (user: User) => adminService.deleteUser(user._id || user.id || ""),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (error) => Alert.alert("Could not delete user", error.message)
  });

  const users = query.data || [];
  const activeUsers = users.filter((u) => u.isActive).length;
  const admins = users.filter((u) => u.role === "admin").length;
  const managers = users.filter((u) => u.role === "manager").length;
  const accessRequests = accessQuery.data || [];
  const visibleUsers = users.filter((u) => u.approvalStatus !== "pending");
  const latestInvite = (invitesQuery.data || []).find((i) => i.isActive) || (invitesQuery.data || [])[0];

  // Eligible delegates: managers + admins (excluding the target manager themselves)
  const delegateCandidates = users.filter(
    (u) => u.isActive && (u.role === "manager" || u.role === "admin")
  );

  const confirmAccessDecision = () => {
    if (!accessDecision) return;
    reviewAccess.mutate(accessDecision, { onSuccess: () => setAccessDecision(null) });
  };

  const listHeader = (
    <>
      <ScreenHeader
        title="Team"
        subtitle="Manage active users, roles & delegation"
        eyebrow="People access"
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PrimaryButton
              label={formOpen ? "Close" : "Add"}
              onPress={() => setFormOpen((v) => !v)}
              variant="secondary"
              icon={formOpen ? <X color={c.primary} size={16} strokeWidth={2.5} /> : <Plus color={c.primary} size={16} strokeWidth={2.5} />}
              compact
            />
            <AccountButton />
          </View>
        }
      />

      {formOpen ? (
        <PremiumCard style={{ marginBottom: 16, padding: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
            <View style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: c.primarySoft, marginRight: 12 }}>
              <UserRoundCog color={c.primary} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: "800", letterSpacing: -0.4, color: c.text }}>New team member</Text>
              <Text style={{ marginTop: 1, fontSize: 14, color: c.muted }}>Create email and PIN access</Text>
            </View>
          </View>
          <FormField label="Name" value={form.name} onChangeText={(name) => setForm((p) => ({ ...p, name }))} />
          <FormField label="Email" value={form.email} onChangeText={(email) => setForm((p) => ({ ...p, email }))} autoCapitalize="none" keyboardType="email-address" />
          <CountryPhoneField
            label="Phone Number"
            value={form.phoneNumber}
            onChangeText={(phoneNumber) => setForm((p) => ({ ...p, phoneNumber }))}
            error={phoneValid ? undefined : "Choose a country code and enter a valid phone number"}
            hint="Optional. Stored securely in international format."
          />
          <FormField
            label="Temporary PIN"
            value={form.password}
            onChangeText={(password) => setForm((p) => ({ ...p, password: password.replace(/\D/g, "").slice(0, 6) }))}
            keyboardType="number-pad"
            secureTextEntry
          />
          <FormField label="Department" value={form.department} onChangeText={(department) => setForm((p) => ({ ...p, department }))} />
          <Text style={{ marginBottom: 8, marginLeft: 4, fontSize: 13, fontWeight: "600", color: c.textSoft }}>Role</Text>
          <SelectionControl
            label="Role"
            value={form.role}
            onChange={(role) => setForm((p) => ({ ...p, role }))}
            options={[
              { value: "employee", label: "Employee" },
              { value: "manager", label: "Manager" },
              { value: "admin", label: "Admin" }
            ]}
          />
          <PrimaryButton
            label="Create User"
            onPress={() => create.mutate()}
            loading={create.isPending}
            disabled={!form.name || !form.email || !phoneValid || form.password.length !== 6 || !form.department}
          />
        </PremiumCard>
      ) : null}

      <FinanceSectionHeader
        title="Company invite code"
        subtitle="Share with people who should request workspace access"
        top={formOpen ? 4 : 0}
      />
      <CompanyInviteCard
        invite={latestInvite}
        loading={generateInvite.isPending || invitesQuery.isLoading}
        onGenerate={() => generateInvite.mutate()}
      />

      <FinanceSectionHeader
        title="Workspace access"
        subtitle="Active users, roles, and account state"
        top={formOpen ? 4 : 0}
      />
      <WorkspaceAccessSummary
        total={users.length}
        active={activeUsers}
        admins={admins}
        managers={managers}
        pending={accessRequests.length}
      />

      {accessRequests.length ? (
        <>
          <FinanceSectionHeader
            title="Pending join requests"
            subtitle="Approve only people who belong to this company"
            top={8}
          />
          {accessRequests.map((member) => (
            <AccessRequestRow
              key={member._id || member.id || member.authUid}
              member={member}
              loading={reviewAccess.isPending}
              onApprove={() => setAccessDecision({ user: member, decision: "approve" })}
              onReject={() => setAccessDecision({ user: member, decision: "reject" })}
            />
          ))}
        </>
      ) : null}

      <FinanceSectionHeader
        title="People"
        subtitle="Toggle access · tap Delegate to set approver cover"
        top={8}
      />
    </>
  );

  return (
    <ListScreen scrollY={scrollY}>
      <Animated.FlatList
        data={query.isLoading ? [] : visibleUsers}
        keyExtractor={(item) => item._id || item.id || item.userCode}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={contentContainerStyle}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <TeamMemberCard
            item={item}
            currentUserId={currentUser?._id || currentUser?.id}
            onToggle={() => toggle.mutate(item)}
            onDelete={() => setDeleteTarget(item)}
            onDelegate={
              (item.role === "manager" || item.role === "admin") && currentUser?.role === "admin"
                ? () => setDelegateTarget(item)
                : undefined
            }
          />
        )}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        ListEmptyComponent={
          query.isLoading
            ? <LoadingSkeleton />
            : <EmptyState title="No team members" message="Create your first secure team login." />
        }
      />

      <ConfirmSheet
        visible={Boolean(deleteTarget)}
        title="Delete user?"
        message={`This will deactivate ${deleteTarget?.name || "this user"} and block company access.`}
        confirmLabel={remove.isPending ? "Deactivating..." : "Deactivate User"}
        loading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
      <ConfirmSheet
        visible={Boolean(accessDecision)}
        title={accessDecision?.decision === "approve" ? "Approve access?" : "Reject access?"}
        message={
          accessDecision?.decision === "approve"
            ? `${accessDecision.user.name || "This person"} will be able to enter this company workspace.`
            : `${accessDecision?.user.name || "This person"} will not be able to enter this workspace.`
        }
        confirmLabel={accessDecision?.decision === "approve" ? "Approve Access" : "Reject Request"}
        tone={accessDecision?.decision === "approve" ? "primary" : "danger"}
        loading={reviewAccess.isPending}
        onConfirm={confirmAccessDecision}
        onClose={() => setAccessDecision(null)}
      />

      <DelegateSheet
        visible={Boolean(delegateTarget)}
        manager={delegateTarget}
        candidates={delegateCandidates}
        onClose={() => setDelegateTarget(null)}
      />
    </ListScreen>
  );
};

// --- Sub-components -----------------------------------------------------------

const rolePalette = (c: ThemeColors): Record<User["role"], { bg: string; text: string }> => ({
  admin: { bg: c.primarySoft, text: c.primary },
  manager: { bg: c.infoSoft, text: c.info },
  employee: { bg: c.surfaceMuted, text: c.textSoft }
});

function CompanyInviteCard({
  invite,
  loading,
  onGenerate
}: {
  invite?: CompanyInvite;
  loading?: boolean;
  onGenerate: () => void;
}) {
  const c = useThemeColors();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!invite?.code) return;
    await Clipboard.setStringAsync(invite.code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PremiumCard style={{ marginBottom: 4, padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#FF9F0A" }}>
          <KeyRound color="#FFFFFF" size={21} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.muted }}>Signup code</Text>
          <Text style={{ marginTop: 2, fontSize: 26, fontWeight: "800", letterSpacing: 2, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
            {invite?.code || "No code yet"}
          </Text>
          <Text style={{ marginTop: 1, fontSize: 13, fontWeight: "500", color: c.muted }} numberOfLines={1}>
            {invite ? `${invite.companyName} · active` : "Generate a secure company invite code"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {invite?.code ? (
            <MotionPressable hitSlop={4}
              onPress={handleCopy}
              pressScale={0.88}
              accessibilityRole="button"
              accessibilityLabel="Copy invite code"
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: copied ? c.primarySoft : c.surfaceStrong,
                borderWidth: 1,
                borderColor: copied ? c.primary : c.border
              }}
            >
              {copied ? <MotionView direction="scale"><Check size={17} color={c.primary} strokeWidth={2.8} /></MotionView> : <Copy size={16} color={c.muted} />}
            </MotionPressable>
          ) : null}
          <PrimaryButton
            label={invite ? "New" : "Generate"}
            onPress={onGenerate}
            loading={loading}
            variant="secondary"
            compact
            icon={<RefreshCcw color={c.primary} size={15} strokeWidth={2.3} />}
          />
        </View>
      </View>
      {copied ? (
        <MotionView direction="down" style={{ marginTop: 12, borderRadius: 10, backgroundColor: c.successSoft, paddingVertical: 6, paddingHorizontal: 12, alignSelf: "flex-start" }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.success }}>Copied to clipboard</Text>
        </MotionView>
      ) : null}
    </PremiumCard>
  );
}

function WorkspaceAccessSummary({
  total, active, admins, managers, pending
}: {
  total: number; active: number; admins: number; managers: number; pending: number;
}) {
  const c = useThemeColors();
  const stats = [
    { label: "Active", value: active, color: c.success },
    { label: "Pending", value: pending, color: c.warning },
    { label: "Admins", value: admins, color: c.primary },
    { label: "Managers", value: managers, color: c.info }
  ];
  return (
    <PremiumCard style={{ marginBottom: 4, padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#0A84FF", marginRight: 12 }}>
          <UsersRound color="#FFFFFF" size={21} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", letterSpacing: -0.3, color: c.text }}>
            {total} {total === 1 ? "member" : "members"}
          </Text>
          <Text style={{ marginTop: 1, fontSize: 13, fontWeight: "500", color: c.muted }}>Workspace directory</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: c.successSoft }}>
          <ShieldCheck color={c.success} size={13} strokeWidth={2.4} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: c.success }}>Secure</Text>
        </View>
      </View>
      <View style={{ marginTop: 16, flexDirection: "row", borderRadius: 14, backgroundColor: c.surfaceStrong, paddingVertical: 12 }}>
        {stats.map((stat, index) => (
          <View key={stat.label} style={{ flex: 1, alignItems: "center", borderLeftWidth: index ? StyleSheet.hairlineWidth : 0, borderLeftColor: c.divider }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: stat.color, fontVariant: ["tabular-nums"] }}>{stat.value}</Text>
            <Text style={{ marginTop: 1, fontSize: 12, fontWeight: "600", color: c.muted }} numberOfLines={1}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </PremiumCard>
  );
}

const AccessRequestRow = ({
  member, loading, onApprove, onReject
}: {
  member: User; loading?: boolean; onApprove: () => void; onReject: () => void;
}) => {
  const c = useThemeColors();
  return (
    <PremiumCard compact style={{ marginBottom: 10, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <UserAvatar name={member.name} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: c.text }} numberOfLines={1}>{member.name}</Text>
            <StatusBadge status="pending_manager" compact />
          </View>
          <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "500", color: c.muted }} numberOfLines={1}>{member.email}</Text>
          <Text style={{ marginTop: 1, fontSize: 13, fontWeight: "500", color: c.muted }} numberOfLines={1}>
            {member.requestedCompanyName || "Company requested"} · {member.companyInviteCode || "code"}
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
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

const TeamMemberCard = ({
  item,
  currentUserId,
  onToggle,
  onDelete,
  onDelegate
}: {
  item: User;
  currentUserId?: string;
  onToggle: () => void;
  onDelete: () => void;
  onDelegate?: () => void;
}) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  const itemId = item._id || item.id || "";
  const isCurrentUser = Boolean(currentUserId && itemId === currentUserId);
  const roles = rolePalette(c);
  const roleTone = roles[item.role] || roles.employee;

  return (
    <MotionView
      direction="up"
      style={[{
        marginBottom: 12,
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: c.glassBorder,
        backgroundColor: c.surfaceGlass,
        overflow: "hidden",
        opacity: item.isActive ? 1 : 0.78
      }, shadow]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <UserAvatar name={item.name} size={48} />
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Text style={{ flexShrink: 1, fontSize: 17, fontWeight: "700", letterSpacing: -0.2, color: c.text }} numberOfLines={1}>{item.name}</Text>
            {item.role === "admin" ? <ShieldCheck color={c.primary} size={15} strokeWidth={2.4} /> : null}
          </View>
          <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted }} numberOfLines={1}>{item.email || item.userCode}</Text>
          <Text style={{ marginTop: 1, fontSize: 13, fontWeight: "500", color: c.muted }} numberOfLines={1}>
            {item.department || "General"}{item.phoneNumber ? ` · ${item.phoneNumber}` : ""}
          </Text>
        </View>
        <Toggle value={Boolean(item.isActive)} onValueChange={onToggle} accessibilityLabel={`${item.name} access ${item.isActive ? "active" : "off"}`} />
      </View>

      {/* Delegate badge (when set) */}
      {item.delegateId ? (
        <View style={{ marginHorizontal: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, backgroundColor: c.primarySoft, paddingHorizontal: 10, paddingVertical: 7 }}>
          <GitBranch color={c.primary} size={13} />
          <Text style={{ flexShrink: 1, fontSize: 12, fontWeight: "700", color: c.primary }}>
            Delegating to {item.delegateName || "-"}
            {item.delegateUntil ? ` until ${new Date(item.delegateUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}
          </Text>
        </View>
      ) : null}

      {/* Action row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider, paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: roleTone.bg }}>
            <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "capitalize", color: roleTone.text }}>{item.role}</Text>
          </View>
          {isCurrentUser ? (
            <View style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: c.primary }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: c.onPrimary }}>You</Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {/* Delegate button (managers + admins only) */}
          {onDelegate ? (
            <MotionPressable hitSlop={5}
              onPress={onDelegate}
              haptic
              pressScale={0.94}
              accessibilityRole="button"
              style={{
                minHeight: 34,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                borderRadius: 10,
                paddingHorizontal: 12,
                backgroundColor: item.delegateId ? c.primarySoft : c.surfaceMuted,
                borderWidth: 1,
                borderColor: item.delegateId ? c.primary : c.border
              }}
            >
              <GitBranch color={item.delegateId ? c.primary : c.muted} size={13} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: item.delegateId ? c.primary : c.textSoft }}>
                {item.delegateId ? "Delegated" : "Delegate"}
              </Text>
            </MotionPressable>
          ) : null}

          {!isCurrentUser ? (
            <MotionPressable hitSlop={4}
              onPress={onDelete}
              haptic
              pressScale={0.88}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
              style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: c.errorSoft }}
            >
              <Trash2 color={c.error} size={16} />
            </MotionPressable>
          ) : null}
        </View>
      </View>
    </MotionView>
  );
};
