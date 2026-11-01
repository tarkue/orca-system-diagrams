# Shared system model

The framework-independent core validates one SystemModel and supplies each notation projection.

- model.ts defines nodes, workflow steps/edges, entities, states and stack.
- validation.ts bounds untrusted JSON and checks references and workflow structure.
- architecture-projections.ts and diagrams.ts derive notation-specific sources.
- bpmn-xml.ts emits non-executable BPMN2 XML with actors, lanes and diagram interchange geometry.
- notation-labels.ts preserves declared relation cardinality and workflow conditions.
- samples.ts provides fictional regression fixtures.

The browser renderers are in ../notations. The native viewer is a read-only consumer, not a workflow execution service or repository scanner. Historical deterministic change/scenario helpers remain for compatibility tests and are not exposed in the delivered panel.

See ../../docs/MODEL.md and ../../docs/NOTATIONS.md for schema, semantics and limitations.
