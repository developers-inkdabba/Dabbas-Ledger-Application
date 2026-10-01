import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowLeft, Mail } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Text } from "react-native";
import { AuthField, AuthMessage, AuthShell } from "../../components/auth/AuthShell";
import { MotionPressable } from "../../components/shared/Motion";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useThemeColors } from "../../hooks/useTheme";
import { authService } from "../../services/auth.service";

export const ForgotPasswordScreen = () => {
  const c = useThemeColors();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const error = useMemo(() => (/^\S+@\S+\.\S+$/.test(email.trim()) ? "" : "Enter a valid email"), [email]);

  const reset = useMutation({
    mutationFn: () => authService.sendPasswordResetEmail(email),
    onSuccess: () => {
      Alert.alert("Reset email sent", "Open the link in your inbox to create a new 6-digit PIN.");
      router.replace("/login" as never);
    }
  });
  const updateEmail = (value: string) => {
    if (reset.error) reset.reset();
    setEmail(value);
  };

  return (
    <AuthShell
      title="Reset PIN"
      subtitle="Enter your email and we'll send a secure PIN reset link"
      badge={<Mail color={c.primary} size={36} strokeWidth={1.8} />}
      footer={
        <MotionPressable onPress={() => router.replace("/login" as never)} hitSlop={8} accessibilityRole="link"
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 }}>
          <ArrowLeft color={c.primary} size={17} strokeWidth={2.2} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: c.primary }}>Back to sign in</Text>
        </MotionPressable>
      }
    >
      <AuthField
        label="Email"
        value={email}
        onChangeText={updateEmail}
        onBlur={() => setTouched(true)}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="go"
        onSubmitEditing={() => !error && reset.mutate()}
        placeholder="name@company.com"
        icon={<Mail color={c.muted} size={18} />}
        error={touched ? error : ""}
      />

      {reset.error ? <AuthMessage title="Reset link not sent" message={reset.error.message} /> : null}

      <PrimaryButton label="Send PIN Reset" loading={reset.isPending} disabled={Boolean(error)} onPress={() => reset.mutate()} />
    </AuthShell>
  );
};
