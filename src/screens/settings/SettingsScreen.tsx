import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { BarChart3, Building2, ChevronRight, Fingerprint, HelpCircle, LifeBuoy, LogOut, Moon, ScanFace, ShieldCheck } from "lucide-react-native";
import { ReactNode, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { AppContainer } from "../../components/shared/AppContainer";
import { ConfirmSheet } from "../../components/shared/ConfirmSheet";
import { GlassSheen } from "../../components/shared/GlassSheen";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { ScreenHeader } from "../../components/shared/ScreenHeader";
import { ThemeToggle } from "../../components/shared/ThemeToggle";
import { UserAvatar } from "../../components/shared/UserAvatar";
import { Toggle } from "../../components/ui/Toggle";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { checkBiometricAvailability, disableBiometricLogin, enableBiometricLogin, isBiometricEnabled } from "../../services/biometric.service";
import { useAuthStore } from "../../store/auth.store";

export const SettingsScreen = () => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Fingerprint");
  const [biometricSaving, setBiometricSaving] = useState(false);
  const workspaceName = user?.requestedCompanyName || "Workspace";
  const roleLabel = (user?.role || "employee").replace(/^\w/, (char) => char.toUpperCase());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [enabled, availability] = await Promise.all([
        isBiometricEnabled(),
        checkBiometricAvailability()
      ]);
      if (!mounted) return;
      setBiometricEnabled(enabled);
      setBiometricAvailable(availability.available);
      setBiometricLabel(availability.label);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const toggleBiometric = async (next: boolean) => {
    setBiometricSaving(true);
    try {
      if (next) {
        const result = await enableBiometricLogin();
        if (!result.success) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(`${biometricLabel} unavailable`, result.error || "Use your PIN to sign in.");
          return;
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBiometricEnabled(true);
        return;
      }
      await disableBiometricLogin();
      setBiometricEnabled(false);
      await Haptics.selectionAsync();
    } finally {
      setBiometricSaving(false);
    }
  };

  return (
    <AppContainer form>
      <ScreenHeader title="Profile" subtitle="Your account and app preferences" />

      <MotionView direction="up" style={[s.profileCard, shadow, { backgroundColor: c.surfaceGlass, borderColor: c.glassBorder }]}>
        <GlassSheen />
        <View style={s.profileRow}>
          <UserAvatar name={user?.name} size={68} />
          <View style={s.profileText}>
            <Text style={[s.profileName, { color: c.text }]} numberOfLines={1}>
              {user?.name || "Team member"}
            </Text>
            <Text style={[s.profileEmail, { color: c.muted }]} numberOfLines={1}>
              {user?.email || "Dabba's Ledger user"}
            </Text>
          </View>
        </View>
        <View style={s.profileMeta}>
          <View style={[s.metaChip, { backgroundColor: c.primarySoft }]}>
            <ShieldCheck size={13} color={c.primary} strokeWidth={2.4} />
            <Text style={[s.metaText, { color: c.primary }]} numberOfLines={1}>{roleLabel}</Text>
          </View>
          <View style={[s.metaChip, { backgroundColor: c.surfaceMuted, flexShrink: 1 }]}>
            <Building2 size={13} color={c.textSoft} strokeWidth={2.2} />
            <Text style={[s.metaText, { color: c.textSoft }]} numberOfLines={1}>{workspaceName}</Text>
          </View>
        </View>
      </MotionView>

      <SectionGroup label="Preferences" index={0}>
        <SettingRow
          icon={<BarChart3 size={17} color="#FFFFFF" strokeWidth={2.3} />}
          iconBg="#0A84FF"
          label="Reports"
          value="View"
          onPress={() => router.push("/reports" as never)}
        />
        <View style={[s.row, { flexDirection: "column", alignItems: "stretch", gap: 12 }]}>
          <View style={s.rowLeft}>
            <IconBubble bg="#5E5CE6"><Moon size={17} color="#FFFFFF" strokeWidth={2.3} /></IconBubble>
            <View style={s.rowText}>
              <Text style={[s.rowLabel, { color: c.text }]}>Appearance</Text>
              <Text style={[s.rowDescription, { color: c.muted }]}>Light, dark, or follow system</Text>
            </View>
          </View>
          <ThemeToggle />
        </View>
      </SectionGroup>

      <SectionGroup label="Security" index={1}>
        <View style={[s.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider }]}>
          <View style={s.rowLeft}>
            <IconBubble bg="#FF375F">
              {biometricLabel.toLowerCase().includes("face")
                ? <ScanFace size={17} color="#FFFFFF" strokeWidth={2.3} />
                : <Fingerprint size={17} color="#FFFFFF" strokeWidth={2.3} />}
            </IconBubble>
            <View style={s.rowText}>
              <Text style={[s.rowLabel, { color: c.text }]} numberOfLines={1}>{biometricLabel}</Text>
              <Text style={[s.rowDescription, { color: c.muted }]} numberOfLines={1}>
                {biometricAvailable ? "Use biometric unlock" : "Not available on this device"}
              </Text>
            </View>
          </View>
          <Toggle
            value={biometricEnabled && biometricAvailable}
            disabled={!biometricAvailable || biometricSaving}
            onValueChange={(v) => void toggleBiometric(v)}
            accessibilityLabel={`Use ${biometricLabel}`}
          />
        </View>
        <SettingRow
          icon={<ShieldCheck size={17} color="#FFFFFF" strokeWidth={2.3} />}
          iconBg="#30C06A"
          label="PIN login"
          value="Enabled"
          last
        />
      </SectionGroup>

      <SectionGroup label="Support" index={2}>
        <SettingRow
          icon={<LifeBuoy size={17} color="#FFFFFF" strokeWidth={2.3} />}
          iconBg="#FF9F0A"
          label="Help center"
          value="Open"
          onPress={() => Linking.openURL("https://inkdabba.com/support")}
        />
        <SettingRow
          icon={<HelpCircle size={17} color="#FFFFFF" strokeWidth={2.3} />}
          iconBg="#8E8E93"
          label="Version"
          value={Constants.expoConfig?.version || "1.0.0"}
          last
        />
      </SectionGroup>

      <MotionView delay={200} direction="up">
        <MotionPressable
          onPress={() => setLogoutOpen(true)}
          haptic
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={[s.signOut, shadow, { borderColor: c.glassBorder, backgroundColor: c.surfaceGlass }]}
        >
          <LogOut color={c.error} size={18} strokeWidth={2.3} />
          <Text style={[s.signOutText, { color: c.error }]}>Sign out</Text>
        </MotionPressable>
      </MotionView>

      <ConfirmSheet
        visible={logoutOpen}
        title="Sign out?"
        message="You'll need your email and 6-digit PIN to sign back in."
        confirmLabel="Sign Out"
        onConfirm={() => void logout()}
        onClose={() => setLogoutOpen(false)}
      />
    </AppContainer>
  );
};

