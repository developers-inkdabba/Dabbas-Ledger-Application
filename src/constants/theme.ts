/**
 * Design tokens. Apple-inspired: system-grey grounds, translucent "glass"
 * materials, one brand tint, and semantic colours tuned for AA contrast.
 */
export const lightColors = {
  primary: "#5B4BDB",
  onPrimary: "#FFFFFF",
  primaryDark: "#2F2580",
  primarySoft: "rgba(91,75,219,0.11)",
  accent: "#8B7BF2",
  accentSecondary: "#C069E8",
  background: "#F2F2F7",
  backgroundElevated: "#FFFFFF",
  surface: "rgba(255,255,255,0.74)",
  surfaceMuted: "rgba(118,118,140,0.10)",
  surfaceStrong: "rgba(255,255,255,0.88)",
  surfaceGlass: "rgba(255,255,255,0.62)",
  glassBorder: "rgba(255,255,255,0.85)",
  text: "#0C0C14",
  textSecondary: "#3A3A48",
  textSoft: "#4A4A5C",
  muted: "#6C6C7C",
  border: "rgba(60,60,90,0.10)",
  borderStrong: "rgba(60,60,90,0.18)",
  divider: "rgba(60,60,90,0.09)",
  success: "#1E8540",
  successSoft: "rgba(52,199,89,0.14)",
  warning: "#A95A00",
  warningSoft: "rgba(255,159,10,0.15)",
  error: "#D1242F",
  errorSoft: "rgba(255,59,48,0.12)",
  info: "#0A64D6",
  infoSoft: "rgba(10,132,255,0.12)",
  shadow: "#1B1640",
  white: "#FFFFFF",
  overlay: "rgba(12,10,30,0.34)"
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  primary: "#A597FF",
  onPrimary: "#130F2E",
  primaryDark: "#DDD7FF",
  primarySoft: "rgba(165,151,255,0.16)",
  accent: "#BCB0FF",
  accentSecondary: "#E08CFF",
  background: "#060609",
  backgroundElevated: "#1A1A21",
  surface: "rgba(40,40,52,0.62)",
  surfaceMuted: "rgba(120,120,140,0.20)",
  surfaceStrong: "rgba(52,52,66,0.72)",
  surfaceGlass: "rgba(34,34,46,0.56)",
  glassBorder: "rgba(255,255,255,0.10)",
  text: "#F5F5FA",
  textSecondary: "#DCDCE8",
  textSoft: "#C3C2D4",
  muted: "#93929F",
  border: "rgba(255,255,255,0.09)",
  borderStrong: "rgba(255,255,255,0.17)",
  divider: "rgba(255,255,255,0.08)",
  success: "#32D583",
  successSoft: "rgba(50,213,131,0.15)",
  warning: "#FFB547",
  warningSoft: "rgba(255,181,71,0.15)",
  error: "#FF6B63",
  errorSoft: "rgba(255,107,99,0.15)",
  info: "#62A8FF",
  infoSoft: "rgba(98,168,255,0.15)",
  shadow: "#000000",
  white: "#FFFFFF",
  overlay: "rgba(0,0,0,0.55)"
};

/**
 * Depth uses CSS box-shadow (supported natively on the New Architecture).
 * Unlike Android `elevation`, outset shadows are clipped to outside the box,
 * so translucent glass never shows a grey smear through its fill.
 */
export const shadows = {
  light: {
    none: "none",
    soft: "0px 1px 0px 0px rgba(255,255,255,0.9) inset, 0px 6px 18px -6px rgba(27,22,64,0.12)",
    medium: "0px 1px 0px 0px rgba(255,255,255,0.9) inset, 0px 14px 34px -12px rgba(27,22,64,0.18)",
    lift: "0px 1px 0px 0px rgba(255,255,255,0.95) inset, 0px 22px 48px -16px rgba(27,22,64,0.26)"
  },
  dark: {
    none: "none",
    soft: "0px 1px 0px 0px rgba(255,255,255,0.07) inset, 0px 8px 20px -8px rgba(0,0,0,0.6)",
    medium: "0px 1px 0px 0px rgba(255,255,255,0.08) inset, 0px 16px 36px -12px rgba(0,0,0,0.7)",
    lift: "0px 1px 0px 0px rgba(255,255,255,0.10) inset, 0px 24px 52px -16px rgba(0,0,0,0.8)"
  }
} as const;

export type ShadowLevel = keyof typeof shadows.light;

export const categories = [
  "Travel",
  "Porter",
  "Food",
  "Print",
  "Ads",
  "Software",
  "Shoot",
  "Props",
  "Client Meeting",
  "Office Purchase",
  "Miscellaneous"
] as const;

export const paymentModes = ["Cash", "UPI", "Card", "Bank Transfer"] as const;

export const statuses = ["pending_manager", "approved", "rejected", "paid"] as const;

export const statusConfig: Record<string, { label: string; tone: "warning" | "success" | "error" | "info" }> = {
  pending_manager: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
  paid: { label: "Paid", tone: "info" }
};

export const chartColors = {
  pending: "#FF9F0A",
  approved: "#30C06A",
  paid: "#5B4BDB",
  rejected: "#FF453A",
  neutral: "#C7C4D6",
  graphite: "#1B1640",
  lavenderSoft: "#EEEAFE",
  primary: "#5B4BDB",
  secondary: "#C069E8",
  muted: "#C7C4D6",
  grid: "#E6E3F0"
};

/** Categorical series for charts: distinct hues, readable in both themes. */
export const seriesColors = [
  "#5B4BDB", "#0A84FF", "#30B0C7", "#30C06A", "#FF9F0A", "#FF375F",
  "#BF5AF2", "#AC8E68", "#64D2FF", "#8E8E93", "#FF453A"
];
