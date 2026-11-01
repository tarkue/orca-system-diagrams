import type { SystemModel, WorkflowEdge } from "./model";
/** Mermaid entities are decoded after grammar parsing, so labels cannot add statements. */
export const mermaidLabel = (text: string) =>
  Array.from(text)
    .map((c) =>
      /[a-zA-Z0-9а-яА-ЯёЁ _.,()/-]/u.test(c) ? c : `#${c.codePointAt(0)};`,
    )
    .join("");
export const mermaidQuoted = (text: string) => `"${mermaidLabel(text)}"`;
export function conditionExpression(
  model: SystemModel,
  edge: WorkflowEdge,
): string | undefined {
  const threshold = model.rules.approvalThreshold;
  const enabled = String(model.rules.requireApproval);
  switch (edge.condition) {
    case "above_threshold":
      return `${enabled} && amount > ${threshold}`;
    case "below_threshold":
      return `!${enabled} || amount <= ${threshold}`;
    case "approved":
      return 'decision === "approved"';
    case "rejected":
      return 'decision === "rejected"';
    default:
      return undefined;
  }
}
export function conditionLabel(model: SystemModel, edge: WorkflowEdge): string {
  const expression = conditionExpression(model, edge);
  return [edge.label, expression].filter(Boolean).join(" / ") || "Далее";
}

export interface CardinalityEnd {
  min: 0 | 1;
  max: 1 | "many";
}
export function relationshipCardinality(
  value?: string,
): [CardinalityEnd, CardinalityEnd] | undefined {
  const one: CardinalityEnd = { min: 1, max: 1 },
    many: CardinalityEnd = { min: 0, max: "many" },
    optional: CardinalityEnd = { min: 0, max: 1 };
  const normalized = value?.toLowerCase().trim();
  switch (normalized) {
    case "one-to-one":
    case "1:1":
      return [one, one];
    case "one-to-many":
    case "1:n":
    case "1:m":
    case "1:0..*":
      return [one, many];
    case "many-to-one":
    case "n:1":
    case "m:1":
    case "0..*:1":
      return [many, one];
    case "many-to-many":
    case "n:m":
    case "m:n":
    case "*:*":
      return [many, many];
    case "one-to-zero-or-one":
    case "1:0..1":
      return [one, optional];
    case "zero-or-one-to-one":
    case "0..1:1":
      return [optional, one];
    default:
      return undefined;
  }
}
export function cardinalityMermaid(value?: string): string | undefined {
  const ends = relationshipCardinality(value);
  if (!ends) return undefined;
  const left = (e: CardinalityEnd) =>
    e.max === "many" ? (e.min ? " }|" : "}o") : e.min ? "||" : "|o";
  const right = (e: CardinalityEnd) =>
    e.max === "many" ? (e.min ? "|{" : "o{") : e.min ? "||" : "o|";
  return left(ends[0]).trim() + "--" + right(ends[1]);
}
