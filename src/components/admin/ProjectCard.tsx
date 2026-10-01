import { FolderKanban, Pencil, Trash2 } from "lucide-react-native";
import { ReactNode } from "react";
import { Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { Project } from "../../types";
import { currency } from "../../utils/formatters";
import { PremiumCard, ProgressBar } from "../shared/FinanceUI";
import { MotionPressable } from "../shared/Motion";

type Props = {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
};

export const ProjectCard = ({ project, onEdit, onDelete, deleting }: Props) => {
  const c = useThemeColors();
  const tone = statusTone(c);

  return (
    <PremiumCard style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ marginRight: 12, width: 46, height: 46, borderRadius: 15, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <FolderKanban color={c.primary} size={21} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", letterSpacing: -0.3, color: c.text }} numberOfLines={1}>{project.projectName}</Text>
          <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "500", color: c.muted }} numberOfLines={1}>{project.clientName}</Text>
        </View>
        <View style={{ marginLeft: 10, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: tone[project.status].bg }}>
          <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "capitalize", color: tone[project.status].text }}>{project.status}</Text>
        </View>
      </View>
      <View style={{ marginTop: 14, borderRadius: 14, borderCurve: "continuous", backgroundColor: c.surfaceStrong, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: c.muted }}>Budget</Text>
            <Text style={{ marginTop: 3, fontSize: 24, fontWeight: "800", letterSpacing: -0.6, color: c.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>{currency(project.budget)}</Text>
          </View>
          {onEdit || onDelete ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {onEdit ? <ActionBtn label="Edit" onPress={onEdit} icon={<Pencil color={c.primary} size={15} />} c={c} /> : null}
              {onDelete ? <ActionBtn label="Delete" onPress={onDelete} icon={<Trash2 color={c.error} size={15} />} c={c} danger disabled={deleting} /> : null}
            </View>
          ) : null}
        </View>
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={project.status === "archived" ? 0 : 1} max={1} color={project.status === "active" ? c.primary : c.muted} />
        </View>
      </View>
    </PremiumCard>
  );
};

const ActionBtn = ({ label, icon, onPress, c, danger, disabled }: { label: string; icon: ReactNode; onPress: () => void; c: ReturnType<typeof useThemeColors>; danger?: boolean; disabled?: boolean }) => (
  <MotionPressable onPress={onPress} disabled={disabled} haptic pressScale={0.9} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}
    style={{ width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: danger ? c.errorSoft : c.primarySoft, opacity: disabled ? 0.5 : 1 }}>
    {icon}
  </MotionPressable>
);

const statusTone = (c: ReturnType<typeof useThemeColors>) => ({
  active: { bg: c.primarySoft, text: c.primary },
  completed: { bg: c.successSoft, text: c.success },
  archived: { bg: c.surfaceMuted, text: c.muted }
} as const);
