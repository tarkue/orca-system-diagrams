import { projectEpc } from "../notations/epc-model";
import type { SystemModel, SystemNode } from "./model";
import {
  mermaidLabel as label,
  mermaidQuoted as quoted,
  conditionLabel,
} from "./notation-labels";

export function c4Projection(model: SystemModel): string {
  const typedNode = (node: SystemNode, i: number) => {
    const type = {
      person: "Person",
      service: "Container / Service",
      database: "Container / Database",
      external: "External system",
    }[node.kind];
    const text = quoted(
      `${type} / ${node.name} / ${node.technology} / ${node.description}`,
    );
    const shape = {
      person: `([${text}])`,
      service: `[${text}]`,
      database: `[(${text})]`,
      external: `[[${text}]]`,
    }[node.kind];
    return `n${i}${shape}:::${node.kind}`;
  };
  const internal = model.nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.kind === "service" || n.kind === "database");
  const outside = model.nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.kind === "person" || n.kind === "external");
  return [
    "flowchart LR",
    "%% C4-inspired typed architecture; generic Mermaid, not C4 standard compliance",
    ...outside.map(({ n, i }) => typedNode(n, i)),
    `subgraph system_boundary[${quoted(model.name + " / System boundary / C4-inspired")}]`,
    "direction TB",
    ...internal.map(({ n, i }) => typedNode(n, i)),
    "end",
    ...model.relations.map(
      (r) =>
        `n${model.nodes.findIndex((n) => n.id === r.from)} -->|${quoted(r.label)}| n${model.nodes.findIndex((n) => n.id === r.to)}`,
    ),
    "classDef person fill:#263c57,stroke:#91b8e8,color:#fff",
    "classDef service fill:#1c4b52,stroke:#70c6c6,color:#fff",
    "classDef database fill:#40355e,stroke:#b3a0db,color:#fff",
    "classDef external fill:#454545,stroke:#aaa,color:#fff",
  ].join("\n");
}

export function epcProjection(model: SystemModel): string {
  const graph = projectEpc(model);
  return [
    "flowchart TD",
    "%% EPC-inspired projection: events / functions / circular XOR connectors",
    `subgraph epc_boundary[${quoted("EPC / " + model.name)}]`,
    ...graph.nodes.map(
      (n) =>
        `${n.id}${n.kind === "event" ? "{{" + quoted(n.label) + "}}" : n.kind === "xor" ? "((" + quoted("×") + "))" : "(" + quoted(n.label) + ")"}:::${n.kind}`,
    ),
    ...graph.edges.map((e) => `${e.from} --> ${e.to}`),
    "end",
    "classDef event fill:#e9bbd0,stroke:#ad5a82,color:#202520",
    "classDef function fill:#b9ddb0,stroke:#4e8750,color:#202520",
    "classDef xor fill:#f4f4f4,stroke:#666,color:#202520",
  ].join("\n");
}

/** Renders graph branches once up to their nearest shared continuation. */
export function sequenceProjection(model: SystemModel): string {
  const nodes = new Map(model.workflow.steps.map((s) => [s.id, s]));
  const outgoing = (id: string) =>
    model.workflow.edges.filter((e) => e.from === id);
  const defaultActor = model.nodes.findIndex((n) => n.kind === "service");
  const actor = (id: string) => {
    const target = model.nodes.findIndex((n) => n.id === nodes.get(id)?.actor);
    return `p${target >= 0 ? target : defaultActor >= 0 ? defaultActor : 0}`;
  };
  const lines = [
    "sequenceDiagram",
    "%% Workflow behavior and model conditions; external calls are not executed",
    ...model.nodes.map(
      (n, i) =>
        `${n.kind === "person" ? "actor" : "participant"} p${i} as ${label(n.name)}`,
    ),
  ];
  const distances = (start: string) => {
    const d = new Map<string, number>([[start, 0]]),
      queue = [start];
    for (let i = 0; i < queue.length; i++)
      for (const e of outgoing(queue[i]))
        if (!d.has(e.to)) {
          d.set(e.to, d.get(queue[i])! + 1);
          queue.push(e.to);
        }
    return d;
  };
  // A join must occur on EVERY route from each branch, including rejection paths.
  const postdominators = new Map<string, Set<string>>();
  const mustVisit = (id: string): Set<string> => {
    if (postdominators.has(id)) return postdominators.get(id)!;
    const children = outgoing(id).map((e) => mustVisit(e.to));
    const common = children.length
      ? [...children[0]].filter((candidate) =>
          children.every((set) => set.has(candidate)),
        )
      : [];
    const result = new Set([id, ...common]);
    postdominators.set(id, result);
    return result;
  };
  const joinFor = (targets: string[]) => {
    const all = targets.map(distances),
      required = targets.map(mustVisit);
    return [...required[0]]
      .filter((id) => required.every((set) => set.has(id)))
      .sort(
        (a, b) =>
          Math.max(...all.map((d) => d.get(a)!)) -
            Math.max(...all.map((d) => d.get(b)!)) ||
          all.reduce((v, d) => v + d.get(a)! - d.get(b)!, 0),
      )[0];
  };
  let budget = 0;
  const render = (id: string, stop?: string): void => {
    if (id === stop) return;
    if (++budget > 3000)
      throw Error("Sequence projection exceeds branch expansion limit");
    const step = nodes.get(id)!;
    if (step.kind === "start" || step.kind === "end")
      lines.push(`Note over ${actor(id)}: ${label(step.name)}`);
    else lines.push(`${actor(id)}->>${actor(id)}: ${label(step.name)}`);
    const edges = outgoing(id);
    if (!edges.length) return;
    const handoff = (target: string) => {
      if (actor(id) !== actor(target))
        lines.push(
          `${actor(id)}->>${actor(target)}: ${label(nodes.get(target)!.name)}`,
        );
    };
    if (edges.length === 1) {
      handoff(edges[0].to);
      render(edges[0].to, stop);
      return;
    }
    const join = joinFor(edges.map((e) => e.to));
    edges.forEach((edge, i) => {
      lines.push(
        `${i === 0 ? "alt" : "else"} ${label(conditionLabel(model, edge))}`,
      );
      handoff(edge.to);
      render(edge.to, join ?? stop);
    });
    lines.push("end");
    if (join && join !== stop) render(join, stop);
  };
  render(model.workflow.steps.find((s) => s.kind === "start")!.id);
  return lines.join("\n");
}
