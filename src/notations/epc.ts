import type { SystemModel } from "../core/model";
import { projectEpc } from "./epc-model";
import {
  svgStart,
  textLines,
  palette,
  safeId,
  escapeXml,
  type RenderedNotation,
  type ThemeTokens,
} from "./svg";
export function renderEpc(
  model: SystemModel,
  id: string,
  tokens?: ThemeTokens,
): RenderedNotation {
  const graph = projectEpc(model),
    ranks = new Map<string, number>();
  const rank = (id: string): number => {
    if (ranks.has(id)) return ranks.get(id)!;
    const incoming = graph.edges.filter((e) => e.to === id);
    const r = incoming.length
      ? 1 + Math.max(...incoming.map((e) => rank(e.from)))
      : 0;
    ranks.set(id, r);
    return r;
  };
  const levels = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const r = rank(n.id);
    levels.set(r, [...(levels.get(r) ?? []), n.id]);
  }
  const columns = Math.max(...[...levels.values()].map((v) => v.length)),
    width = Math.max(680, columns * 300 + 100),
    height = levels.size * 145 + 140,
    p = palette(tokens),
    prefix = safeId(id);
  const positions = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >();
  for (const [r, ids] of levels)
    ids.forEach((nid, i) => {
      const node = graph.nodes.find((n) => n.id === nid)!;
      const w = node.kind === "xor" ? 38 : 240,
        h = node.kind === "xor" ? 38 : 80;
      positions.set(nid, {
        x: width / 2 + (i - (ids.length - 1) / 2) * 300 - w / 2,
        y: 90 + r * 145,
        w,
        h,
      });
    });
  const map: Record<string, string> = {};
  let svg =
    svgStart(id, width, height, "EPC / " + model.name, tokens) +
    textLines("EPC · " + model.name, width / 2, 30, 80, undefined, 16, 2);
  for (const e of graph.edges) {
    const a = positions.get(e.from)!,
      b = positions.get(e.to)!;
    svg += `<path d="M ${a.x + a.w / 2} ${a.y + a.h} V ${(a.y + a.h + b.y) / 2} H ${b.x + b.w / 2} V ${b.y}" fill="none" stroke="${p.line}" marker-end="url(#${prefix}-arrow)"/>`;
  }
  for (const node of graph.nodes) {
    const b = positions.get(node.id)!,
      sid = prefix + "-" + node.id;
    map[sid] = node.modelId;
    svg += `<g id="${sid}" data-model-id="${escapeXml(node.modelId)}" data-glyph="${node.kind}"><title>${escapeXml(node.label)}</title>`;
    if (node.kind === "event")
      svg += `<polygon points="${b.x + 18},${b.y} ${b.x + b.w - 18},${b.y} ${b.x + b.w},${b.y + b.h / 2} ${b.x + b.w - 18},${b.y + b.h} ${b.x + 18},${b.y + b.h} ${b.x},${b.y + b.h / 2}" fill="#e9bbd0" stroke="#ad5a82"/>`;
    if (node.kind === "function")
      svg += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12" fill="#b9ddb0" stroke="#4e8750"/>`;
    if (node.kind === "xor")
      svg += `<circle cx="${b.x + b.w / 2}" cy="${b.y + b.h / 2}" r="19" fill="#f4f4f4" stroke="#666"/>`;
    svg +=
      textLines(
        node.kind === "xor" ? "×" : node.label,
        b.x + b.w / 2,
        b.y + (node.kind === "xor" ? 26 : 24),
        29,
        "#202520",
        node.kind === "xor" ? 25 : 13,
        node.kind === "xor" ? 1 : 4,
      ) + "</g>";
  }
  return { svg: svg + "</g></svg>", width, height, elementIdMap: map };
}
