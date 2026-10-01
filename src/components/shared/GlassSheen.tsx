import { memo, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useIsDark } from "../../hooks/useTheme";

/** Faint specular wash for hero cards only. Static: no blur, timers or bitmaps. */
export const GlassSheen = memo(function GlassSheen({ tint = "#A597FF" }: { tint?: string }) {
  const dark = useIsDark();
  const id = useId().replace(/:/g, "");
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={dark ? 0.04 : 0.3} />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="1" stopColor={tint} stopOpacity={dark ? 0.04 : 0.05} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});
