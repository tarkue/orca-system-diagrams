import type { SystemModel } from "../core/model";
import {
  relationshipCardinality,
  type CardinalityEnd,
} from "../core/notation-labels";
import {
  svgStart,
  textLines,
  palette,
  safeId,
  escapeXml,
  type RenderedNotation,
  type ThemeTokens,
} from "./svg";
export function renderEr(
  model: SystemModel,
  id: string,
  tokens?: ThemeTokens,
): RenderedNotation {
  const p = palette(tokens),
    prefix = safeId(id),
    rowHeight =
      Math.max(...model.entities.map((e) => e.fields.length)) * 25 + 155;
  const width = Math.min(model.entities.length, 3) * 440 + 80,
    height = Math.ceil(model.entities.length / 3) * rowHeight + 150;
  const positions = model.entities.map((e, i) => ({
    x: 60 + (i % 3) * 440,
    y: 90 + Math.floor(i / 3) * rowHeight,
    w: 320,
    h: 65 + e.fields.length * 25,
  }));
  const map: Record<string, string> = {};
  let svg =
    svgStart(id, width, height, "ER / " + model.name, tokens) +
    textLines("ER · " + model.name, width / 2, 32, 100, undefined, 17, 2);
  const glyph = (end: CardinalityEnd, x: number, y: number, dir: number) => {
    let result = "";
    if (end.max === "many")
      result += `<path data-glyph="crowfoot-many" d="M ${x} ${y - 9} L ${x + dir * 18} ${y} L ${x} ${y + 9} M ${x} ${y} L ${x + dir * 18} ${y}" fill="none" stroke="${p.line}"/>`;
    else
      result += `<path data-glyph="cardinality-one" d="M ${x + dir * 9} ${y - 9} V ${y + 9}" stroke="${p.line}"/>`;
    if (end.min === 0)
      result += `<circle data-glyph="cardinality-zero" cx="${x + dir * 29}" cy="${y}" r="5" fill="${p.background}" stroke="${p.line}"/>`;
    else
      result += `<path d="M ${x + dir * 24} ${y - 9} V ${y + 9}" stroke="${p.line}"/>`;
    return result;
  };
  model.entityRelations.forEach((r, i) => {
    const a = positions[model.entities.findIndex((e) => e.id === r.from)],
      b = positions[model.entities.findIndex((e) => e.id === r.to)];
    const forward = a.x <= b.x,
      x1 = forward ? a.x + a.w : a.x,
      x2 = forward ? b.x : b.x + b.w,
      y1 = a.y + 35,
      y2 = b.y + 35,
      dir = forward ? 1 : -1,
      mid = (x1 + x2) / 2,
      ends = relationshipCardinality(r.cardinality),
      sid = prefix + "-relation" + i;
    svg += `<g id="${sid}" data-cardinality="${escapeXml(r.cardinality ?? "unspecified")}"><title>${escapeXml(r.label)}</title><path d="M ${x1} ${y1} H ${mid} V ${y2} H ${x2}" fill="none" stroke="${p.line}"${ends ? "" : ' stroke-dasharray="4 4"'}/>`;
    if (ends) svg += glyph(ends[0], x1, y1, dir) + glyph(ends[1], x2, y2, -dir);
    svg +=
      textLines(
        r.label + (ends ? "" : " / cardinality not specified"),
        mid,
        (y1 + y2) / 2 - 18,
        17,
        p.text,
        12,
        3,
      ) + "</g>";
  });
  model.entities.forEach((entity, i) => {
    const b = positions[i],
      sid = prefix + "-entity" + i;
    map[sid] = entity.id;
    svg +=
      `<g id="${sid}" data-model-id="${escapeXml(entity.id)}" data-glyph="entity"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${p.surface}" stroke="${p.border}"/><path d="M ${b.x} ${b.y + 46} H ${b.x + b.w}" stroke="${p.border}"/>` +
      textLines(entity.name, b.x + b.w / 2, b.y + 28, 36, p.text, 15, 1);
    entity.fields.forEach((field, j) => {
      svg += `<text x="${b.x + 14}" y="${b.y + 69 + j * 25}" font-size="13"><title>${escapeXml(field.name + " : " + field.type)}</title>${escapeXml((field.key ? "PK  " : "") + field.name.slice(0, 25))}<tspan x="${b.x + b.w - 14}" text-anchor="end" fill="${p.line}">${escapeXml(field.type.slice(0, 18))}</tspan></text>`;
    });
    svg += "</g>";
  });
  svg += textLines(
    "Crow’s foot = many · bar = one · circle = zero/optional · dashed unmarked link = unspecified cardinality",
    width / 2,
    height - 30,
    140,
    p.line,
    12,
    2,
  );
  return { svg: svg + "</g></svg>", width, height, elementIdMap: map };
}
