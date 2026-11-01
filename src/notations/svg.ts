export interface RenderedNotation {
  svg: string;
  width: number;
  height: number;
  elementIdMap?: Record<string, string>;
}
export type ThemeTokens = Record<string, string>;
export const escapeXml = (s: string) =>
  Array.from(s)
    .map((c) => {
      const cp = c.codePointAt(0)!;
      return (cp >= 0xd800 && cp <= 0xdfff) || cp === 0xfffe || cp === 0xffff
        ? "�"
        : c;
    })
    .join("")
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    )
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "�");
export const safeId = (id: string) =>
  "notation-" + id.replace(/[^A-Za-z0-9_-]/g, "_");
export function palette(tokens: ThemeTokens = {}) {
  const color = (key: string, fallback: string) => {
    const value = tokens[key] ?? "";
    return /^(#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d.,% /+-]+\)|white|black|transparent)$/i.test(
      value,
    )
      ? value
      : fallback;
  };
  return {
    background: color("background", "#202020"),
    surface: color("primaryColor", "#303030"),
    text: color("primaryTextColor", "#ededed"),
    border: color("primaryBorderColor", "#777777"),
    line: color("lineColor", "#b7b7b7"),
  };
}
export function svgStart(
  id: string,
  width: number,
  height: number,
  title: string,
  tokens?: ThemeTokens,
) {
  const p = palette(tokens),
    prefix = safeId(id);
  return `<svg xmlns="http://www.w3.org/2000/svg" id="${prefix}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}"><title>${escapeXml(title)}</title><defs><marker id="${prefix}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${p.line}"/></marker></defs><rect width="100%" height="100%" fill="${p.background}"/><g font-family="ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji" font-size="13" fill="${p.text}">`;
}
export function textLines(
  value: string,
  x: number,
  y: number,
  maxChars = 32,
  fill?: string,
  size = 13,
  maxLines = 7,
): string {
  const lines: string[] = [];
  for (const paragraph of value.split(/[\r\n]+/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if ((line + " " + word).trim().length > maxChars && line) {
        lines.push(line);
        line = "";
      }
      if (word.length > maxChars) {
        if (line) {
          lines.push(line);
          line = "";
        }
        for (let i = 0; i < word.length; i += maxChars)
          lines.push(word.slice(i, i + maxChars));
      } else line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
  }
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines)
    visible[maxLines - 1] = visible[maxLines - 1].slice(0, -1) + "…";
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}"${fill ? ` fill="${fill}"` : ""}>${visible.map((line, i) => `<tspan x="${x}" dy="${i ? 17 : 0}">${escapeXml(line)}</tspan>`).join("")}</text>`;
}
