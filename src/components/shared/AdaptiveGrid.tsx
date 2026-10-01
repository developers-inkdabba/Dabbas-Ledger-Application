import { Children, ReactNode, useState } from "react";
import { StyleProp, View, ViewStyle, useWindowDimensions } from "react-native";

/** Measures its own space, so nested cards and split-screen layouts also reflow. */
export function AdaptiveGrid({ children, minItemWidth = 145, maxColumns = 4, gap = 12, style }: {
  children: ReactNode;
  minItemWidth?: number;
  maxColumns?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const items = Children.toArray(children);
  const columns = Math.max(1, Math.min(maxColumns, items.length, Math.floor((width + gap) / (minItemWidth * Math.max(1, fontScale) + gap))));
  const itemWidth = width > 0 ? (width - gap * (columns - 1)) / columns : undefined;
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[{ flexDirection: "row", flexWrap: "wrap", gap }, style]}>
      {items.map((child, index) => (
        <View key={(child as { key?: string }).key || index} style={{ width: itemWidth ?? "100%", minWidth: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
