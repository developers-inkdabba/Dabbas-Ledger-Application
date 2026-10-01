import { AlertCircle, ShieldCheck } from "lucide-react-native";
import { forwardRef, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TextInputProps, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { GradientBackground } from "../GradientBackground";
import { StatusStrip } from "../shared/AppContainer";
import { Logo } from "../Logo";
import { MotionView } from "../shared/Motion";
import { FormField } from "../ui/FormField";

type ShellProps = {
  title: string;
  subtitle: string;
  /** Replaces the logo tile (e.g. a mail glyph on the reset screen). */
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Shared frame for sign-in flows. Phones get a centred single column; unfolded
 * foldables, tablets and landscape get a split layout with the brand on the left.
 */
export const AuthShell = ({ title, subtitle, badge, children, footer }: ShellProps) => {
  const c = useThemeColors();
  const shadow = useElevation("lift");
  const insets = useSafeAreaInsets();
  const { width, height, compact } = useResponsiveLayout();
  const split = width >= 760 || (width > height && width >= 640);

  const brand = (
    <MotionView direction="down" style={{ alignItems: split ? "flex-start" : "center", marginBottom: split ? 0 : 26 }}>
      <MotionView direction="scale" style={[{ marginBottom: 20, width: 88, height: 88, borderRadius: 20, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceGlass, borderWidth: 1, borderColor: c.glassBorder }, shadow]}>
        {badge ?? <Logo width={64} height={64} />}
      </MotionView>
      <Text accessibilityRole="header" style={{ fontSize: split ? 44 : compact ? 30 : 34, lineHeight: split ? 50 : compact ? 36 : 40, letterSpacing: split ? -1.4 : -1, fontWeight: "800", color: c.text, textAlign: split ? "left" : "center" }}>
        {title}
      </Text>
      <Text style={{ marginTop: 8, maxWidth: 380, fontSize: 16, lineHeight: 22, color: c.muted, textAlign: split ? "left" : "center" }}>{subtitle}</Text>
      {split ? <TrustNote style={{ marginTop: 28 }} /> : null}
    </MotionView>
  );

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1, justifyContent: "center", width: "100%", maxWidth: split ? 1040 : 480, alignSelf: "center",
            paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28,
            paddingLeft: Math.max(insets.left, compact ? 16 : 22), paddingRight: Math.max(insets.right, compact ? 16 : 22)
          }}
        >
          <View style={{ flexDirection: split ? "row" : "column", alignItems: split ? "center" : "stretch", gap: split ? 48 : 0 }}>
            <View style={{ flex: split ? 1 : undefined }}>{brand}</View>
            <View style={{ flex: split ? 1 : undefined, maxWidth: split ? 460 : undefined, width: "100%" }}>
              <MotionView delay={90} direction="up" style={[{ borderRadius: 22, borderCurve: "continuous", padding: compact ? 18 : 22, borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surfaceGlass }, shadow]}>
                {children}
              </MotionView>
              {footer ? <MotionView delay={180} style={{ marginTop: 18 }}>{footer}</MotionView> : null}
              {!split ? <TrustNote style={{ marginTop: 24, alignSelf: "center" }} /> : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusStrip />
    </GradientBackground>
  );
};

const TrustNote = ({ style }: { style?: object }) => {
  const c = useThemeColors();
  return (
    <MotionView delay={220} style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>
      <ShieldCheck color={c.success} size={16} strokeWidth={2.2} />
      <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted }}>Secure sign-in for your company workspace</Text>
    </MotionView>
  );
};

export const AuthField = forwardRef<TextInput, TextInputProps & { label: string; icon: ReactNode; error?: string; rightAction?: ReactNode }>(
  function AuthField({ label, icon, error, rightAction, ...props }, ref) {
    return <FormField ref={ref} label={label} leftIcon={icon} error={error} rightIcon={rightAction} {...props} />;
  }
);

export const AuthMessage = ({ title, message }: { title: string; message: string }) => {
  const c = useThemeColors();
  return (
    <MotionView key={message} direction="down" style={{ marginBottom: 16, flexDirection: "row", gap: 10, borderRadius: 14, backgroundColor: c.errorSoft, paddingHorizontal: 14, paddingVertical: 12 }}>
      <AlertCircle color={c.error} size={18} strokeWidth={2.2} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: c.error }}>{title}</Text>
        <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: "500", color: c.textSoft }}>{message}</Text>
      </View>
    </MotionView>
  );
};
