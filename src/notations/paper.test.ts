import { describe, it, expect } from "vitest";
import { notationPaperTheme } from "./paper";
const luminance = (hex: string) => {
  const rgb = hex
    .match(/[a-f\d]{2}/gi)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const contrast = (a: string, b: string) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) /
  (Math.min(luminance(a), luminance(b)) + 0.05);
describe("self-contained Sequence notation paper", () => {
  it("explicitly gives every sequence text family readable colors against its own canvas or box", () => {
    const theme = notationPaperTheme("sequence")!;
    expect(theme.theme).toBe("default");
    expect(theme.themeVariables.background).toBe("#ffffff");
    const v = theme.themeVariables;
    for (const [fg, bg] of [
      ["actorTextColor", "actorBkg"],
      ["signalTextColor", "background"],
      ["labelTextColor", "labelBoxBkgColor"],
      ["loopTextColor", "background"],
      ["noteTextColor", "noteBkgColor"],
    ] as const)
      expect(contrast(v[fg], v[bg])).toBeGreaterThanOrEqual(4.5);
    for (const key of [
      "actorLineColor",
      "signalColor",
      "loopLineColor",
      "activationBorderColor",
    ])
      expect(contrast(v[key], v.background)).toBeGreaterThanOrEqual(3);
    expect(
      contrast(v.actorTextColor, v.activationBkgColor),
    ).toBeGreaterThanOrEqual(4.5);
  });
  it("does not replace other notations palettes with a uniform monochrome theme", () => {
    expect(notationPaperTheme("c4")).toBeUndefined();
    expect(notationPaperTheme("epc")).toBeUndefined();
    expect(notationPaperTheme("bpmn")).toBeUndefined();
  });
});
it("gives State its own conventional light canvas, labels and endpoints", () => {
  const state = notationPaperTheme("state")!;
  expect(state.theme).toBe("default");
  expect(state.themeVariables.background).toBe("#ffffff");
  expect(
    contrast(
      state.themeVariables.primaryTextColor,
      state.themeVariables.primaryColor,
    ),
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    contrast(state.themeVariables.lineColor, state.themeVariables.background),
  ).toBeGreaterThanOrEqual(3);
});
