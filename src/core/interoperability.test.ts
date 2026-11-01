import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  diagramFor,
  exportBpmnXml,
  sampleProjects,
  proposeChange,
} from "./index";

describe("notation interoperability", () => {
  it.each(sampleProjects)(
    "projects typed boundaries and workflow conditions for $id",
    (model) => {
      const c4 = diagramFor(model, "c4");
      expect(c4).toContain("subgraph system_boundary");
      expect(c4).toContain("Person");
      expect(c4).toContain("Container");
      expect(c4).toContain("Database");
      expect(c4).toContain("External system");
      const epc = diagramFor(model, "epc");
      expect(epc).toContain("EPC-inspired");
      expect(epc).toContain("XOR");
      expect(epc).toContain("{{");
      const sequence = diagramFor(model, "sequence");
      expect(sequence).toContain("alt ");
      expect(sequence).toContain(String(model.rules.approvalThreshold));
      expect(sequence).toContain(
        model.workflow.steps.find((s) => s.id === "execute")!.name,
      );
      expect(sequence).toContain("decision");
    },
  );
  it.each(sampleProjects)(
    "exports complete BPMN and layout reference integrity for $id",
    (model) => {
      const xml = exportBpmnXml(model);
      expect(xml).toContain("http://www.omg.org/spec/BPMN/20100524/MODEL");
      expect(xml).toContain("<bpmn:startEvent");
      expect(xml).toContain("<bpmn:exclusiveGateway");
      expect(xml).toContain("<bpmn:endEvent");
      expect(xml).toContain("<bpmn:conditionExpression");
      expect(xml.match(/<bpmn:sequenceFlow /g) ?? []).toHaveLength(
        model.workflow.edges.length,
      );
      expect(xml.match(/<bpmndi:BPMNShape /g) ?? []).toHaveLength(
        model.workflow.steps.length +
          new Set(model.workflow.steps.map((s) => s.actor ?? "")).size,
      );
      expect(xml.match(/<bpmndi:BPMNEdge /g) ?? []).toHaveLength(
        model.workflow.edges.length,
      );
      const ids = [...xml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const reference of xml.matchAll(
        /(?:sourceRef|targetRef|bpmnElement)="([^"]+)"/g,
      ))
        expect(ids).toContain(reference[1]);
      for (const ref of xml.matchAll(/<bpmn:(?:incoming|outgoing)>([^<]+)</g))
        expect(ids).toContain(ref[1]);
      expect(
        readFileSync(
          new URL(`../../examples/${model.id}.bpmn`, import.meta.url),
          "utf8",
        ),
      ).toBe(xml);
    },
  );
  it("escapes XML labels and derives expressions from changed rules", () => {
    const model = proposeChange(sampleProjects[0], "set threshold 12345").model;
    model.name = 'A & B <xml> "quotes"';
    model.workflow.steps[1].name = 'task & <evil/> " \u0001';
    const xml = exportBpmnXml(model);
    expect(xml).toContain("A &amp; B &lt;xml&gt; &quot;quotes&quot;");
    expect(xml).not.toContain("<evil/>");
    expect(xml).not.toContain("\u0001");
    expect(xml).toContain("amount &gt; 12345");
    expect(xml).toContain("amount &lt;= 12345");
    expect(xml).toContain("decision === &quot;approved&quot;");
    expect(
      exportBpmnXml(proposeChange(model, "disable approval").model),
    ).toContain("false &amp;&amp; amount");
  });
});

it("renders shared workflow continuation once after alternative branches", () => {
  const model = structuredClone(sampleProjects[0]);
  model.workflow = {
    steps: [
      { id: "s", name: "Begin", kind: "start" },
      { id: "d", name: "Rule", kind: "decision" },
      { id: "a", name: "Above", kind: "task" },
      { id: "b", name: "Below", kind: "task" },
      { id: "j", name: "Shared continuation", kind: "task" },
      { id: "e", name: "Done", kind: "end" },
    ],
    edges: [
      { id: "1", from: "s", to: "d" },
      { id: "2", from: "d", to: "a", condition: "above_threshold" },
      { id: "3", from: "d", to: "b", condition: "below_threshold" },
      { id: "4", from: "a", to: "j" },
      { id: "5", from: "b", to: "j" },
      { id: "6", from: "j", to: "e" },
    ],
  };
  const sequence = diagramFor(model, "sequence");
  expect(sequence.match(/Shared continuation/g)).toHaveLength(1);
  expect(sequence.indexOf("Shared continuation")).toBeGreaterThan(
    sequence.indexOf("\nend"),
  );
});
it("replaces untrusted model IDs with valid XML references", () => {
  const model = structuredClone(sampleProjects[0]);
  const old = model.workflow.steps[1].id;
  model.workflow.steps[1].id = 'bad id <> "';
  for (const e of model.workflow.edges) {
    if (e.from === old) e.from = model.workflow.steps[1].id;
    if (e.to === old) e.to = model.workflow.steps[1].id;
  }
  const xml = exportBpmnXml(model);
  expect(xml).not.toContain("bad id");
  expect(xml).toContain('targetRef="Step_1"');
});

it("does not merge a success branch after a rejection that terminates independently", () => {
  const model = sampleProjects[0],
    source = diagramFor(model, "sequence");
  const escapedName = model.workflow.steps.find(
    (s) => s.id === "execute",
  )!.name;
  // The task occurs once in each successful route: inside approval/approved and inside automatic processing.
  const selfCalls = source
    .split("\n")
    .filter((line) => line.includes("p2->>p2: " + escapedName));
  expect(selfCalls).toHaveLength(2);
  expect(source.trim().endsWith("end")).toBe(true);
});
