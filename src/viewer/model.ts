import { validateModel, type Notation, type SystemModel } from '../core';
export function readInjectedModel(value: unknown): SystemModel | null {
  return validateModel(value).valid ? value as SystemModel : null;
}
declare global { interface Window { __SYSTEM_DIAGRAM_MODEL__?: unknown } }

export function elementsForNotation(model: SystemModel, notation: Notation) {
  if(notation === 'state') return model.states;
  if(notation === 'er') return model.entities;
  if(notation === 'bpmn' || notation === 'epc') return model.workflow.steps;
  return model.nodes;
}
