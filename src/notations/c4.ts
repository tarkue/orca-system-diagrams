import type { SystemModel } from "../core/model";
import {
  svgStart,
  textLines,
  palette,
  safeId,
  escapeXml,
  type RenderedNotation,
  type ThemeTokens,
} from "./svg";
export function renderC4(
  model: SystemModel,
  id: string,
  tokens?: ThemeTokens,
): RenderedNotation {
  const columns = { person: 0, service: 1, database: 2, external: 3 },
    counts = [0, 0, 0, 0],
    p = palette(tokens),
    prefix = safeId(id),
    positions = model.nodes.map((n) => ({
      x: 45 + columns[n.kind] * 365,
      y: 130 + counts[columns[n.kind]]++ * 255,
      w: 280,
      h: 200,
    }));
  const width = 1480,
    height = Math.max(...counts) * 255 + 260;
  let svg =
    svgStart(id, width, height, "C4 container view / " + model.name, tokens) +
    textLines("C4 · " + model.name, width / 2, 32, 100, undefined, 18, 2);
  svg +=
    `<rect x="390" y="78" width="720" height="${height - 210}" rx="6" fill="none" stroke="${p.border}" stroke-dasharray="8 5"/>` +
    textLines(
      "System boundary · " + model.name,
      750,
      103,
      75,
      undefined,
      14,
      1,
    );
  const map: Record<string, string> = {};
  let outsideRoute = 0;
  model.relations.forEach((r, i) => {
    const a = positions[model.nodes.findIndex((n) => n.id === r.from)],
      b = positions[model.nodes.findIndex((n) => n.id === r.to)];
    const forward = a.x <= b.x,
      x1 = forward ? a.x + a.w : a.x,
      x2 = forward ? b.x : b.x + b.w,
      y1 = a.y + a.h / 2,
      y2 = b.y + b.h / 2;
    const reciprocal = model.relations.some(
      (other) => other.from === r.to && other.to === r.from,
    );
    const mid = (x1 + x2) / 2 + (reciprocal ? (forward ? -12 : 12) : 0),
      sid = prefix + "-relation" + i;
    let path = `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`,
      labelX = mid,
      labelY = (y1 + y2) / 2 + (reciprocal ? (forward ? -45 : 35) : -35),
      chars = 13;
    if (a.x === b.x) {
      const bus = a.x + a.w + 30;
      path = `M ${a.x + a.w} ${y1} H ${bus} V ${y2} H ${b.x + b.w}`;
      labelX = bus;
      labelY = (y1 + y2) / 2 - 20;
    }
    if (Math.abs(a.x - b.x) > 365) {
      const channelY = height - 155 - outsideRoute++ * 50,
        gapA = x1 + (forward ? 36 : -36),
        gapB = x2 + (forward ? -36 : 36);
      path = `M ${x1} ${y1} H ${gapA} V ${channelY} H ${gapB} V ${y2} H ${x2}`;
      labelX = (gapA + gapB) / 2;
      labelY = channelY - 12;
      chars = 45;
    }
    map[sid] = r.id;
    svg +=
      `<g id="${sid}" data-model-id="${escapeXml(r.id)}"><title>${escapeXml(r.label)}</title><path d="${path}" fill="none" stroke="${p.line}" marker-end="url(#${prefix}-arrow)"/>` +
      textLines(r.label, labelX, labelY, chars, p.text, 11, 3) +
      "</g>";
  });
  model.nodes.forEach((n, i) => {
    const b = positions[i],
      sid = prefix + "-node" + i;
    map[sid] = n.id;
    const glyph = {
      person: "person",
      service: "container",
      database: "store",
      external: "system",
    }[n.kind];
    svg += `<g id="${sid}" data-model-id="${escapeXml(n.id)}" data-glyph="${glyph}"><title>${escapeXml(n.description)}</title>`;
    const fill =
      n.kind === "external"
        ? "#45464a"
        : n.kind === "person"
          ? "#324c71"
          : "#255d86";
    if (n.kind === "person")
      svg += `<circle cx="${b.x + b.w / 2}" cy="${b.y + 22}" r="22" fill="${fill}" stroke="#89a9d0"/><path d="M ${b.x + 70} ${b.y + 80} Q ${b.x + 70} ${b.y + 48} ${b.x + 140} ${b.y + 48} Q ${b.x + 210} ${b.y + 48} ${b.x + 210} ${b.y + 80}" fill="${fill}" stroke="#89a9d0"/><rect x="${b.x}" y="${b.y + 80}" width="${b.w}" height="120" rx="6" fill="${fill}" stroke="#89a9d0"/>`;
    else if (n.kind === "database")
      svg += `<path d="M ${b.x} ${b.y + 18} A 140 18 0 0 1 ${b.x + b.w} ${b.y + 18} V ${b.y + b.h - 18} A 140 18 0 0 1 ${b.x} ${b.y + b.h - 18} Z" fill="${fill}" stroke="#8db5d1"/><ellipse cx="${b.x + 140}" cy="${b.y + 18}" rx="140" ry="18" fill="${fill}" stroke="#8db5d1"/>`;
    else
      svg += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${n.kind === "external" ? 2 : 7}" fill="${fill}" stroke="#8db5d1"/>${n.kind === "external" ? `<rect x="${b.x + 5}" y="${b.y + 5}" width="${b.w - 10}" height="${b.h - 10}" fill="none" stroke="#999"/>` : ""}`;
    const top = n.kind === "person" ? b.y + 102 : b.y + 47;
    svg +=
      textLines(
        n.name,
        b.x + 140,
        top,
        32,
        "#fff",
        15,
        n.kind === "person" ? 2 : 3,
      ) +
      textLines(
        n.kind === "person"
          ? "[Person]"
          : n.kind === "external"
            ? "[Software System · External]"
            : n.kind === "database"
              ? "[Container · Database]"
              : "[Container]",
        b.x + 140,
        top + (n.kind === "person" ? 37 : 54),
        36,
        "#e0ebf6",
        12,
        1,
      );
    if (n.kind === "person")
      svg += textLines(
        n.description,
        b.x + 140,
        top + 64,
        34,
        "#e0ebf6",
        12,
        2,
      );
    if (n.kind !== "person")
      svg +=
        textLines(n.technology, b.x + 140, top + 78, 35, "#e0ebf6", 12, 2) +
        textLines(n.description, b.x + 140, top + 115, 36, "#fff", 12, 2);
    svg += "</g>";
  });
  svg +=
    textLines(
      "Legend · silhouette = Person · rounded box = Container · cylinder = Data store · double box = External system",
      width / 2,
      height - 65,
      145,
      undefined,
      12,
      2,
    ) +
    textLines(
      "C4 is notation independent. Arrows show directed, labelled relationships; technology is shown on containers.",
      width / 2,
      height - 25,
      150,
      p.line,
      12,
      1,
    );
  return { svg: svg + "</g></svg>", width, height, elementIdMap: map };
}
