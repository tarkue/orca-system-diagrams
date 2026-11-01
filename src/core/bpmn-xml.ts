import type { SystemModel, WorkflowStep } from "./model";
import { assertModel } from "./validation";
import { conditionExpression, conditionLabel } from "./notation-labels";

const xml = (text: string): string =>
  Array.from(text)
    .map((c) => {
      const cp = c.codePointAt(0)!;
      if (!(
        cp === 9 ||
        cp === 10 ||
        cp === 13 ||
        (cp >= 32 && cp <= 0xd7ff) ||
        (cp >= 0xe000 && cp <= 0xfffd) ||
        (cp >= 0x10000 && cp <= 0x10ffff)
      ))
        return "\uFFFD";
      return (
        (
          {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;",
            "\n": "&#10;",
            "\r": "&#13;",
            "\t": "&#9;",
          } as Record<string, string>
        )[c] ?? c
      );
    })
    .join("");
interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
const TASK_WIDTH = 200;
const LABEL_WIDTH = 220;
const COLUMN_PITCH = 520;
// Reserve conservative line boxes; bpmn-js performs the final font-measured wrapping.
function textHeight(text: string, columns = 24): number {
  let lines = 1, used = 0;
  for (const word of text.split(/\s+/)) {
    if (used && used + word.length + 1 > columns) { lines++; used = 0; }
    const chunks = Math.max(1, Math.ceil(word.length / columns));
    lines += chunks - 1;
    used = chunks > 1 ? word.length % columns || columns : used + (used ? 1 : 0) + word.length;
  }
  return lines * 20 + 16;
}
function externalStepLabel(step: WorkflowStep, box: Bounds): Bounds {
  return {x: box.x + box.width / 2 - LABEL_WIDTH / 2, y: box.y + box.height + 12,
    width: LABEL_WIDTH, height: textHeight(step.name)};
}
function overlaps(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.width + 12 && a.x + a.width + 12 > b.x &&
    a.y < b.y + b.height + 12 && a.y + a.height + 12 > b.y;
}
function placeFlowLabel(preferred: Bounds, occupied: Bounds[]): Bounds {
  const box = {...preferred};
  let obstacle: Bounds | undefined;
  while ((obstacle = occupied.find(other => overlaps(box, other)))) box.y = obstacle.y + obstacle.height + 16;
  occupied.push(box);
  return box;
}
function layout(model: SystemModel): {
  bounds: Map<string, Bounds>;
  lanes: { id: string; actor: string; name: string; bounds: Bounds }[];
} {
  const ranks = new Map<string, number>();
  const rank = (id: string): number => {
    if (ranks.has(id)) return ranks.get(id)!;
    const incoming = model.workflow.edges.filter((e) => e.to === id);
    const r = incoming.length
      ? Math.max(...incoming.map((e) => rank(e.from))) + 1
      : 0;
    ranks.set(id, r);
    return r;
  };
  const actors = [...new Set(model.workflow.steps.map((s) => s.actor ?? ""))];
  const groups = new Map<string, WorkflowStep[]>();
  for (const step of model.workflow.steps) {
    const key = (step.actor ?? "") + "|" + rank(step.id);
    groups.set(key, [...(groups.get(key) ?? []), step]);
  }
  const slotHeight = Math.max(180,
    ...model.workflow.steps.map(step => step.kind === "task" ? textHeight(step.name, 18) + 48 : textHeight(step.name) + 100),
    ...model.workflow.edges.map(edge => textHeight(conditionLabel(model, edge)) + 60));
  const laneHeight = Math.max(220, Math.max(...[...groups.values()].map(g => g.length)) * slotHeight + 80);
  const laneWidth = (Math.max(...ranks.values()) + 1) * COLUMN_PITCH + 100;
  const lanes = actors.map((actor, i) => ({
    id: `Lane_${i}`,
    actor,
    name:
      model.nodes.find((n) => n.id === actor)?.name ??
      "Без назначенного участника",
    bounds: {
      x: 40,
      y: 80 + i * laneHeight,
      width: laneWidth,
      height: laneHeight,
    },
  }));
  const bounds = new Map<string, Bounds>();
  for (const steps of groups.values())
    steps.forEach((step, i) => {
      const lane = lanes.find((l) => l.actor === (step.actor ?? ""))!;
      const width =
          step.kind === "task" ? TASK_WIDTH : step.kind === "decision" ? 50 : 36,
        height = step.kind === "task" ? Math.max(100, textHeight(step.name, 18) + 16) : width;
      bounds.set(step.id, {
        x: 100 + rank(step.id) * COLUMN_PITCH + (TASK_WIDTH - width) / 2,
        y: lane.bounds.y + 40 + i * slotHeight,
        width,
        height,
      });
    });
  return { bounds, lanes };
}
/** BPMN 2.0 interchange, with frozen model rules; not an engine deployment or ARIS project. */
export function exportBpmnXml(model: SystemModel): string {
  assertModel(model);
  // BPMN decision gateways remain separate from tasks/events that perform the work.
  const branching = model.workflow.steps.filter(
    (s) =>
      s.kind !== "decision" &&
      model.workflow.edges.filter((e) => e.from === s.id).length > 1,
  );
  if (branching.length) {
    const usedSteps = new Set(model.workflow.steps.map((s) => s.id)),
      usedEdges = new Set(model.workflow.edges.map((e) => e.id));
    const unique = (prefix: string, used: Set<string>) => {
      let id = prefix;
      while (used.has(id)) id += "_";
      used.add(id);
      return id;
    };
    const choices = new Map(
      branching.map((s, i) => [s.id, unique("_bpmn_choice_" + i, usedSteps)]),
    );
    model = {
      ...model,
      workflow: {
        steps: [
          ...model.workflow.steps,
          ...branching.map((s) => ({
            id: choices.get(s.id)!,
            name: "Выбор маршрута: " + s.name,
            kind: "decision" as const,
            actor: s.actor,
          })),
        ],
        edges: [
          ...model.workflow.edges.map((e) => ({
            ...e,
            from: choices.get(e.from) ?? e.from,
          })),
          ...branching.map((s, i) => ({
            id: unique("_bpmn_link_" + i, usedEdges),
            from: s.id,
            to: choices.get(s.id)!,
            condition: "always" as const,
          })),
        ],
      },
    };
  }
  const stepId = new Map(
    model.workflow.steps.map((s, i) => [s.id, `Step_${i}`]),
  );
  const flowId = new Map(
    model.workflow.edges.map((e, i) => [e.id, `Flow_${i}`]),
  );
  const { bounds, lanes } = layout(model);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_1" targetNamespace="urn:diagram-ide:bpmn" exporter="Diagram IDE" exporterVersion="1">',
    `  <bpmn:process id="Process_1" name="${xml(model.name)}" isExecutable="false">`,
    `    <bpmn:documentation>${xml(model.description + " / Model " + model.id + " v" + model.version + ". Conditions use amount (" + model.rules.currency + ") and decision (approved/rejected). Approval enabled: " + model.rules.requireApproval + "; threshold: " + model.rules.approvalThreshold + ". Interchange only; no service integrations executed.")}</bpmn:documentation>`,
  ];
  lines.push('    <bpmn:laneSet id="LaneSet_1">');
  for (const lane of lanes) {
    lines.push(`      <bpmn:lane id="${lane.id}" name="${xml(lane.name)}">`);
    for (const step of model.workflow.steps.filter(
      (s) => (s.actor ?? "") === lane.actor,
    ))
      lines.push(
        `        <bpmn:flowNodeRef>${stepId.get(step.id)}</bpmn:flowNodeRef>`,
      );
    lines.push("      </bpmn:lane>");
  }
  lines.push("    </bpmn:laneSet>");
  const tag = {
    start: "startEvent",
    task: "task",
    decision: "exclusiveGateway",
    end: "endEvent",
  } as const;
  for (const step of model.workflow.steps) {
    const direction =
      model.workflow.edges.filter((e) => e.from === step.id).length > 1
        ? "Diverging"
        : model.workflow.edges.filter((e) => e.to === step.id).length > 1
          ? "Converging"
          : "Unspecified";
    const attrs =
      step.kind === "decision" ? ` gatewayDirection="${direction}"` : "";
    lines.push(
      `    <bpmn:${tag[step.kind]} id="${stepId.get(step.id)}" name="${xml(step.name)}"${attrs}>`,
    );
    if (step.actor) {
      const actor = model.nodes.find((n) => n.id === step.actor)!;
      lines.push(
        `      <bpmn:documentation>${xml("Actor: " + actor.name + " / " + actor.technology)}</bpmn:documentation>`,
      );
    }
    for (const edge of model.workflow.edges.filter((e) => e.to === step.id))
      lines.push(`      <bpmn:incoming>${flowId.get(edge.id)}</bpmn:incoming>`);
    for (const edge of model.workflow.edges.filter((e) => e.from === step.id))
      lines.push(`      <bpmn:outgoing>${flowId.get(edge.id)}</bpmn:outgoing>`);
    lines.push(`    </bpmn:${tag[step.kind]}>`);
  }
  for (const edge of model.workflow.edges) {
    lines.push(
      `    <bpmn:sequenceFlow id="${flowId.get(edge.id)}" sourceRef="${stepId.get(edge.from)}" targetRef="${stepId.get(edge.to)}" name="${xml(conditionLabel(model, edge))}">`,
    );
    const expression = conditionExpression(model, edge);
    if (expression)
      lines.push(
        `      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" language="https://www.ecma-international.org/ecma-262/">${xml(expression)}</bpmn:conditionExpression>`,
      );
    lines.push("    </bpmn:sequenceFlow>");
  }
  lines.push(
    "  </bpmn:process>",
    '  <bpmndi:BPMNDiagram id="Diagram_1">',
    '    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_1">',
  );
  for (const lane of lanes) {
    const b = lane.bounds;
    lines.push(
      `      <bpmndi:BPMNShape id="Shape_${lane.id}" bpmnElement="${lane.id}" isHorizontal="true">`,
      `        <dc:Bounds x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}"/>`,
      "      </bpmndi:BPMNShape>",
    );
  }
  for (const step of model.workflow.steps) {
    const b = bounds.get(step.id)!;
    lines.push(
      `      <bpmndi:BPMNShape id="Shape_${stepId.get(step.id)}" bpmnElement="${stepId.get(step.id)}"${step.kind === "decision" ? ' isMarkerVisible="true"' : ""}>`,
      `        <dc:Bounds x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}"/>`,
    );
    if (step.kind !== "task") {
      const label = externalStepLabel(step, b);
      lines.push(
        "        <bpmndi:BPMNLabel>",
        `          <dc:Bounds x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}"/>`,
        "        </bpmndi:BPMNLabel>",
      );
    }
    lines.push("      </bpmndi:BPMNShape>");
  }
  const occupied = [...bounds.values(), ...model.workflow.steps.filter(s => s.kind !== "task").map(s => externalStepLabel(s, bounds.get(s.id)!))];
  for (const edge of model.workflow.edges) {
    const from = bounds.get(edge.from)!,
      to = bounds.get(edge.to)!;
    const x1 = from.x + from.width,
      y1 = from.y + from.height / 2,
      x2 = to.x,
      y2 = to.y + to.height / 2,
      middle = 100 + Math.floor((from.x - 100) / COLUMN_PITCH) * COLUMN_PITCH + TASK_WIDTH + (COLUMN_PITCH - TASK_WIDTH) / 2;
    const labelHeight = textHeight(conditionLabel(model, edge));
    const label = placeFlowLabel({x: middle - LABEL_WIDTH / 2, y: Math.max(80, (y1 + y2) / 2 - labelHeight - 12), width: LABEL_WIDTH, height: labelHeight}, occupied);
    lines.push(
      `      <bpmndi:BPMNEdge id="Edge_${flowId.get(edge.id)}" bpmnElement="${flowId.get(edge.id)}">`,
      `        <di:waypoint x="${x1}" y="${y1}"/>`,
    );
    if (y1 !== y2)
      lines.push(
        `        <di:waypoint x="${middle}" y="${y1}"/>`,
        `        <di:waypoint x="${middle}" y="${y2}"/>`,
      );
    lines.push(
      `        <di:waypoint x="${x2}" y="${y2}"/>`,
      "        <bpmndi:BPMNLabel>",
      `          <dc:Bounds x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}"/>`,
      "        </bpmndi:BPMNLabel>",
      "      </bpmndi:BPMNEdge>",
    );
  }
  lines.push(
    "    </bpmndi:BPMNPlane>",
    "  </bpmndi:BPMNDiagram>",
    "</bpmn:definitions>",
  );
  return lines.join("\n") + "\n";
}
