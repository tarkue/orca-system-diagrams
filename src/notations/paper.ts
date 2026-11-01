import type { Notation } from "../core/model";
/** Mermaid notation paper owns its conventional light palette, independently of the host shell. */
export function notationPaperTheme(
  notation: Notation,
): { theme: "default"; themeVariables: Record<string, string> } | undefined {
  if (notation !== "sequence" && notation !== "state") return undefined;
  return {
    theme: "default",
    themeVariables: {
      edgeLabelBackground: "#ffffff",
      labelBackground: "#ffffff",
      stateLabelColor: "#1f2328",
      nodeBkg: "#ececff",
      nodeBorder: "#9370db",
      defaultLinkColor: "#333333",
      background: "#ffffff",
      primaryColor: "#ececff",
      primaryBorderColor: "#9370db",
      primaryTextColor: "#1f2328",
      secondaryColor: "#ffffde",
      secondaryTextColor: "#1f2328",
      tertiaryColor: "#fff3cd",
      tertiaryTextColor: "#1f2328",
      textColor: "#1f2328",
      lineColor: "#333333",
      mainBkg: "#ececff",
      actorBkg: "#ececff",
      actorBorder: "#9370db",
      actorTextColor: "#1f2328",
      actorLineColor: "#595959",
      signalColor: "#333333",
      signalTextColor: "#24292f",
      labelBoxBkgColor: "#ececff",
      labelBoxBorderColor: "#9370db",
      labelTextColor: "#1f2328",
      loopTextColor: "#24292f",
      loopLineColor: "#9370db",
      noteBkgColor: "#fff5ad",
      noteBorderColor: "#8c8150",
      noteTextColor: "#1f2328",
      activationBkgColor: "#f4f4f4",
      activationBorderColor: "#666666",
      sequenceNumberColor: "#ffffff",
    },
  };
}
/** CSS background alone does not survive every SVG consumer; include real opaque geometry. */
export function applyNotationPaper(
  root: SVGSVGElement,
  notation: Notation,
): void {
  const theme = notationPaperTheme(notation);
  if (!theme) return;
  const view = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    !view ||
    view.length !== 4 ||
    view.some((n) => !Number.isFinite(n)) ||
    view[2] <= 0 ||
    view[3] <= 0
  )
    throw Error("Notation SVG requires a finite positive viewBox");
  const paper = root.ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  for (const [key, value] of Object.entries({
    x: view[0],
    y: view[1],
    width: view[2],
    height: view[3],
  }))
    paper.setAttribute(key, String(value));
  paper.setAttribute("data-notation-paper", notation);
  paper.setAttribute("fill", "#ffffff");
  paper.setAttribute("fill-opacity", "1");
  paper.setAttribute("style", "fill:#ffffff;fill-opacity:1");
  paper.setAttribute("pointer-events", "none");
  root.insertBefore(paper, root.firstChild);
  root.style.backgroundColor = "#ffffff";
  root.style.color = "#1f2328";
}
