import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const panel = readFileSync(new URL('../OrcaPanel.tsx', import.meta.url), 'utf8');
const diagram = readFileSync(new URL('../Diagram.tsx', import.meta.url), 'utf8');
it('uses CSP-safe browsable element buttons with visible selection instead of a native inspector select', () => {
  const inspector = panel.slice(panel.indexOf('function ModelInspector'));
  expect(inspector).toContain('viewer-element-list');
  expect(inspector).toContain('aria-pressed={item.id === element?.id}');
  expect(inspector).not.toMatch(/<select|<a\s/);
});
it('offers an accessible panel-right icon toggle with state and preserves close control', () => {
  expect(panel).toContain('<PanelRight');
  expect(panel).toContain("inspector ? 'Скрыть инспектор' : 'Показать инспектор'");
  expect(panel).toContain('aria-pressed={inspector}');
  expect(panel).toContain('aria-label="Закрыть инспектор"');
});
it('routes inspector selections to diagram focus without interpolating opaque IDs into CSS selectors', () => {
  expect(panel).toContain('setFocusRequest(previous =>');
  expect(diagram).toContain('focusElement(');
  expect(diagram).toContain("element.getAttribute('data-model-id')) === focusRequest.id");
});
