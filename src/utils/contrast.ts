/** WCAG 2.x colour maths used by the design-token tests. */

type RGBA = { r: number; g: number; b: number; a: number };

export const parseColor = (value: string): RGBA => {
  const v = value.trim();
  if (v.startsWith("#")) {
    const hex = v.slice(1);
    const full = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1
    };
  }
  const m = /^rgba?\(([^)]+)\)$/.exec(v);
  if (!m) throw new Error(`Unsupported colour: ${value}`);
  const [r, g, b, a = "1"] = m[1].split(",").map((part) => part.trim());
  return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
};

/** Paints `top` over an opaque `bottom`, as translucent surfaces render on screen. */
export const composite = (top: string, bottom: string): string => {
  const t = parseColor(top); const b = parseColor(bottom);
  const mix = (x: number, y: number) => Math.round(x * t.a + y * (1 - t.a));
  return `rgb(${mix(t.r, b.r)}, ${mix(t.g, b.g)}, ${mix(t.b, b.b)})`;
};

export const luminance = (value: string) => {
  const { r, g, b } = parseColor(value);
  const lin = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

export const contrast = (foreground: string, background: string) => {
  const opaqueBg = parseColor(background).a < 1 ? composite(background, "#FFFFFF") : background;
  const fg = parseColor(foreground).a < 1 ? composite(foreground, opaqueBg) : foreground;
  const [hi, lo] = [luminance(fg), luminance(opaqueBg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
