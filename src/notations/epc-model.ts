import type { SystemModel } from "../core/model";
import { conditionLabel } from "../core/notation-labels";
export interface EpcNode {
  id: string;
  modelId: string;
  kind: "event" | "function" | "xor";
  label: string;
}
export interface EpcEdge {
  from: string;
  to: string;
  modelId?: string;
}
export function projectEpc(model: SystemModel): {
  nodes: EpcNode[];
  edges: EpcEdge[];
} {
  const nodes: EpcNode[] = [],
    edges: EpcEdge[] = [];
  const first = new Map<string, string>(),
    last = new Map<string, string>();
  model.workflow.steps.forEach((s, i) => {
    const id = `step${i}`,
      event = s.kind === "start" || s.kind === "end";
    nodes.push({
      id,
      modelId: s.id,
      kind: event ? "event" : "function",
      label: s.name,
    });
    first.set(s.id, id);
    last.set(s.id, id);
    if (model.workflow.edges.filter((e) => e.from === s.id).length > 1) {
      const split = `split${i}`;
      nodes.push({ id: split, modelId: s.id, kind: "xor", label: "XOR" });
      edges.push({ from: id, to: split });
      last.set(s.id, split);
    }
    if (model.workflow.edges.filter((e) => e.to === s.id).length > 1) {
      const join = `join${i}`;
      nodes.push({ id: join, modelId: s.id, kind: "xor", label: "XOR" });
      edges.push({ from: join, to: id });
      first.set(s.id, join);
    }
  });
  model.workflow.edges.forEach((edge, i) => {
    const source = model.workflow.steps.find((s) => s.id === edge.from)!,
      target = model.workflow.steps.find((s) => s.id === edge.to)!;
    const sourceEvent = source.kind === "start" || source.kind === "end",
      targetEvent = target.kind === "start" || target.kind === "end";
    let from = last.get(edge.from)!;
    if (sourceEvent === targetEvent) {
      const id = `bridge${i}`;
      nodes.push({
        id,
        modelId: edge.id,
        kind: sourceEvent ? "function" : "event",
        label: sourceEvent
          ? "Завершить процесс"
          : conditionLabel(model, edge) === "Далее"
            ? source.name + " — завершено"
            : conditionLabel(model, edge),
      });
      edges.push({ from, to: id, modelId: edge.id });
      from = id;
    }
    edges.push({ from, to: first.get(edge.to)!, modelId: edge.id });
  });
  return { nodes, edges };
}
