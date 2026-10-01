import { Search, X } from "lucide-react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { MotionPressable, MotionView } from "../shared/Motion";
import { FieldSurface } from "./FieldSurface";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

/** Rounded search field with an iOS-style clear button that pops in. */
export const SearchInput = ({ value, onChangeText, placeholder = "Search" }: Props) => {
  const c = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <FieldSurface focused={focused} radius={12}
      style={{ minHeight: 50, flexDirection: "row", alignItems: "center", borderRadius: 12, paddingLeft: 16, paddingRight: 4 }}
    >
      <Search size={18} color={focused ? c.primary : c.muted} strokeWidth={2.2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        accessibilityLabel={placeholder}
        style={{ flex: 1, minWidth: 0, marginLeft: 10, paddingVertical: 12, fontSize: 16, fontWeight: "500", color: c.text }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        selectionColor={c.primary}
        autoCorrect={false}
      />
      {value ? (
        <MotionView direction="scale">
          <MotionPressable hitSlop={4} onPress={() => onChangeText("")} accessibilityRole="button" accessibilityLabel="Clear search" style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: c.muted, alignItems: "center", justifyContent: "center" }}>
              <X size={12} color={c.backgroundElevated} strokeWidth={3} />
            </View>
          </MotionPressable>
        </MotionView>
      ) : null}
    </FieldSurface>
  );
};
