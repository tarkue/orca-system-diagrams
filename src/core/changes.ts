import type { ModelChange, Proposal, SystemModel } from "./model";
import { assertModel } from "./validation";
export function diffModels(
  before: SystemModel,
  after: SystemModel,
): ModelChange[] {
  const changes: ModelChange[] = [];
  const walk = (a: unknown, b: unknown, path: string) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (
      a &&
      b &&
      typeof a === "object" &&
      typeof b === "object" &&
      !Array.isArray(a) &&
      !Array.isArray(b)
    ) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
        walk(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
          path ? `${path}.${key}` : key,
        );
      return;
    }
    changes.push({
      path,
      before: a,
      after: b,
      description: `Изменено: ${path}`,
    });
  };
  walk(before, after, "");
  return changes;
}
export function proposeChange(model: SystemModel, prompt: string): Proposal {
  assertModel(model);
  if (typeof prompt !== "string" || prompt.length > 2000)
    throw Error("Command must be a string of at most 2000 characters");
  const next: SystemModel = JSON.parse(JSON.stringify(model));
  const text = prompt.trim();
  let summary = "";
  const threshold = text.match(
    /^(?:(?:set|change|установи(?:ть)?|измени(?:ть)?)\s+)?(?:approval\s+threshold|threshold|порог(?:\s+согласования)?)\s*(?:to|на|до|=|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:RUB|руб(?:лей|ля|ль)?|₽)?[.!]?$/iu,
  );
  const off =
    /^(?:(?:disable|turn off)\s+approval|(?:отключи(?:ть)?|выключи(?:ть)?)\s+согласование)[.!]?$/iu.test(
      text,
    );
  const on =
    /^(?:(?:enable|turn on)\s+approval|(?:включи(?:ть)?)\s+согласование)[.!]?$/iu.test(
      text,
    );
  const tech =
    text.match(/^(?:set|change)\s+technology\s+(.+?)\s+to\s+(.+)$/iu) ??
    text.match(
      /^(?:измени(?:ть)?|установи(?:ть)?)\s+технологию\s+(.+?)\s+на\s+(.+)$/iu,
    );
  if (threshold) {
    next.rules.approvalThreshold = Number(threshold[1].replace(",", "."));
    summary = `Порог согласования: ${next.rules.approvalThreshold} ${next.rules.currency}`;
  } else if (off || on) {
    next.rules.requireApproval = on;
    summary = on ? "Согласование включено" : "Согласование отключено";
  } else if (tech) {
    const target = tech[1].toLocaleLowerCase();
    const node = next.nodes.find(
      (n) =>
        n.id.toLocaleLowerCase() === target ||
        n.name.toLocaleLowerCase() === target,
    );
    if (!node)
      throw Error(
        "Unknown technology target. Use node id: " +
          next.nodes.map((n) => n.id).join(", "),
      );
    const previous = node.technology;
    node.technology = tech[2].trim();
    for (const item of next.stack)
      if (item.name === previous) item.name = node.technology;
    summary = `${node.name}: ${node.technology}`;
  } else
    throw Error(
      "Поддерживаются / Supported: set threshold 10000; включи/отключи согласование; enable/disable approval; set technology api to Rust; измени технологию api на Rust",
    );
  if (threshold || off || on) {
    for (const edge of next.workflow.edges) {
      if (edge.condition === "above_threshold")
        edge.label = `> ${next.rules.approvalThreshold} ${next.rules.currency}; ${next.rules.requireApproval ? "согласование включено" : "согласование отключено"}`;
      if (edge.condition === "below_threshold")
        edge.label = `≤ ${next.rules.approvalThreshold} ${next.rules.currency} или без согласования`;
    }
    for (const transition of next.transitions) {
      const edge = next.workflow.edges.find(
        (e) => e.from === transition.from && e.to === transition.to,
      );
      if (edge) transition.label = edge.label ?? "Далее";
    }
  }
  next.version++;
  assertModel(next);
  return { model: next, summary, changes: diffModels(model, next) };
}
