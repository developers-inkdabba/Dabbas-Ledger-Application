import assert from "node:assert/strict";
import test from "node:test";
import { formatDateKey, parseDateKey } from "./dates";
import { currency, initials, shortDate, toAmount } from "./formatters";

test("toAmount survives every input shape the forms and Firestore produce", () => {
  assert.equal(toAmount(1250), 1250);
  assert.equal(toAmount("₹1,23,456"), 123456);
  assert.equal(toAmount(" 42.50 "), 42.5);
  assert.equal(toAmount(""), 0);
  assert.equal(toAmount("abc"), 0);
  assert.equal(toAmount(Number.NaN), 0);
  assert.equal(toAmount(Number.POSITIVE_INFINITY), 0);
  assert.equal(toAmount(null), 0);
  assert.equal(toAmount(undefined), 0);
});

test("currency uses Indian grouping, rupee sign and no paise", () => {
  const out = currency(1234567);
  assert.match(out, /₹/);
  assert.match(out, /12,34,567/);
  assert.equal(currency("bad input"), currency(0));
});

test("shortDate never throws and shows a dash for missing or invalid dates", () => {
  assert.equal(shortDate(undefined), "-");
  assert.equal(shortDate("not a date"), "-");
  assert.match(shortDate("2026-09-30T10:00:00Z"), /2026/);
});

test("initials handle empty, single and multi-word names", () => {
  assert.equal(initials(undefined), "?");
  assert.equal(initials("   "), "?");
  assert.equal(initials("  asha   rao "), "AR");
  assert.equal(initials("asha"), "A");
  assert.equal(initials("Asha Rao Kumar"), "AR");
});

test("date keys round-trip and reject impossible dates", () => {
  assert.equal(formatDateKey(new Date(2026, 1, 3)), "2026-02-03");
  assert.equal(parseDateKey("2026-02-30"), undefined);
  assert.equal(parseDateKey("2026-2-3"), undefined);
  assert.equal(formatDateKey(parseDateKey("2024-02-29")!), "2024-02-29");
});
