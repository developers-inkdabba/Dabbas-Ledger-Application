import { forwardRef, ReactNode, useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { MotionView } from "../shared/Motion";
import { FieldSurface } from "./FieldSurface";

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export const FormField = forwardRef<TextInput, Props>(function FormField({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  multiline,
  onFocus,
  onBlur,
  ...props
}, ref) {
  const c = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={s.wrapper}>
      <Text style={[s.label, { color: focused ? c.primary : c.textSoft }]}>{label}</Text>
      <FieldSurface focused={focused} invalid={Boolean(error)}
        style={[s.inputBox, multiline ? { alignItems: "flex-start", minHeight: 112, paddingVertical: 12 } : { alignItems: "center", minHeight: 54 }]}
      >
        {leftIcon ? <View style={{ marginRight: 10 }}>{leftIcon}</View> : null}
        <TextInput ref={ref}
          style={[s.input, { color: c.text }, multiline ? { minHeight: 76, textAlignVertical: "top" } : null]}
          placeholderTextColor={c.muted}
          selectionColor={c.primary}
          accessibilityLabel={label}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          autoCorrect={props.autoCorrect ?? false}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...props}
        />
        {rightIcon ? <View style={{ marginLeft: 10 }}>{rightIcon}</View> : null}
      </FieldSurface>
      {error ? (
        <MotionView key={error} direction="down"><Text accessibilityLiveRegion="polite" style={[s.helper, { color: c.error }]}>{error}</Text></MotionView>
      ) : hint ? (
        <Text style={[s.helper, { color: c.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const s = StyleSheet.create({
  wrapper: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8, paddingHorizontal: 4 },
  inputBox: { flexDirection: "row", paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 16, fontWeight: "500", minWidth: 0, paddingVertical: 12 },
  helper: { marginTop: 6, fontSize: 12, fontWeight: "500", lineHeight: 17, paddingHorizontal: 4 }
});
