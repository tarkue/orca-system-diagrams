import type { ScenarioInput, ScenarioResult, SystemModel } from "./model";
import { assertModel } from "./validation";
export function runScenario(
  model: SystemModel,
  input: ScenarioInput,
): ScenarioResult {
  assertModel(model);
  if (
    !input ||
    !Number.isFinite(input.amount) ||
    input.amount < 0 ||
    !["approved", "rejected"].includes(input.decision)
  )
    throw Error(
      "Scenario requires a nonnegative finite amount and approved/rejected decision",
    );
  const requiresApproval =
    model.rules.requireApproval && input.amount > model.rules.approvalThreshold;
  const enabled: Record<string, boolean> = {
    always: true,
    above_threshold: requiresApproval,
    below_threshold: !requiresApproval,
    approved: input.decision === "approved",
    rejected: input.decision === "rejected",
  };
  const visitedStepIds: string[] = [];
  let current = model.workflow.steps.find((s) => s.kind === "start")!;
  let rejected = false;
  let approvalVisited = false;
  while (current) {
    if (visitedStepIds.includes(current.id))
      throw Error("Scenario encountered a workflow cycle");
    visitedStepIds.push(current.id);
    if (current.kind === "end") break;
    const outgoing = model.workflow.edges.filter((e) => e.from === current.id);
    if (
      outgoing.some(
        (e) => e.condition === "approved" || e.condition === "rejected",
      )
    )
      approvalVisited = true;
    const eligible = outgoing.filter((e) => enabled[e.condition ?? "always"]);
    if (eligible.length !== 1)
      throw Error(
        `Workflow step ${current.id} has ${eligible.length} eligible routes`,
      );
    if (eligible[0].condition === "rejected") rejected = true;
    current = model.workflow.steps.find((s) => s.id === eligible[0].to)!;
  }
  const assertions = [
    { name: "Достигнуто конечное состояние", passed: current.kind === "end" },
    {
      name: "Маршрут соответствует правилу согласования",
      passed: approvalVisited === requiresApproval,
    },
    {
      name: "Решение согласования соблюдено",
      passed: rejected === (requiresApproval && input.decision === "rejected"),
    },
  ];
  return {
    status: rejected ? "rejected" : "completed",
    requiresApproval,
    visitedStepIds,
    explanation: `${input.amount} ${model.rules.currency}; порог ${model.rules.approvalThreshold}. ${requiresApproval ? "Ветка согласования: " + input.decision : "Автоматическое выполнение"}. Маршрут: ${visitedStepIds.map((id) => model.workflow.steps.find((s) => s.id === id)!.name).join(" → ")}`,
    assertions,
  };
}