const SectionGroup = ({ label, children, index }: { label: string; children: ReactNode; index: number }) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  return (
    <MotionView delay={60 + index * 60} direction="up" style={s.section}>
      <Text style={[s.sectionLabel, { color: c.muted }]}>{label}</Text>
      <View style={[s.sectionCard, shadow, { backgroundColor: c.surfaceGlass, borderColor: c.glassBorder }]}>
        {children}
      </View>
    </MotionView>
  );
};

const IconBubble = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <View style={[s.iconBubble, { backgroundColor: bg }]}>{children}</View>
);

const SettingRow = ({
  icon, iconBg, label, value, onPress, last
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  onPress?: () => void;
  last?: boolean;
}) => {
  const c = useThemeColors();
  const content = (
    <>
      <View style={s.rowLeft}>
        <IconBubble bg={iconBg}>{icon}</IconBubble>
        <Text style={[s.rowLabel, { color: c.text }]} numberOfLines={1}>{label}</Text>
      </View>
      <View style={s.rowRight}>
        <Text style={[s.rowValue, { color: c.muted }]} numberOfLines={1}>{value}</Text>
        {onPress ? <ChevronRight size={17} color={c.muted} strokeWidth={2.2} /> : null}
      </View>
    </>
  );
  const rowStyle = [s.row, { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.divider }];
  return onPress ? (
    <MotionPressable onPress={onPress} haptic pressScale={0.985} accessibilityRole="button" accessibilityLabel={label} style={rowStyle}>{content}</MotionPressable>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
};

const s = StyleSheet.create({
  profileCard: { marginBottom: 26, borderRadius: 20, borderCurve: "continuous", borderWidth: 1, padding: 20, overflow: "hidden" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.6 },
  profileEmail: { marginTop: 2, fontSize: 15, lineHeight: 20, fontWeight: "500" },
  profileMeta: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  metaChip: { minHeight: 32, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { flexShrink: 1, fontSize: 13, fontWeight: "700" },
  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.7, marginBottom: 8, paddingHorizontal: 6, textTransform: "uppercase" },
  sectionCard: { borderRadius: 16, borderCurve: "continuous", borderWidth: 1, overflow: "hidden" },
  iconBubble: { width: 32, height: 32, borderRadius: 9, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  row: { minHeight: 58, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  rowLeft: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 14 },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 16, lineHeight: 21, fontWeight: "600" },
  rowDescription: { marginTop: 1, fontSize: 13, lineHeight: 17, fontWeight: "500" },
  rowRight: { maxWidth: "44%", flexDirection: "row", alignItems: "center", gap: 4 },
  rowValue: { fontSize: 15, fontWeight: "500" },
  signOut: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 56, borderRadius: 16, borderCurve: "continuous", borderWidth: 1, marginBottom: 8 },
  signOutText: { fontSize: 16, fontWeight: "700" }
});
