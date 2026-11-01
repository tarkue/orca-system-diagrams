import type { Notation, SystemModel } from "./model";
import { assertModel } from "./validation";
import {
  mermaidLabel as label,
  mermaidQuoted as quoted,
  cardinalityMermaid,
} from "./notation-labels";
import {
  c4Projection,
  epcProjection,
  sequenceProjection,
} from "./architecture-projections";
export function diagramFor(model: SystemModel, notation: Notation): string {
  assertModel(model);
  if (notation === "c4") return c4Projection(model);
  if (notation === "epc") return epcProjection(model);
  if (notation === "bpmn")
    return [
      "flowchart TD",
      "%% BPMN-inspired process representation; not OMG BPMN",
      ...model.workflow.steps.map(
        (s, i) =>
          `w${i}${s.kind === "decision" ? "{" + quoted(s.name) + "}" : s.kind === "start" || s.kind === "end" ? "([" + quoted(s.name) + "])" : "[" + quoted(s.name) + "]"}`,
      ),
      ...model.workflow.edges.map(
        (e) =>
          `w${model.workflow.steps.findIndex((s) => s.id === e.from)} -->|${quoted(e.label ?? e.condition ?? "Далее")}| w${model.workflow.steps.findIndex((s) => s.id === e.to)}`,
      ),
    ].join("\n");
  if (notation === "sequence") return sequenceProjection(model);
  if (notation === "er")
    return [
      "erDiagram",
      ...model.entities.flatMap((e, i) => [
        `e${i}[${quoted(e.name)}] {`,
        ...e.fields.map(
          (f, j) =>
            `  ${/^(string|datetime|decimal|number|boolean|int|float|uuid)$/.test(f.type) ? f.type : "string"} ${/^[A-Za-z_][A-Za-z0-9_]*$/.test(f.name) ? f.name : `field${j}`} ${f.key ? "PK " : ""}${quoted(f.name + " : " + f.type)}`,
        ),
        "}",
      ]),
      ...model.entityRelations.map((r) =>
        cardinalityMermaid(r.cardinality)
          ? `e${model.entities.findIndex((e) => e.id === r.from)} ${cardinalityMermaid(r.cardinality)} e${model.entities.findIndex((e) => e.id === r.to)} : ${quoted(r.label + " / " + r.cardinality)}`
          : `%% Cardinality not specified: ${label(r.label + " / " + (r.cardinality ?? ""))}`,
      ),
    ].join("\n");
  if (notation === "state")
    return [
      "stateDiagram-v2",
      ...model.states.map((s, i) => `state ${quoted(s.name)} as s${i}`),
      ...model.workflow.steps
        .filter((s) => s.kind === "start")
        .flatMap((step) => {
          const i = model.states.findIndex((s) => s.id === step.id);
          return i >= 0 ? [`[*] --> s${i}`] : [];
        }),
      ...model.workflow.steps
        .filter((s) => s.kind === "end")
        .flatMap((step) => {
          const i = model.states.findIndex((s) => s.id === step.id);
          return i >= 0 ? [`s${i} --> [*]`] : [];
        }),
      ...model.transitions.map(
        (t) =>
          `s${model.states.findIndex((s) => s.id === t.from)} --> s${model.states.findIndex((s) => s.id === t.to)}: ${label(t.label)}`,
      ),
    ].join("\n");
  throw Error("Unsupported notation");
}
