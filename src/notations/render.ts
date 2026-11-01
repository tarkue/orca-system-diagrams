import type { Notation, SystemModel } from "../core/model";
import { validateModel, diagramFor, exportBpmnXml } from "../core";
import { renderC4 } from "./c4";
import { renderEpc } from "./epc";
import { renderEr } from "./er";
import { notationPaperTheme, applyNotationPaper } from "./paper";
import {
  palette,
  safeId,
  type RenderedNotation,
  type ThemeTokens,
} from "./svg";
export type { RenderedNotation, ThemeTokens } from "./svg";
const FONT =
  "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji";
let serial = Promise.resolve();
function normalized(tokens: ThemeTokens = {}): ThemeTokens {
  return {
    ...tokens,
    background: tokens.background ?? tokens["--background"],
    primaryColor: tokens.primaryColor ?? tokens["--card"],
    primaryTextColor: tokens.primaryTextColor ?? tokens["--foreground"],
    primaryBorderColor: tokens.primaryBorderColor ?? tokens["--border"],
    lineColor: tokens.lineColor ?? tokens["--muted-foreground"],
  };
}
function parseSvg(svg: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw Error("Notation renderer returned invalid SVG");
  return doc.documentElement as unknown as SVGSVGElement;
}
function dimensions(root: SVGSVGElement): { width: number; height: number } {
  const view = root
    .getAttribute("viewBox")
    ?.split(/[\s,]+/)
    .map(Number);
  return {
    width: view?.[2] || parseFloat(root.getAttribute("width") ?? "") || 800,
    height: view?.[3] || parseFloat(root.getAttribute("height") ?? "") || 400,
  };
}
function inspectable(
  root: SVGSVGElement,
  element: Element,
  modelId: string,
  map: Record<string, string>,
  id: string,
) {
  if (!element.id)
    element.id = safeId(id) + "-element" + Object.keys(map).length;
  element.setAttribute("data-model-id", modelId);
  map[element.id] = modelId;
}
async function bpmn(
  model: SystemModel,
  id: string,
  tokens: ThemeTokens,
): Promise<RenderedNotation> {
  const { default: Viewer } = await import("bpmn-js/lib/Viewer");
  const temp = document.createElement("div");
  temp.style.cssText =
    "position:fixed;left:-100000px;top:0;width:1600px;height:1000px;visibility:hidden;pointer-events:none";
  document.body.append(temp);
  const p = palette(tokens);
  const viewer = new Viewer({
    container: temp,
    bpmnRenderer: {
      defaultFillColor: p.surface,
      defaultStrokeColor: p.line,
      defaultLabelColor: p.text,
    },
    textRenderer: {
      defaultStyle: { fontFamily: FONT, fontSize: 14 },
      externalStyle: { fontFamily: FONT, fontSize: 14 },
    },
  });
  try {
    await viewer.importXML(exportBpmnXml(model));
    const { svg } = await viewer.saveSVG();
    if (!svg) throw Error("BPMN viewer did not export SVG");
    const root = parseSvg(svg),
      map: Record<string, string> = {};
    model.workflow.steps.forEach((s, i) => {
      const el = root.querySelector(`[data-element-id="Step_${i}"]`);
      if (el) inspectable(root, el, s.id, map, id);
    });
    model.workflow.steps
      .filter(
        (s) =>
          s.kind !== "decision" &&
          model.workflow.edges.filter((e) => e.from === s.id).length > 1,
      )
      .forEach((s, i) => {
        const el = root.querySelector(
          `[data-element-id="Step_${model.workflow.steps.length + i}"]`,
        );
        if (el) inspectable(root, el, s.id, map, id);
      });
    model.workflow.edges.forEach((e, i) => {
      const el = root.querySelector(`[data-element-id="Flow_${i}"]`);
      if (el) inspectable(root, el, e.id, map, id);
    });
    const actors = [...new Set(model.workflow.steps.map((s) => s.actor ?? ""))];
    actors.forEach((actor, i) => {
      const el = root.querySelector(`[data-element-id="Lane_${i}"]`);
      if (el && actor) inspectable(root, el, actor, map, id);
    });
    // saveSVG excludes the HTML watermark. Preserve its exact SVG artwork and link in a dedicated non-overlapping footer.
    const logo = temp.querySelector(".bjs-powered-by svg");
    if (!logo) throw Error("Required bpmn.io watermark is missing");
    const view = root
        .getAttribute("viewBox")!
        .split(/[\s,]+/)
        .map(Number),
      footerY = view[1] + view[3];
    const ns = "http://www.w3.org/2000/svg",
      footer = root.ownerDocument.createElementNS(ns, "g");
    footer.setAttribute("class", "bjs-powered-by");
    const bg = root.ownerDocument.createElementNS(ns, "rect");
    for (const [key, value] of Object.entries({
      x: view[0],
      y: footerY,
      width: view[2],
      height: 50,
      fill: p.background,
    }))
      bg.setAttribute(key, String(value));
    footer.append(bg);
    const link = root.ownerDocument.createElementNS(ns, "a");
    link.setAttribute("href", "http://bpmn.io");
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    link.setAttribute("aria-label", "Powered by bpmn.io");
    link.setAttribute("style", "color:" + p.text);
    const clone = logo.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("x", String(view[0] + view[2] - 78));
    clone.setAttribute("y", String(footerY + 14));
    link.append(root.ownerDocument.importNode(clone, true));
    footer.append(link);
    root.append(footer);
    root.setAttribute(
      "viewBox",
      [view[0], view[1], view[2], view[3] + 50].join(" "),
    );
    root.setAttribute("height", String(view[3] + 50));
    root.setAttribute("id", safeId(id));
    const paper = root.ownerDocument.createElementNS(ns, "rect");
    for (const [key,value] of Object.entries({x:view[0],y:view[1],width:view[2],height:view[3]+50,fill:p.background})) paper.setAttribute(key,String(value));
    paper.setAttribute("data-notation-background", "bpmn");
    root.prepend(paper);
    const style = root.ownerDocument.createElementNS(ns, "style");
    style.textContent =
      ".djs-outline,.djs-hit{display:none}.djs-label{font-family:" + FONT + "}";
    root.prepend(style);
    return {
      svg: new XMLSerializer().serializeToString(root),
      ...dimensions(root),
      elementIdMap: map,
    };
  } finally {
    viewer.destroy();
    temp.remove();
  }
}
async function mermaidNotation(
  model: SystemModel,
  notation: Notation,
  id: string,
  tokens: ThemeTokens,
): Promise<RenderedNotation> {
  const { default: mermaid } = await import("mermaid");
  const p = palette(tokens);
  const paperTheme = notationPaperTheme(notation);
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: paperTheme?.theme ?? "base",
    themeVariables: {
      background: p.background,
      primaryColor: p.surface,
      primaryTextColor: p.text,
      primaryBorderColor: p.border,
      lineColor: p.line,
      fontFamily: FONT,
      fontSize: "14px",
      ...paperTheme?.themeVariables,
    },
    sequence: {
      mirrorActors: false,
      actorFontFamily: FONT,
      noteFontFamily: FONT,
      messageFontFamily: FONT,
      actorFontSize: 14,
      noteFontSize: 14,
      messageFontSize: 14,
      wrap: true,
      wrapPadding: 16,
      noteMargin: 20,
      messageMargin: 48,
      width: 200,
    },
    flowchart: { htmlLabels: false },
  });
  const { svg } = await mermaid.render(safeId(id), diagramFor(model, notation));
  const root = parseSvg(svg),
    map: Record<string, string> = {};
  applyNotationPaper(root, notation);
  const mapping =
    notation === "er"
      ? model.entities
      : notation === "state"
        ? model.states
        : model.nodes;
  for (const el of root.querySelectorAll("g[id],g[data-id],g.actor")) {
    const identity = el.getAttribute("data-id") ?? el.id;
    const match =
      notation === "er"
        ? identity.match(/(?:entity-)?e(\d+)(?:-|$)/)
        : notation === "state"
          ? identity.match(/(?:state-)?s(\d+)(?:-|$)/)
          : identity.match(/(?:actor-?)?p(\d+)(?:-|$)/);
    if (match && mapping[Number(match[1])])
      inspectable(root, el, mapping[Number(match[1])].id, map, id);
  }
  if (notation === "sequence") {
    const normalize = (s: string) => s.replace(/\s+/g, "");
    for (const el of root.querySelectorAll("text.messageText,text.noteText")) {
      const step = model.workflow.steps.find(
        (s) => normalize(s.name) === normalize(el.textContent ?? ""),
      );
      if (step) inspectable(root, el, step.id, map, id);
    }
    for (const note of root.querySelectorAll('g[data-et="note"]')) {
      const text = [...note.querySelectorAll("text.noteText")].map(el => el.textContent ?? "").join(" ");
      const step = model.workflow.steps.find(s => normalize(s.name) === normalize(text));
      if (step) inspectable(root, note, step.id, map, id);
    }
  }
  return {
    svg: new XMLSerializer().serializeToString(root),
    ...dimensions(root),
    elementIdMap: map,
  };
}
/** Browser-only renderer. Work is serialized because Mermaid keeps global theme/render state. */
export async function renderNotation(
  model: SystemModel,
  notation: Notation,
  id: string,
  themeTokens?: ThemeTokens,
): Promise<RenderedNotation> {
  const validation = validateModel(model);
  if (!validation.valid)
    throw Error("Invalid model: " + validation.errors.join("; "));
  if (typeof document === "undefined")
    throw Error("renderNotation requires a browser DOM");
  const tokens = normalized(themeTokens);
  const work = async () =>
    notation === "c4"
      ? renderC4(model, id, tokens)
      : notation === "epc"
        ? renderEpc(model, id, tokens)
        : notation === "er"
          ? renderEr(model, id, tokens)
          : notation === "bpmn"
            ? bpmn(model, id, tokens)
            : mermaidNotation(model, notation, id, tokens);
  const pending = serial.then(work);
  serial = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}
