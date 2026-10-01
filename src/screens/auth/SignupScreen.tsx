import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Building2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, UserRound } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { AuthField, AuthMessage, AuthShell } from "../../components/auth/AuthShell";
import { MotionPressable } from "../../components/shared/Motion";
import { CountryPhoneField } from "../../components/ui/CountryPhoneField";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useThemeColors } from "../../hooks/useTheme";
import { authService } from "../../services/auth.service";
import { isValidInternationalPhone } from "../../utils/phone";

export const SignupScreen = () => {
  const c = useThemeColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const companyRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);
  const pinRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const errors = useMemo(() => ({
    name: name.trim().length >= 2 ? "" : "Enter your full name",
    email: /^\S+@\S+\.\S+$/.test(email.trim()) ? "" : "Enter a valid email",
    phoneNumber: !phoneNumber || isValidInternationalPhone(phoneNumber) ? "" : "Choose a country code and enter a valid phone number",
    companyName: companyName.trim().length >= 2 ? "" : "Enter your company name",
    companyCode: companyCode.trim().length >= 6 ? "" : "Enter the invite code from your admin",
    pin: /^\d{6}$/.test(pin) ? "" : "Choose a 6-digit PIN",
    confirmPin: confirmPin && confirmPin === pin ? "" : "PINs must match"
  }), [companyCode, companyName, confirmPin, email, name, phoneNumber, pin]);
  const canSubmit = Object.values(errors).every((item) => !item);

  const signup = useMutation({
    mutationFn: () => authService.signup({
      email,
      pin,
      name,
      phoneNumber: phoneNumber || undefined,
      companyName,
      companyCode
    }),
    onSuccess: () => {
      Alert.alert(
        "Request sent",
        "We sent a verification link to your inbox. After you verify, your admin or manager can approve your workspace access."
      );
      router.replace("/login" as never);
    }
  });
  const clearSignupFeedback = () => {
    if (signup.error) signup.reset();
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Request access to your company workspace"
      footer={
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ fontSize: 15, color: c.muted }}>Already have an account?</Text>
          <MotionPressable onPress={() => router.replace("/login" as never)} hitSlop={8} accessibilityRole="link" style={{ paddingVertical: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: c.primary }}>Sign in</Text>
          </MotionPressable>
        </View>
      }
    >
      <AuthField
        label="Full Name"
        value={name}
        onChangeText={(value) => {
          clearSignupFeedback();
          setName(value);
        }}
        onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        placeholder="Your name"
        icon={<UserRound color={c.muted} size={18} />}
        error={touched.name ? errors.name : ""}
      />
      <AuthField
        ref={emailRef}
        label="Email"
        value={email}
        onChangeText={(value) => {
          clearSignupFeedback();
          setEmail(value);
        }}
        onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        placeholder="name@company.com"
        icon={<Mail color={c.muted} size={18} />}
        error={touched.email ? errors.email : ""}
      />
      <CountryPhoneField
        ref={phoneRef}
        label="Phone (optional)"
        value={phoneNumber}
        onChangeText={(value) => {
          clearSignupFeedback();
          setPhoneNumber(value);
        }}
        onBlur={() => setTouched((prev) => ({ ...prev, phoneNumber: true }))}
        returnKeyType="next"
        onSubmitEditing={() => companyRef.current?.focus()}
        hint="Used only for account contact and workspace verification"
        error={touched.phoneNumber ? errors.phoneNumber : ""}
      />
      <AuthField
        ref={companyRef}
        label="Company Name"
        value={companyName}
        onChangeText={(value) => {
          clearSignupFeedback();
          setCompanyName(value);
        }}
        onBlur={() => setTouched((prev) => ({ ...prev, companyName: true }))}
        returnKeyType="next"
        onSubmitEditing={() => codeRef.current?.focus()}
        placeholder="e.g. InkDabba"
        icon={<Building2 color={c.muted} size={18} />}
        error={touched.companyName ? errors.companyName : ""}
      />
      <AuthField
        ref={codeRef}
        label="Company Invite Code"
        value={companyCode}
        onChangeText={(value) => {
          clearSignupFeedback();
          setCompanyCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12));
        }}
        onBlur={() => setTouched((prev) => ({ ...prev, companyCode: true }))}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => pinRef.current?.focus()}
        placeholder="Ask your admin for the code"
        icon={<KeyRound color={c.muted} size={18} />}
        error={touched.companyCode ? errors.companyCode : ""}
      />
      <AuthField
        ref={pinRef}
        label="6-digit PIN"
        value={pin}
        onChangeText={(value) => {
          clearSignupFeedback();
          setPin(value.replace(/\D/g, "").slice(0, 6));
        }}
        onBlur={() => setTouched((prev) => ({ ...prev, pin: true }))}
        secureTextEntry={!showPin}
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        placeholder="Create 6-digit PIN"
        icon={<LockKeyhole color={c.muted} size={18} />}
        error={touched.pin ? errors.pin : ""}
        rightAction={
          <MotionPressable accessibilityRole="button" onPress={() => setShowPin(!showPin)} hitSlop={8}>
            {showPin ? <EyeOff color={c.muted} size={18} /> : <Eye color={c.muted} size={18} />}
          </MotionPressable>
        }
      />
      <AuthField
        ref={confirmRef}
        label="Confirm PIN"
        value={confirmPin}
        onChangeText={(value) => {
          clearSignupFeedback();
          setConfirmPin(value.replace(/\D/g, "").slice(0, 6));
        }}
        onBlur={() => setTouched((prev) => ({ ...prev, confirmPin: true }))}
        secureTextEntry={!showPin}
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="go"
        onSubmitEditing={() => canSubmit && signup.mutate()}
        placeholder="Repeat 6-digit PIN"
        icon={<LockKeyhole color={c.muted} size={18} />}
        error={touched.confirmPin ? errors.confirmPin : ""}
      />

      {signup.error ? <AuthMessage title="Account setup failed" message={signup.error.message} /> : null}

      <PrimaryButton label="Request Access" loading={signup.isPending} disabled={!canSubmit} onPress={() => signup.mutate()} />
    </AuthShell>
  );
};
