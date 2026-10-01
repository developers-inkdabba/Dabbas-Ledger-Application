import { ComponentType, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { AdaptiveGrid } from "./AdaptiveGrid";
import { MotionPressable, MotionView } from "./Motion";

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type ServiceTileItem = {
  id: string;
  label: string;
  caption?: string;
  icon: IconComponent;
  onPress: () => void;
  tone?: "primary" | "success" | "warning" | "error" | "info";
  badge?: string | number;
};

export type ServiceGroupItem = {
  title: string;
  items: ServiceTileItem[];
  footer?: ReactNode;
};

export const ServiceGrid = ({ groups }: { groups: ServiceGroupItem[] }) => {
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  return (
    <AdaptiveGrid minItemWidth={240} maxColumns={3} gap={20}>
      {visibleGroups.map((group, index) => (
        <MotionView key={group.title} delay={index * 60} direction="up">
          <GroupLabel label={group.title} />
          <AdaptiveGrid minItemWidth={112} maxColumns={2} gap={10}>
            {group.items.map((item) => <ServiceTile key={item.id} item={item} />)}
          </AdaptiveGrid>
          {group.footer}
        </MotionView>
      ))}
    </AdaptiveGrid>
  );
};

const GroupLabel = ({ label }: { label: string }) => {
  const c = useThemeColors();
  return <Text style={{ marginBottom: 10, marginLeft: 4, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: c.muted }}>{label}</Text>;
};

/** Control-Centre-style tile: tinted glyph plate, bold label, soft chevron. */
const ServiceTile = ({ item }: { item: ServiceTileItem }) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  const toneMap = {
    primary: { bg: c.primarySoft, fg: c.primary },
    success: { bg: c.successSoft, fg: c.success },
    warning: { bg: c.warningSoft, fg: c.warning },
    error: { bg: c.errorSoft, fg: c.error },
    info: { bg: c.infoSoft, fg: c.info }
  };
  const tone = toneMap[item.tone || "primary"];
  const Icon = item.icon;

  return (
    <MotionPressable onPress={item.onPress} haptic accessibilityRole="button" accessibilityLabel={item.caption ? `${item.label}, ${item.caption}` : item.label}
      style={[s.tile, shadow, { backgroundColor: c.surfaceGlass, borderColor: c.glassBorder }]}>
      <View style={s.top}>
        <View style={[s.iconWrap, { backgroundColor: tone.bg }]}>
          <Icon size={21} color={tone.fg} strokeWidth={2.1} />
        </View>
        {item.badge !== undefined ? (
          <View style={[s.badge, { backgroundColor: c.primary }]}>
            <Text style={[s.badgeText, { color: c.onPrimary }]}>{String(item.badge)}</Text>
          </View>
        ) : <ChevronRight size={16} color={c.muted} strokeWidth={2.2} />}
      </View>
      <Text style={[s.label, { color: c.text }]} numberOfLines={2}>{item.label}</Text>
      {item.caption ? <Text style={[s.caption, { color: c.muted }]} numberOfLines={2}>{item.caption}</Text> : null}
    </MotionPressable>
  );
};

const s = StyleSheet.create({
  tile: { width: "100%", flex: 1, minHeight: 128, borderRadius: 18, borderCurve: "continuous", borderWidth: 1, padding: 16 },
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  iconWrap: { width: 42, height: 42, borderRadius: 14, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, lineHeight: 19, fontWeight: "700", letterSpacing: -0.2 },
  caption: { marginTop: 3, fontSize: 12, lineHeight: 16, fontWeight: "500" },
  badge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  badgeText: { fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] }
});
