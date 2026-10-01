import { ReactNode } from "react";
import { Text, View } from "react-native";
import { categories, paymentModes, statuses } from "../../constants/theme";
import { useThemeColors } from "../../hooks/useTheme";
import { User } from "../../types";
import { ChoiceChip } from "../ui/ChoiceChip";
import { PrimaryButton } from "../ui/PrimaryButton";
import { AdaptiveSheet } from "./AdaptiveSheet";
import { MotionPressable, MotionView } from "./Motion";

type Props = {
  visible: boolean;
  status: string;
  category: string;
  paymentMode: string;
  userId: string;
  users?: User[];
  onStatus: (value: string) => void;
  onCategory: (value: string) => void;
  onPaymentMode: (value: string) => void;
  onUserId: (value: string) => void;
  onReset?: () => void;
  onClose: () => void;
};

const statusOptions = ["all", ...statuses];
const categoryOptions = ["all", ...categories];
const paymentOptions = ["all", ...paymentModes];

export const FilterSheet = ({
  visible, status, category, paymentMode, userId, users = [],
  onStatus, onCategory, onPaymentMode, onUserId, onReset, onClose
}: Props) => {
  const c = useThemeColors();
  const people = [{ id: "all", name: "All" }, ...users.map((u) => ({ id: u._id || u.id || u.userCode, name: u.name || u.email }))];

  return (
    <AdaptiveSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <View style={{ minWidth: 0, flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", letterSpacing: -0.5, color: c.text }}>Filters</Text>
          <Text style={{ marginTop: 2, fontSize: 14, color: c.muted }}>Refine the ledger view</Text>
        </View>
        {onReset ? (
          <MotionPressable onPress={onReset} haptic accessibilityRole="button" style={{ borderRadius: 10, backgroundColor: c.primarySoft, paddingHorizontal: 16, paddingVertical: 9 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.primary }}>Reset</Text>
          </MotionPressable>
        ) : null}
      </View>
      <FilterSection label="Status" index={0}>
        {statusOptions.map((item) => <Chip key={item} label={item} active={status === item} onPress={() => onStatus(item)} />)}
      </FilterSection>
      <FilterSection label="Payment Mode" index={1}>
        {paymentOptions.map((item) => <Chip key={item} label={item} active={paymentMode === item} onPress={() => onPaymentMode(item)} />)}
      </FilterSection>
      {users.length > 1 ? (
        <FilterSection label="Team Member" index={2}>
          {people.map((item) => <Chip key={item.id} label={item.name} active={userId === item.id} onPress={() => onUserId(item.id)} />)}
        </FilterSection>
      ) : null}
      <FilterSection label="Category" index={3}>
        {categoryOptions.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => onCategory(item)} />)}
      </FilterSection>
      <View style={{ marginTop: 26 }}>
        <PrimaryButton label="Apply Filters" onPress={onClose} />
      </View>
    </AdaptiveSheet>
  );
};

const FilterSection = ({ label, children, index }: { label: string; children: ReactNode; index: number }) => {
  const c = useThemeColors();
  return (
    <MotionView delay={index * 50} direction="up" style={{ marginTop: 22 }}>
      <Text style={{ marginBottom: 10, marginLeft: 2, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, color: c.muted }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>
    </MotionView>
  );
};

const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <ChoiceChip label={label.replace("_", " ")} active={active} onPress={onPress} capitalize />
);
