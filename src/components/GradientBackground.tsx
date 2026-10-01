import { memo, ReactNode, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useIsDark, useThemeColors } from "../hooks/useTheme";

/** Two faint colour washes behind the glass. Static SVG, two fills: negligible render cost. */
const Aurora = memo(function Aurora({ dark, base }: { dark: boolean; base: string }) {
  const id = useId().replace(/:/g, "");
  const fields = dark
    ? [
        { key: "a", cx: "92%", cy: "0%", rx: "90%", ry: "50%", color: "#5B3FD9", opacity: 0.16 },
        { key: "b", cx: "0%", cy: "100%", rx: "80%", ry: "40%", color: "#1E4FD8", opacity: 0.07 }
      ]
    : [
        { key: "a", cx: "95%", cy: "0%", rx: "95%", ry: "50%", color: "#B9ABFF", opacity: 0.28 },
        { key: "b", cx: "0%", cy: "100%", rx: "85%", ry: "40%", color: "#A8D4FF", opacity: 0.2 }
      ];
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          {fields.map((f) => (
            <RadialGradient key={f.key} id={`${id}${f.key}`} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fx={f.cx} fy={f.cy}>
              <Stop offset="0" stopColor={f.color} stopOpacity={f.opacity} />
              <Stop offset="1" stopColor={base} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>
        {fields.map((f) => <Rect key={f.key} width="100%" height="100%" fill={`url(#${id}${f.key})`} />)}
      </Svg>
    </View>
  );
});

export function GradientBackground({ children }: { children: ReactNode }) {
  const c = useThemeColors();
  const dark = useIsDark();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Aurora dark={dark} base={c.background} />
      {children}
    </View>
  );
}
