import type { SystemModel } from "./model";
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function validateModel(input: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  try {
    const seen = new WeakSet<object>();
    let count = 0;
    const bounded = (v: unknown, depth: number): void => {
      if (++count > 20000 || depth > 15)
        throw Error("Model exceeds size/depth limit");
      if (typeof v === "string" && v.length > 2000)
        throw Error("String exceeds 2000 characters");
      if (v && typeof v === "object") {
        if (seen.has(v)) throw Error("Cyclic/shared object input");
        seen.add(v);
        if (Array.isArray(v) && v.length > 300)
          throw Error("Collection exceeds 300 items");
        for (const child of Object.values(v)) bounded(child, depth + 1);
      }
    };
    bounded(input, 0);
    const fail = (path: string) => {
      if (errors.length < 100) errors.push(path);
    };
    const record = (v: unknown, path: string): Record<string, unknown> => {
      if (!object(v)) {
        fail(`${path} must be an object`);
        return {};
      }
      return v;
    };
    const str = (v: unknown, path: string) => {
      if (typeof v !== "string" || !v.trim() || v.length > 2000)
        fail(`${path} must be a nonempty string`);
    };
    const arr = (v: unknown, path: string): Record<string, unknown>[] => {
      if (!Array.isArray(v)) {
        fail(`${path} must be an array`);
        return [];
      }
      return v.map((x, i) => record(x, `${path}[${i}]`));
    };
    const choice = (v: unknown, values: string[], path: string) => {
      if (!values.includes(v as string)) fail(`${path} invalid value`);
    };
    const m = record(input, "model");
    for (const k of ["id", "name", "description"]) str(m[k], k);
    if (!Number.isInteger(m.version) || (m.version as number) < 1)
      fail("version must be a positive integer");
    const nodes = arr(m.nodes, "nodes"),
      relations = arr(m.relations, "relations"),
      w = record(m.workflow, "workflow"),
      steps = arr(w.steps, "steps"),
      edges = arr(w.edges, "edges"),
      entities = arr(m.entities, "entities"),
      ers = arr(m.entityRelations, "entityRelations"),
      states = arr(m.states, "states"),
      transitions = arr(m.transitions, "transitions"),
      stack = arr(m.stack, "stack");
    const ids = (items: Record<string, unknown>[], path: string) => {
      const s = new Set<unknown>();
      for (const x of items) {
        str(x.id, `${path}.id`);
        if (s.has(x.id)) fail(`${path} duplicate id`);
        s.add(x.id);
      }
      return s;
    };
    const ns = ids(nodes, "nodes"),
      ws = ids(steps, "steps"),
      es = ids(entities, "entities"),
      ss = ids(states, "states");
    ids(relations, "relations");
    ids(edges, "edges");
    const refs = (
      items: Record<string, unknown>[],
      set: Set<unknown>,
      path: string,
    ) => {
      for (const x of items) {
        if (!set.has(x.from) || !set.has(x.to))
          fail(`${path} references unknown id`);
      }
    };
    refs(relations, ns, "relations");
    refs(edges, ws, "edges");
    refs(ers, es, "entityRelations");
    refs(transitions, ss, "transitions");
    for (const n of nodes) {
      for (const k of ["name", "description", "technology"])
        str(n[k], `node.${k}`);
      choice(
        n.kind,
        ["person", "service", "database", "external"],
        "node.kind",
      );
    }
    for (const r of [...relations, ...ers, ...transitions])
      str(r.label, "relation.label");
    for (const r of ers)
      if (r.cardinality !== undefined) str(r.cardinality, "cardinality");
    for (const s of steps) {
      str(s.name, "step.name");
      choice(s.kind, ["start", "task", "decision", "end"], "step.kind");
      if (s.actor !== undefined && !ns.has(s.actor))
        fail("step.actor references unknown node");
    }
    for (const e of edges) {
      if (e.label !== undefined) str(e.label, "edge.label");
      if (e.condition !== undefined)
        choice(
          e.condition,
          [
            "always",
            "above_threshold",
            "below_threshold",
            "approved",
            "rejected",
          ],
          "edge.condition",
        );
    }
    for (const e of entities) {
      str(e.name, "entity.name");
      const fields = arr(e.fields, "fields");
      if (!fields.length) fail("entity needs fields");
      const names = new Set();
      for (const f of fields) {
        str(f.name, "field.name");
        str(f.type, "field.type");
        if (names.has(f.name)) fail("duplicate field name");
        names.add(f.name);
        if (f.key !== undefined && typeof f.key !== "boolean")
          fail("field.key must be boolean");
      }
    }
    for (const s of states) str(s.name, "state.name");
    for (const s of stack) {
      str(s.name, "stack.name");
      str(s.purpose, "stack.purpose");
    }
    const rules = record(m.rules, "rules");
    if (
      typeof rules.approvalThreshold !== "number" ||
      !Number.isFinite(rules.approvalThreshold) ||
      rules.approvalThreshold < 0
    )
      fail("approvalThreshold must be finite and nonnegative");
    str(rules.currency, "rules.currency");
    if (typeof rules.requireApproval !== "boolean")
      fail("requireApproval must be boolean");
    if (!nodes.length || !entities.length || !states.length)
      fail("nodes/entities/states must be nonempty");
    const starts = steps.filter((s) => s.kind === "start");
    if (starts.length !== 1) fail("workflow requires exactly one start");
    if (!steps.some((s) => s.kind === "end")) fail("workflow requires an end");
    for (const s of steps) {
      const outgoing = edges.filter((e) => e.from === s.id);
      if (s.kind === "end" && outgoing.length)
        fail("end cannot have outgoing edges");
      if (s.kind !== "end" && !outgoing.length)
        fail("non-end step requires outgoing edge");
      const conditions = outgoing.map((e) => e.condition ?? "always");
      if (
        new Set(conditions).size !== conditions.length ||
        (conditions.includes("always") && conditions.length > 1)
      )
        fail("ambiguous outgoing conditions");
      if (
        conditions.some((c) => c === "approved" || c === "rejected") &&
        !(
          conditions.length === 2 &&
          conditions.includes("approved") &&
          conditions.includes("rejected")
        )
      )
        fail("approval branches must include approved and rejected");
      if (
        conditions.some(
          (c) => c === "above_threshold" || c === "below_threshold",
        ) &&
        !(
          conditions.length === 2 &&
          conditions.includes("above_threshold") &&
          conditions.includes("below_threshold")
        )
      )
        fail(
          "threshold branches must include above_threshold and below_threshold",
        );
    }
    const reached = new Set<unknown>();
    const pending = starts.map((s) => s.id);
    while (pending.length) {
      const id = pending.pop();
      if (reached.has(id)) continue;
      reached.add(id);
      for (const e of edges) if (e.from === id) pending.push(e.to);
    }
    if (steps.some((s) => !reached.has(s.id)))
      fail("workflow contains unreachable steps");
    const active = new Set<unknown>(),
      finished = new Set<unknown>();
    const visit = (id: unknown): void => {
      if (active.has(id)) {
        fail("workflow cycles are unsupported");
        return;
      }
      if (finished.has(id)) return;
      active.add(id);
      for (const e of edges) if (e.from === id) visit(e.to);
      active.delete(id);
      finished.add(id);
    };
    for (const step of steps) visit(step.id);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "Invalid model");
  }
  return { valid: errors.length === 0, errors };
}
export function assertModel(input: unknown): asserts input is SystemModel {
  const v = validateModel(input);
  if (!v.valid) throw Error(`Invalid model: ${v.errors.join("; ")}`);
}
