import { describe, expect, it } from "vitest";
import {
  sampleProjects,
  validateModel,
  diagramFor,
  proposeChange,
  runScenario,
  diffModels,
} from "./index";
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
describe("shared domain engine", () => {
  it.each([0, 1, 2])("validates rich sample %s and projects six views", (i) => {
    const m = sampleProjects[i];
    expect(validateModel(m)).toEqual({ valid: true, errors: [] });
    for (const n of ["c4", "bpmn", "sequence", "er", "state", "epc"] as const)
      expect(diagramFor(m, n).length).toBeGreaterThan(100);
    expect(m.entities.length).toBeGreaterThan(2);
  });
  it("rejects malformed and oversized untrusted input without crashing", () => {
    for (const bad of [
      null,
      [],
      {},
      { rules: null },
      { nodes: Array(1001).fill({}) },
    ])
      expect(validateModel(bad).valid).toBe(false);
    const m = clone(sampleProjects[0]);
    m.relations[0].to = "missing";
    expect(validateModel(m).valid).toBe(false);
    m.rules.approvalThreshold = NaN;
    expect(validateModel(m).valid).toBe(false);
  });
  it.each([0, 1, 2])(
    "executes boundary and approval branches for sample %s",
    (i) => {
      const m = sampleProjects[i],
        t = m.rules.approvalThreshold;
      expect(runScenario(m, { amount: t, decision: "rejected" }).status).toBe(
        "completed",
      );
      const approved = runScenario(m, { amount: t + 1, decision: "approved" });
      const rejected = runScenario(m, { amount: t + 1, decision: "rejected" });
      expect(approved.status).toBe("completed");
      expect(rejected.status).toBe("rejected");
      expect(approved.requiresApproval).toBe(true);
      expect(approved.visitedStepIds).not.toEqual(rejected.visitedStepIds);
      expect(approved.assertions.every((a) => a.passed)).toBe(true);
    },
  );
  it("detects broken runtime paths instead of reporting fake success", () => {
    const m = clone(sampleProjects[0]);
    m.workflow.edges = m.workflow.edges.filter(
      (e) => e.condition !== "approved",
    );
    expect(() =>
      runScenario(m, { amount: 999999, decision: "approved" }),
    ).toThrow();
  });
  it("supports bilingual changes and real diffs without mutating originals", () => {
    const m = sampleProjects[0];
    const p = proposeChange(m, "Установи порог согласования 12000");
    expect(p.model.rules.approvalThreshold).toBe(12000);
    expect(p.changes).toEqual(diffModels(m, p.model));
    expect(m.rules.approvalThreshold).not.toBe(12000);
    const off = proposeChange(m, "disable approval");
    expect(off.model.rules.requireApproval).toBe(false);
    expect(
      runScenario(off.model, { amount: 999999, decision: "rejected" }).status,
    ).toBe("completed");
    expect(
      proposeChange(off.model, "включи согласование").model.rules
        .requireApproval,
    ).toBe(true);
    expect(
      proposeChange(m, "set technology api to Rust").model.nodes.find(
        (n) => n.id === "api",
      )?.technology,
    ).toBe("Rust");
    expect(() => proposeChange(m, "build me a spaceship")).toThrow(
      /Supported|Поддерж/,
    );
  });
  it("encodes hostile labels and never uses provider IDs as Mermaid syntax", () => {
    const m = clone(sampleProjects[0]);
    m.nodes[0].name = 'x"\nend\nclick evil "javascript:alert(1)" <script>';
    m.entities[0].fields[0].name = "a\n} evil";
    for (const n of ["c4", "bpmn", "sequence", "er", "state", "epc"] as const) {
      const source = diagramFor(m, n);
      expect(source).not.toContain("\nclick ");
      expect(source).not.toContain("<script>");
    }
  });
});

describe("validation invariants", () => {
  it.each([
    (m: any) => m.workflow.steps.push({ ...m.workflow.steps[0] }),
    (m: any) => (m.workflow.edges[0].condition = "constructor"),
    (m: any) => (m.workflow.steps[1].actor = "unknown"),
    (m: any) => (m.entities[0].fields[0].key = "true"),
    (m: any) => (m.states[0].id = m.states[1].id),
    (m: any) => (m.transitions[0].to = "unknown"),
    (m: any) => (m.rules.requireApproval = "yes"),
    (m: any) => (m.nodes[0].kind = "process"),
    (m: any) => m.workflow.edges.push({ ...m.workflow.edges[0], id: "other" }),
  ])("rejects invalid provider invariants %#", (mutate) => {
    const m = clone(sampleProjects[0]);
    mutate(m);
    expect(validateModel(m).valid).toBe(false);
  });
  it("rejects cyclic structures and negative scenario values", () => {
    const m: any = clone(sampleProjects[0]);
    m.extra = m;
    expect(validateModel(m).valid).toBe(false);
    expect(() =>
      runScenario(sampleProjects[0], { amount: -1, decision: "approved" }),
    ).toThrow();
  });
  it("synchronizes threshold labels across process and state views", () => {
    const m = proposeChange(sampleProjects[0], "set threshold 12345").model;
    expect(diagramFor(m, "bpmn")).toContain("12345");
    expect(diagramFor(m, "state")).toContain("12345");
  });
});

describe("workflow structural safety", () => {
  it("rejects incomplete decision branches", () => {
    const m = clone(sampleProjects[0]);
    m.workflow.edges = m.workflow.edges.filter(
      (e) => e.condition !== "approved",
    );
    expect(validateModel(m).valid).toBe(false);
  });
  it("rejects reachable loops that never finish", () => {
    const m = clone(sampleProjects[0]);
    m.workflow.edges.find((e) => e.from === "validate")!.to = "start";
    expect(validateModel(m).valid).toBe(false);
  });
});

it("follows renamed graph nodes and exposes a bypassed approval rule", () => {
  const m = clone(sampleProjects[0]);
  for (const step of m.workflow.steps) step.id = "custom_" + step.id;
  for (const edge of m.workflow.edges) {
    edge.from = "custom_" + edge.from;
    edge.to = "custom_" + edge.to;
  }
  const result = runScenario(m, { amount: 20000, decision: "approved" });
  expect(result.visitedStepIds).toContain("custom_approval");
  expect(result.assertions.every((a) => a.passed)).toBe(true);
  m.workflow.edges = m.workflow.edges.filter(
    (e) => e.from !== "custom_threshold",
  );
  m.workflow.edges.push({
    id: "bypass",
    from: "custom_threshold",
    to: "custom_execute",
    condition: "always",
  });
  // A disconnected approval step makes the modified model invalid instead of hiding the skipped rule.
  expect(validateModel(m).valid).toBe(false);
});

it("projects entity field identifiers and supported cardinalities faithfully", () => {
  const m = clone(sampleProjects[0]);
  m.entityRelations[0].cardinality = "one-to-one";
  const er = diagramFor(m, "er");
  expect(er).toContain("string order_id PK");
  expect(er).toContain("e0 ||--|| e1");
});

it("assigns domain data types without substring false positives", () => {
  const fields = sampleProjects[0].entities.flatMap((e) => e.fields);
  expect(fields.find((f) => f.name === "status")?.type).toBe("string");
  expect(fields.find((f) => f.name === "gateway_reference")?.type).toBe(
    "string",
  );
  expect(fields.find((f) => f.name === "paid_at")?.type).toBe("datetime");
});

it("escapes colons inside state transition descriptions", () => {
  const m = clone(sampleProjects[0]);
  m.transitions[0].label = "reason: rejected:";
  expect(diagramFor(m, "state")).toContain("reason#58; rejected#58;");
});
