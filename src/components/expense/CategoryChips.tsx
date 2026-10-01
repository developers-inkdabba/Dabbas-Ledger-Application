import { ScrollView, Text, View } from "react-native";
import { getCategoryMeta, withAlpha } from "../../constants/categoryMeta";
import { categories } from "../../constants/theme";
import { useSelectionStyle } from "../../hooks/useSelectionStyle";
import { useThemeColors } from "../../hooks/useTheme";
import { ExpenseCategory } from "../../types";
import { MotionPressable, MotionView } from "../shared/Motion";

export const CategoryChips = ({ value, onChange }: { value: ExpenseCategory; onChange: (value: ExpenseCategory) => void }) => {
  const c = useThemeColors();
  return (
    <MotionView style={{ marginBottom: 20 }}>
      <Text style={{ marginBottom: 10, marginLeft: 4, fontSize: 12, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingRight: 8, paddingVertical: 2 }}>
        {categories.map((category) => (
          <CategoryChip key={category} category={category} active={value === category} onPress={() => onChange(category)} />
        ))}
      </ScrollView>
    </MotionView>
  );
};

const CategoryChip = ({ category, active, onPress }: { category: ExpenseCategory; active: boolean; onPress: () => void }) => {
  const c = useThemeColors();
  const { Icon, tint } = getCategoryMeta(category);
  const selection = useSelectionStyle(active);
  return (
    <MotionPressable onPress={onPress} haptic pressScale={0.94} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={category}
      style={[{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 46, paddingLeft: 6, paddingRight: 14, borderRadius: 10, borderWidth: 1 }, selection]}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: active ? tint : withAlpha(tint, 0.14), alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={active ? "#FFFFFF" : tint} strokeWidth={2.2} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: active ? "700" : "600", color: active ? c.primary : c.text }} numberOfLines={1}>{category}</Text>
    </MotionPressable>
  );
};
