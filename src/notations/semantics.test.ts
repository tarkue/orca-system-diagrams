import { describe, it, expect } from "vitest";
import { sampleProjects, diagramFor, exportBpmnXml } from "../core";
import { projectEpc } from "./epc-model";
import { renderC4 } from "./c4";
import { renderEpc } from "./epc";

describe("notation-specific semantics", () => {
  it.each(sampleProjects)(
    "alternates EPC events/functions across connectors: $id",
    (m) => {
      const p = projectEpc(m);
      const byId = new Map(p.nodes.map((n) => [n.id, n]));
      for (const node of p.nodes.filter((n) => n.kind !== "xor")) {
        const walk = (id: string) => {
          for (const edge of p.edges.filter((e) => e.from === id)) {
            const next = byId.get(edge.to)!;
            if (next.kind === "xor") walk(next.id);
            else expect(next.kind).not.toBe(node.kind);
          }
        };
        walk(node.id);
      }
      const svg = renderEpc(m, "test").svg;
      expect(svg).toContain('data-glyph="event"');
      expect(svg).toContain("<polygon");
      expect(svg).toContain('data-glyph="function"');
      expect(svg).toContain('data-glyph="xor"');
      expect(svg).toContain("<circle");
    },
  );
  it("uses recognizable typed C4 forms, stereotypes, boundary and legend", () => {
    const svg = renderC4(sampleProjects[0], "test").svg;
    for (const s of [
      'data-glyph="person"',
      'data-glyph="store"',
      'data-glyph="system"',
      'data-glyph="container"',
      "[Person]",
      "[Container]",
      "System boundary",
      "Legend",
    ])
      expect(svg).toContain(s);
  });
  it.each(sampleProjects)(
    "exports actor lanes, references and DI bounds: $id",
    (m) => {
      const xml = exportBpmnXml(m);
      const actors = new Set(m.workflow.steps.map((s) => s.actor ?? ""));
      expect(xml.match(/<bpmn:lane /g) ?? []).toHaveLength(actors.size);
      expect(xml.match(/<bpmn:flowNodeRef>/g) ?? []).toHaveLength(
        m.workflow.steps.length,
      );
      expect(xml.match(/bpmnElement="Lane_/g) ?? []).toHaveLength(actors.size);
    },
  );
  it("keeps declared cardinality and refuses to invent a missing one", () => {
    const m = structuredClone(sampleProjects[0]);
    m.entityRelations[0].cardinality = "many-to-one";
    expect(diagramFor(m, "er")).toContain("}o--||");
    m.entityRelations[0].cardinality = "one-to-one";
    expect(diagramFor(m, "er")).toContain("||--||");
    delete m.entityRelations[0].cardinality;
    expect(diagramFor(m, "er")).not.toContain("e0 ||--o{ e1");
    expect(diagramFor(m, "er")).toContain("Cardinality not specified");
  });
  it("adds initial/final state pseudostates derived from workflow", () => {
    const source = diagramFor(sampleProjects[0], "state");
    expect(source).toContain("[*] --> s0");
    expect(source).toContain("s6 --> [*]");
    expect(source).toContain("s7 --> [*]");
  });
  it("keeps hostile text inert and inspector IDs stable in custom SVG", () => {
    const m = structuredClone(sampleProjects[0]);
    m.nodes[0].name = "<script>alert(1)</script>";
    m.workflow.steps[1].name = '" onload="alert(1) <evil/>';
    for (const renderer of [renderC4, renderEpc]) {
      const r = renderer(m, "safe");
      expect(r.svg).not.toContain("<script>");
      expect(r.svg).not.toContain("<evil/>");
      expect(r.svg).not.toContain(' onload="');
      expect(Object.values(r.elementIdMap ?? {})).toContain(
        renderer === renderC4 ? "customer" : "validate",
      );
    }
  });
});

it("routes every EPC split and join through connectors, including branching tasks", () => {
  const m = structuredClone(sampleProjects[0]);
  m.workflow.steps.find((s) => s.id === "approval")!.kind = "task";
  const p = projectEpc(m);
  for (const n of p.nodes.filter((n) => n.kind !== "xor")) {
    expect(p.edges.filter((e) => e.from === n.id).length).toBeLessThanOrEqual(
      1,
    );
    expect(p.edges.filter((e) => e.to === n.id).length).toBeLessThanOrEqual(1);
  }
});

it("replaces lone surrogate characters and rejects theme CSS injection", () => {
  const m = structuredClone(sampleProjects[0]);
  m.nodes[0].name = "bad\ud800name";
  const r = renderC4(m, "unicode", {
    background: "red;onload=alert(1)",
    primaryColor: "url(https://evil.invalid)",
  });
  expect(r.svg).not.toContain("\ud800");
  expect(r.svg).not.toContain("evil.invalid");
  expect(r.svg).not.toContain("onload=");
});

it("adds a BPMN exclusive gateway for branching tasks instead of pretending the task is a gateway", () => {
  const m = structuredClone(sampleProjects[0]);
  m.workflow.steps.find((s) => s.id === "approval")!.kind = "task";
  const xml = exportBpmnXml(m);
  expect(xml).toContain('<bpmn:task id="Step_3"');
  expect(xml).toContain('<bpmn:exclusiveGateway id="Step_8"');
  expect(xml).toContain('sourceRef="Step_3" targetRef="Step_8"');
});
