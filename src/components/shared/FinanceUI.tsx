import { ChevronRight } from "lucide-react-native";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { PrimaryButton } from "../ui/PrimaryButton";
import { AnimatedArc, AnimatedBar, AnimatedFill } from "./AnimatedChart";
import { GlassSheen } from "./GlassSheen";
import { MotionPressable, MotionView } from "./Motion";

// --- HeroMetricCard ------------------------------------------------------------

type HeroMetricCardProps = {
  eyebrow?: string;
  label: string;
  value: string;
  sublabel?: string;
  right?: ReactNode;
  footer?: ReactNode;
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  trustText?: string;
  accentColor?: string;
};

/** Wallet-style balance card: large tabular figure on glass. */
export const HeroMetricCard = ({
  eyebrow, label, value, sublabel, right, footer, primaryLabel, onPrimaryPress, trustText, accentColor
}: HeroMetricCardProps) => {
  const c = useThemeColors();
  const shadow = useElevation("medium");
  const accent = accentColor || c.primary;
  const { compact, fontScale } = useResponsiveLayout();

  return (
    <MotionView direction="up" style={[s.hero, shadow, { padding: compact ? 20 : 24, backgroundColor: c.surfaceGlass, borderColor: c.glassBorder }]}>
      <GlassSheen tint={accent} />
      {eyebrow ? (
        <View style={[s.eyebrow, { backgroundColor: c.primarySoft }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }} />
          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: accent }}>{eyebrow}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: fontScale > 1.3 ? "column" : "row", alignItems: "flex-start", gap: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSoft }}>{label}</Text>
          <MotionView direction="scale" delay={80}>
            <Text
              style={{ marginTop: 4, fontSize: compact ? 38 : 46, lineHeight: compact ? 46 : 54, letterSpacing: -1.8, fontWeight: "800", color: c.text, fontVariant: ["tabular-nums"] }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {value}
            </Text>
          </MotionView>
          {sublabel ? <Text style={{ marginTop: 2, fontSize: 14, lineHeight: 20, fontWeight: "500", color: c.muted }} numberOfLines={2}>{sublabel}</Text> : null}
        </View>
        {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
      </View>

      {footer ? <View style={{ marginTop: 16 }}>{footer}</View> : null}

      {(primaryLabel && onPrimaryPress) || trustText ? (
        <View style={{ marginTop: 20, gap: 12 }}>
          {primaryLabel && onPrimaryPress ? <PrimaryButton label={primaryLabel} onPress={onPrimaryPress} compact /> : null}
          {trustText ? <Text style={{ fontSize: 12, lineHeight: 18, color: c.muted }}>{trustText}</Text> : null}
        </View>
      ) : null}
    </MotionView>
  );
};

// --- PremiumCard (glass card) --------------------------------------------------

