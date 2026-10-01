import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Window-class breakpoints (Material window size classes, which also cover
 * foldables): compact < 380dp, medium, wide >= 700dp (unfolded / tablet).
 * Values update live when a foldable opens, rotates, or enters split screen.
 */
export const useResponsiveLayout = () => {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableWidth = Math.max(0, width - insets.left - insets.right);
  const compact = availableWidth < 380;
  const wide = availableWidth >= 700;
  const gutter = compact ? 16 : wide ? 32 : 20;
  return {
    width: availableWidth, height, fontScale, compact, wide, gutter,
    contentWidth: Math.max(0, Math.min(availableWidth, 1120) - gutter * 2),
    bottomPadding: 116 + Math.max(insets.bottom, 12),
    formWidth: 680,
  };
};
