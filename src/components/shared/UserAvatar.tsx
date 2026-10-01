import { memo } from "react";
import { Text, View } from "react-native";
import { initials } from "../../utils/formatters";

/** Deterministic solid tint per name, like iOS contact monograms. */
const palette = [
  ["#7B6CF6", "#5B4BDB"], ["#FF8A65", "#F4511E"], ["#4FC3F7", "#0288D1"], ["#81C784", "#2E7D32"],
  ["#F06292", "#C2185B"], ["#FFB74D", "#EF6C00"], ["#9575CD", "#5E35B1"], ["#4DB6AC", "#00796B"]
];

const pick = (name = "") => palette[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % palette.length];

export const UserAvatar = memo(function UserAvatar({ name, size = 48 }: { name?: string; size?: number }) {
  const [, deep] = pick(name);
  return (
    <View style={{
      height: size, width: size, borderRadius: size / 2, backgroundColor: deep, alignItems: "center", justifyContent: "center", overflow: "hidden"
    }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: size * 0.38, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.3 }}>
        {initials(name)}
      </Text>
    </View>
  );
});