type PremiumCardProps = {
  children: ReactNode;
  delay?: number;
  compact?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const PremiumCard = ({ children, delay, compact, elevated = true, style }: PremiumCardProps) => {
  const c = useThemeColors();
  const shadow = useElevation(elevated ? "soft" : "none");
  return (
    <MotionView delay={delay} direction="up" style={[s.card, shadow, { borderColor: c.glassBorder, backgroundColor: c.surfaceGlass, padding: compact ? 16 : 20 }, style]}>
      {children}
    </MotionView>
  );
};

// --- FinanceSectionHeader ------------------------------------------------------

export const FinanceSectionHeader = ({ title, subtitle, right, top = 24, bottom = 10 }: {
  title: string; subtitle?: string; right?: ReactNode; top?: number; bottom?: number;
}) => {
  const c = useThemeColors();
  return (
    <MotionView style={{ marginTop: top, marginBottom: bottom + 2, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityRole="header" style={{ fontSize: 21, lineHeight: 26, fontWeight: "800", letterSpacing: -0.5, color: c.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, lineHeight: 18, marginTop: 2, fontWeight: "500", color: c.muted }}>{subtitle}</Text> : null}
      </View>
      {right}
    </MotionView>
  );
};

// --- ProgressBar - accepts progress (0-1) or value + max -------------------------

export const ProgressBar = ({ progress, value, max, color, trackColor, height = 6 }: {
  progress?: number; value?: number; max?: number; color?: string; trackColor?: string; height?: number;
}) => {
  const c = useThemeColors();
  const pct = progress !== undefined
    ? Math.max(0, Math.min(1, progress))
    : max && max > 0 ? Math.max(0, Math.min(1, (value || 0) / max)) : 0;
  return <AnimatedFill progress={pct} height={height} color={color || c.primary} trackColor={trackColor || c.surfaceMuted} />;
};

// --- SegmentedProgress -----------------------------------------------------------

export const SegmentedProgress = ({ segments, height = 8, trackColor }: {
  segments: Array<{ value: number; color: string }>; height?: number; trackColor?: string;
}) => {
  const c = useThemeColors();
  const total = segments.reduce((sum, seg) => sum + Math.max(seg.value, 0), 0);
  return (
    <View style={{ height, overflow: "hidden", borderRadius: height, backgroundColor: trackColor || c.surfaceMuted }}>
      {total > 0 ? (
        <MotionView direction="fade" style={{ flex: 1, flexDirection: "row", gap: 2 }}>
          {segments.filter((seg) => seg.value > 0).map((seg, i) => (
            <View key={`${seg.color}-${i}`} style={{ flex: seg.value, borderRadius: height, backgroundColor: seg.color }} />
          ))}
        </MotionView>
      ) : null}
    </View>
  );
};

// --- MiniBarChart ------------------------------------------------------------------

export const MiniBarChart = ({ data, height = 80 }: {
  data: Array<{ label?: string; value: number; color?: string }>; height?: number;
}) => {
  const c = useThemeColors();
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelH = data.some((d) => d.label) ? 20 : 0;
  return (
    <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
      {data.map((item, i) => {
        const barH = Math.max(5, (item.value / max) * (height - labelH - 4));
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            <AnimatedBar height={barH} color={item.color || c.primary} delay={i * 40} />
            {item.label ? <Text style={{ marginTop: 6, fontSize: 11, fontWeight: "600", color: c.muted, textAlign: "center" }} numberOfLines={1}>{item.label}</Text> : null}
          </View>
        );
      })}
    </View>
  );
};

// --- DonutChart ----------------------------------------------------------------------

export const DonutChart = ({ data, size = 148, strokeWidth = 18, center, trackColor }: {
  data: Array<{ label: string; value: number; color: string }>; size?: number; strokeWidth?: number; center?: ReactNode; trackColor?: string;
}) => {
  const c = useThemeColors();
  const total = data.reduce((sum, d) => sum + Math.max(d.value, 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const visible = data.filter((d) => d.value > 0);
  const gap = visible.length > 1 ? Math.min(4, circ * 0.01) : 0;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor || c.surfaceMuted} strokeWidth={strokeWidth} fill="transparent" />
          {total > 0 ? visible.map((item) => {
            const dash = (item.value / total) * circ;
            const seg = <AnimatedArc key={item.label} size={size} radius={radius} color={item.color} strokeWidth={strokeWidth} dash={Math.max(0, dash - gap)} circumference={circ} offset={offset} />;
            offset += dash;
            return seg;
          }) : null}
        </G>
      </Svg>
      {center ? <MotionView direction="scale" delay={160} style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>{center}</MotionView> : null}
    </View>
  );
};

// --- MetricPill --------------------------------------------------------------------

export const MetricPill = ({ label, value, tone = "neutral" }: {
  label: string; value: string; tone?: "neutral" | "primary" | "success" | "warning" | "error";
}) => {
  const c = useThemeColors();
  const toneMap = {
    neutral: { color: c.text, label: c.muted, bg: c.surfaceStrong },
    primary: { color: c.primary, label: c.primary, bg: c.primarySoft },
    success: { color: c.success, label: c.success, bg: c.successSoft },
    warning: { color: c.warning, label: c.warning, bg: c.warningSoft },
    error: { color: c.error, label: c.error, bg: c.errorSoft }
  };
  const t = toneMap[tone];
  return (
    <View style={{ flex: 1, minWidth: 0, borderRadius: 16, borderCurve: "continuous", backgroundColor: t.bg, paddingHorizontal: 12, paddingVertical: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: t.label, opacity: 0.9 }} numberOfLines={1}>{label}</Text>
      <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: t.color, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
};

// --- KeyValueRow - label/value pair for detail views -----------------------------------

export const KeyValueRow = ({ label, value, valueColor, icon, last = false, mono = false }: {
  label: string; value: string; valueColor?: string; icon?: ReactNode; last?: boolean; mono?: boolean;
}) => {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48, paddingVertical: 12, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.divider, gap: 12 }}>
      {icon ?? null}
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.muted }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "600", color: valueColor || c.text, maxWidth: "60%", textAlign: "right", fontVariant: mono ? ["tabular-nums"] : undefined }} numberOfLines={2}>{value}</Text>
    </View>
  );
};

// --- GroupedSection - iOS inset grouped container ----------------------------------------

export const GroupedSection = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  return (
    <MotionView direction="up" style={[{ borderRadius: 16, borderCurve: "continuous", overflow: "hidden", backgroundColor: c.surfaceGlass, borderWidth: 1, borderColor: c.glassBorder }, shadow, style]}>
      {children}
    </MotionView>
  );
};

const s = StyleSheet.create({
  hero: { marginBottom: 18, overflow: "hidden", borderRadius: 20, borderCurve: "continuous", borderWidth: 1 },
  card: { overflow: "hidden", borderRadius: 18, borderCurve: "continuous", borderWidth: 1 },
  eyebrow: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }
});

// --- LinkPill - compact "See all" style action for section headers ----------------------

export const LinkPill = ({ label, onPress }: { label: string; onPress: () => void }) => {
  const c = useThemeColors();
  return (
    <MotionPressable onPress={onPress} haptic pressScale={0.92} hitSlop={8} accessibilityRole="link"
      style={{ flexDirection: "row", alignItems: "center", gap: 2, borderRadius: 10, backgroundColor: c.primarySoft, paddingLeft: 12, paddingRight: 8, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>{label}</Text>
      <ChevronRight size={15} color={c.primary} strokeWidth={2.4} />
    </MotionPressable>
  );
};
