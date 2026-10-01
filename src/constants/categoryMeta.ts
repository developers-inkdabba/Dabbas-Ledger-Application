import {
  BadgeIndianRupee, Camera, Car, Coffee, CreditCard, Landmark, LucideIcon, Megaphone,
  MonitorCog, Package, Printer, ShoppingBag, Truck, Utensils, Wallet, Zap
} from "lucide-react-native";

/** iOS-style app-icon tints: each category gets a recognisable colour and glyph. */
const categoryMeta: Record<string, { Icon: LucideIcon; tint: string }> = {
  Travel: { Icon: Car, tint: "#0A84FF" },
  Porter: { Icon: Truck, tint: "#FF9F0A" },
  Food: { Icon: Utensils, tint: "#FF453A" },
  Print: { Icon: Printer, tint: "#8E8E93" },
  Ads: { Icon: Megaphone, tint: "#BF5AF2" },
  Software: { Icon: MonitorCog, tint: "#5E5CE6" },
  Shoot: { Icon: Camera, tint: "#FF375F" },
  Props: { Icon: Package, tint: "#AC8E68" },
  "Client Meeting": { Icon: Coffee, tint: "#30B0C7" },
  "Office Purchase": { Icon: ShoppingBag, tint: "#30C06A" },
  Miscellaneous: { Icon: BadgeIndianRupee, tint: "#64D2FF" }
};

const fallback = { Icon: BadgeIndianRupee, tint: "#8E8E93" };
export const getCategoryMeta = (category?: string) => (category && categoryMeta[category]) || fallback;

export const paymentMeta: Record<string, { Icon: LucideIcon; tint: string }> = {
  Cash: { Icon: Wallet, tint: "#30C06A" },
  UPI: { Icon: Zap, tint: "#FF9F0A" },
  Card: { Icon: CreditCard, tint: "#0A84FF" },
  "Bank Transfer": { Icon: Landmark, tint: "#5E5CE6" }
};

/** Appends an alpha channel to a #RRGGBB colour. */
export const withAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, "0")}`;
