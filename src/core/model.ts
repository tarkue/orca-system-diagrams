export type Notation = "c4" | "bpmn" | "sequence" | "er" | "state" | "epc";
export interface SystemNode {
  id: string;
  name: string;
  kind: "person" | "service" | "database" | "external";
  description: string;
  technology: string;
}
export interface SystemRelation {
  id: string;
  from: string;
  to: string;
  label: string;
}
export interface WorkflowStep {
  id: string;
  name: string;
  kind: "start" | "task" | "decision" | "end";
  actor?: string;
}
export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  condition?:
    "always" | "above_threshold" | "below_threshold" | "approved" | "rejected";
}
export interface Entity {
  id: string;
  name: string;
  fields: { name: string; type: string; key?: boolean }[];
}
export interface EntityRelation {
  from: string;
  to: string;
  label: string;
  cardinality?: string;
}
export interface SystemModel {
  id: string;
  name: string;
  description: string;
  version: number;
  nodes: SystemNode[];
  relations: SystemRelation[];
  workflow: { steps: WorkflowStep[]; edges: WorkflowEdge[] };
  entities: Entity[];
  entityRelations: EntityRelation[];
  states: { id: string; name: string }[];
  transitions: { from: string; to: string; label: string }[];
  rules: {
    approvalThreshold: number;
    currency: string;
    requireApproval: boolean;
  };
  stack: { name: string; purpose: string }[];
}
export interface ModelChange {
  path: string;
  before: unknown;
  after: unknown;
  description: string;
}
export interface Proposal {
  model: SystemModel;
  summary: string;
  changes: ModelChange[];
}
export interface ScenarioInput {
  amount: number;
  decision: "approved" | "rejected";
}
export interface ScenarioResult {
  status: "completed" | "rejected" | "awaiting_approval";
  requiresApproval: boolean;
  visitedStepIds: string[];
  explanation: string;
  assertions: { name: string; passed: boolean }[];
}
