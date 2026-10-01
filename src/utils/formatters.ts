export const toAmount = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value !== "string") return 0;

  const parsed = Number(value.replace(/[\u20b9,\s]/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const currency = (amount: unknown) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(toAmount(amount));

export const safeDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const shortDate = (value?: string | Date | null) => {
  const date = safeDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

/** Up to two initials for avatars; "?" when there is no usable name. */
export const initials = (name?: string) => {
  const letters = (name || "").trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2);
  return letters ? letters.toUpperCase() : "?";
};
