import assert from "node:assert/strict";
import test from "node:test";
import { composite, contrast } from "../utils/contrast";
import { darkColors, lightColors, ThemeColors } from "./theme";

const themes: Array<[string, ThemeColors]> = [["light", lightColors], ["dark", darkColors]];
/** Every surface text can sit on, flattened onto the ground the way the screen paints it. */
const surfacesOf = (c: ThemeColors) => ({
  background: c.background,
  elevated: c.backgroundElevated,
  glass: composite(c.surfaceGlass, c.background),
  surface: composite(c.surface, c.background),
  strong: composite(c.surfaceStrong, c.background)
});

for (const [name, c] of themes) {
  test(`${name}: body and secondary text meet WCAG AA (4.5:1) on every surface`, () => {
    for (const [surface, bg] of Object.entries(surfacesOf(c))) {
      for (const token of ["text", "textSecondary", "textSoft", "muted"] as const) {
        const ratio = contrast(c[token], bg);
        assert.ok(ratio >= 4.5, `${token} on ${surface} is ${ratio.toFixed(2)}:1`);
      }
    }
  });

  test(`${name}: button labels are readable on primary and danger fills`, () => {
    for (const fill of ["primary", "error"] as const) {
      const ratio = contrast(c.onPrimary, c[fill]);
      assert.ok(ratio >= 4.5, `onPrimary on ${fill} is ${ratio.toFixed(2)}:1`);
    }
  });

  test(`${name}: status colours read on their tinted pills (AA large, 3:1)`, () => {
    for (const tone of ["success", "warning", "error", "info", "primary"] as const) {
      const pill = composite(c[`${tone}Soft`], composite(c.surfaceGlass, c.background));
      const ratio = contrast(c[tone], pill);
      assert.ok(ratio >= 3, `${tone} on ${tone}Soft is ${ratio.toFixed(2)}:1`);
    }
  });

  test(`${name}: status-bar icons are visible on the notch strip`, () => {
    // Root layout picks "light" icons for dark mode and "dark" icons for light mode;
    // the strip behind them is always the opaque theme background.
    const icon = name === "dark" ? "#FFFFFF" : "#000000";
    const ratio = contrast(icon, c.background);
    assert.ok(ratio >= 7, `status icons on strip are ${ratio.toFixed(2)}:1`);
  });

  test(`${name}: every token parses as a colour`, () => {
    for (const [key, value] of Object.entries(c)) assert.doesNotThrow(() => contrast(value, "#FFFFFF"), key);
  });
}
