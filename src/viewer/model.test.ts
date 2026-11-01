import { expect, it } from 'vitest';
import { sampleProjects } from '../core';
import { readInjectedModel } from './model';
it('accepts valid injected workspace models and rejects absent or malformed data', () => {
  expect(readInjectedModel(undefined)).toBeNull();
  expect(readInjectedModel({name:'wrong'})).toBeNull();
  expect(readInjectedModel(sampleProjects[0])).toEqual(sampleProjects[0]);
});

import { elementsForNotation } from './model';
it('resolves reused workflow/state IDs inside the selected notation only', () => {
  const model = sampleProjects[0];
  const shared = model.states.find(state => model.workflow.steps.some(step => step.id === state.id));
  expect(shared).toBeDefined();
  expect(elementsForNotation(model, 'state').find(item => item.id === shared!.id)).toBe(shared);
  expect(elementsForNotation(model, 'bpmn').find(item => item.id === shared!.id)).not.toBe(shared);
});
