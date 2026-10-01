import { Image, View } from "react-native";

const brandIcon = require("../assets/brand-icon.png");

export function Logo({ width = 80, height = 80 }: { width?: number; height?: number }) {
  const size = Math.min(width, height);
  return (
    <View style={{ width, height, borderRadius: Math.max(18, size * 0.24), borderCurve: "continuous", overflow: "hidden", justifyContent: "center", alignItems: "center" }}>
      <Image source={brandIcon} style={{ width: "100%", height: "100%" }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}
