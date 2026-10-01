import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, Eye, EyeOff, Fingerprint, LockKeyhole, Mail, ScanFace } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { AuthField, AuthMessage, AuthShell } from "../../components/auth/AuthShell";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useThemeColors } from "../../hooks/useTheme";
import { authService } from "../../services/auth.service";
import { authenticateWithBiometrics, checkBiometricAvailability, isBiometricEnabled } from "../../services/biometric.service";
import { useAuthStore } from "../../store/auth.store";

export const LoginScreen = () => {
  const c = useThemeColors();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [biometricVisible, setBiometricVisible] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Fingerprint");
  const [biometricError, setBiometricError] = useState<string>();
  const [biometricLoading, setBiometricLoading] = useState(false);
  const pinRef = useRef<TextInput>(null);
  const setSession = useAuthStore((state) => state.setSession);

  const errors = useMemo(() => ({
    email: email.trim() && /^\S+@\S+\.\S+$/.test(email.trim()) ? "" : "Enter a valid email",
    pin: /^\d{6}$/.test(pin) ? "" : "Enter your 6-digit PIN"
  }), [email, pin]);
  const canSubmit = !errors.email && !errors.pin;

  const login = useMutation({
    mutationFn: () => authService.login(email, pin),
    onSuccess: async ({ token, user }) => {
      await setSession(token, user);
      router.replace("/");
    }
  });

  useEffect(() => {
    let mounted = true;
    const prepareBiometricButton = async () => {
      const [enabled, availability] = await Promise.all([
        isBiometricEnabled(),
        checkBiometricAvailability()
      ]);
      if (!mounted) return;
      setBiometricLabel(availability.label);
      setBiometricVisible(enabled && availability.available);
    };

    void prepareBiometricButton();
    return () => {
      mounted = false;
    };
  }, []);

  const resendVerification = useMutation({
    mutationFn: authService.sendEmailVerification,
    onSuccess: () => Alert.alert("Verification sent", "Check your inbox for a new verification link.")
  });

  const needsVerification = login.error?.message.toLowerCase().includes("verify");
  const authMessage = login.error?.message || resendVerification.error?.message;
  const authMessageTitle = resendVerification.error ? "Verification email not sent" : "Sign in failed";
  const clearAuthFeedback = () => {
    if (login.error) login.reset();
    if (resendVerification.error) resendVerification.reset();
    if (biometricError) setBiometricError(undefined);
  };
  const updateEmail = (value: string) => {
    clearAuthFeedback();
    setEmail(value);
  };
  const updatePin = (value: string) => {
    clearAuthFeedback();
    setPin(value.replace(/\D/g, "").slice(0, 6));
  };
  const unlockWithBiometrics = async () => {
    clearAuthFeedback();
    setBiometricLoading(true);
    const result = await authenticateWithBiometrics(`Unlock with ${biometricLabel}`);

    if (!result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setBiometricLoading(false);
      setBiometricError(result.error);
      return;
    }

    try {
      const user = await authService.me();
      await setSession(user.authUid || user._id || "", user);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setBiometricError(error instanceof Error ? error.message : "Use your PIN to sign in again.");
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your expense workspace"
      footer={
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ fontSize: 15, color: c.muted }}>New here?</Text>
          <MotionPressable onPress={() => router.push("/signup" as never)} hitSlop={8} accessibilityRole="link" style={{ paddingVertical: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: c.primary }}>Create account</Text>
          </MotionPressable>
        </View>
      }
    >
      <AuthField
        label="Email"
        value={email}
        onChangeText={updateEmail}
        onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => pinRef.current?.focus()}
        placeholder="name@company.com"
        icon={<Mail color={c.muted} size={18} />}
        error={touched.email ? errors.email : ""}
      />
      <AuthField
        ref={pinRef}
        label="6-digit PIN"
        value={pin}
        onChangeText={updatePin}
        onBlur={() => setTouched((prev) => ({ ...prev, pin: true }))}
        secureTextEntry={!showPin}
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="go"
        onSubmitEditing={() => canSubmit && login.mutate()}
        placeholder="Enter your PIN"
        icon={<LockKeyhole color={c.muted} size={18} />}
        error={touched.pin ? errors.pin : ""}
        rightAction={
          <MotionPressable onPress={() => setShowPin(!showPin)} hitSlop={10} pressScale={0.85} accessibilityRole="button" accessibilityLabel={showPin ? "Hide PIN" : "Show PIN"}>
            {showPin ? <EyeOff color={c.primary} size={19} /> : <Eye color={c.muted} size={19} />}
          </MotionPressable>
        }
      />

      <View style={{ marginBottom: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <MotionPressable onPress={() => setKeepSignedIn(!keepSignedIn)} haptic accessibilityRole="checkbox" accessibilityState={{ checked: keepSignedIn }}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
          <View style={{
            width: 22, height: 22, borderRadius: 7, borderWidth: 1.5,
            borderColor: keepSignedIn ? c.primary : c.borderStrong,
            backgroundColor: keepSignedIn ? c.primary : "transparent",
            alignItems: "center", justifyContent: "center"
          }}>
            {keepSignedIn ? <MotionView direction="scale"><Check color={c.onPrimary} size={12} strokeWidth={3.2} /></MotionView> : null}
          </View>
          <Text style={{ fontSize: 15, color: c.text }}>Keep me signed in</Text>
        </MotionPressable>
        <MotionPressable onPress={() => router.push("/forgot-password" as never)} hitSlop={8} accessibilityRole="link" style={{ paddingVertical: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.primary }}>Forgot PIN?</Text>
        </MotionPressable>
      </View>

      {authMessage ? <AuthMessage title={authMessageTitle} message={authMessage} /> : null}
      {biometricError ? <AuthMessage title={`${biometricLabel} unlock failed`} message={biometricError} /> : null}

      <PrimaryButton label="Sign In" loading={login.isPending} disabled={!canSubmit} onPress={() => login.mutate()} />

      {biometricVisible ? (
        <BiometricAuthButton label={biometricLabel} loading={biometricLoading} onPress={unlockWithBiometrics} />
      ) : null}

      {needsVerification ? (
        <MotionView direction="up" style={{ marginTop: 10 }}>
          <PrimaryButton variant="secondary" label={resendVerification.isPending ? "Sending..." : "Resend verification email"} onPress={() => resendVerification.mutate()} compact />
        </MotionView>
      ) : null}
    </AuthShell>
  );
};

const BiometricAuthButton = ({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) => {
  const c = useThemeColors();
  const Icon = label.toLowerCase().includes("face") ? ScanFace : Fingerprint;
  return (
    <MotionView direction="up" style={{ marginTop: 10 }}>
      <PrimaryButton
        variant="ghost"
        label={loading ? "Verifying..." : `Unlock with ${label}`}
        loading={loading}
        onPress={onPress}
        icon={<Icon color={c.primary} size={20} />}
      />
    </MotionView>
  );
};
