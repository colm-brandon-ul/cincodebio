# CincoDeBio Editor Test Coverage

Status: passed
Last updated: 2026-05-20

## Execution Plan

1. Audit all files in `languages/cinco-de-bio` and map every Cinco runtime class to a unit/source test, example model, and Playwright proof.
2. Add a versioned `workspace/` template under `cinco-de-bio-editor/` with realistic `.flow` examples.
3. Change Docker startup so `/editor/workspace` is cleaned at container start, restored from the workspace template, and then populated with the CincoDeBio language folder.
4. Add unit/source tests for all runtime classes and helper contracts that can run without a generated Cinco runtime.
5. Add Playwright tests with video, trace, screenshots, and log attachments for model creation, refresh, generator/context-menu coverage, and the sophisticated TMA workflow.
6. Run the validation suite and update this file with final artifact paths and pass/fail status.

## Coverage Matrix

| Class / Area | Path | Runtime base | Example model | Unit/source test | Playwright proof | Description | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SyncSibLibraryWithBackEnd` | `languages/cinco-de-bio/src/actions/SyncSibLibraryWithBackEnd.ts` | `CustomActionHandler` | `workspace/example.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_refresh_sib_library.spec.mjs` | Graph context-menu action downloads SIB libraries into `siblib/`, caches them, and refreshes the tool palette. | passed |
| `UpdateSIB` | `languages/cinco-de-bio/src/actions/UpdateSIB.ts` | `CustomActionHandler` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | SIB context-menu action synchronizes ports, labels, branches, and layout from the prime SIB library reference. | passed |
| `CincoDeBioGenerator` | `languages/cinco-de-bio/src/generator/CincoDeBioGenerator.ts` | `GeneratorHandler` | `workspace/review-tma-workflow.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Generator validates local SIB libraries and submits workflow models to the execution backend. | passed |
| `SIBHook` | `languages/cinco-de-bio/src/hooks/SIBHook.ts` | `AbstractNodeHook` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Post-create hook raises SIB properties, I/O ports, labels, and valid branches from prime references. | passed |
| `SIBDefHook` | `languages/cinco-de-bio/src/hooks/InteractiveHook.ts` | `AbstractNodeHook` | `workspace/sib-library-example.sibs` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | SIB library hook initializes service/task definitions and keeps their layout consistent. | passed |
| `NodeHook` | `languages/cinco-de-bio/src/hooks/NodeHook.ts` | `AbstractNodeHook` | `workspace/sib-library-example.sibs` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | SIB library node hook initializes branch/input/output names and relayouts parent SIB definitions. | passed |
| `ControlFlowHook` | `languages/cinco-de-bio/src/hooks/ControlFlowHook.ts` | `AbstractEdgeHook` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Control-flow hook labels new edges from the source SIB branch definition. | passed |
| `DataFlowHook` | `languages/cinco-de-bio/src/hooks/DataFlowHook.ts` | `AbstractEdgeHook` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Data-flow hook is currently intentionally a no-op; validations enforce data-flow semantics. | passed |
| `GenericSibHook` | `languages/cinco-de-bio/src/hooks/GenericSibHook.ts` | `DoubleClickHandler` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Double-click handler opens SIB documentation dialogs for workflow SIB nodes. | passed |
| `SibCheck` | `languages/cinco-de-bio/src/validation/SibCheck.ts` | `ValidationHandler` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Validates prime-reference drift, missing input dataflow, and SIB library consistency. | passed |
| `DataFlowCheck` | `languages/cinco-de-bio/src/validation/DataFlowCheck.ts` | `ValidationHandler` | `workspace/semantic-coverage.flow` | `tests/test_editor_semantics.mjs`; `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Validates data-flow type/list compatibility and control-flow ordering of data dependencies. | passed |
| `ControlFlowCheck` | `languages/cinco-de-bio/src/validation/ControlFlowCheck.ts` | `ValidationHandler` | `workspace/semantic-coverage.flow` | `tests/test_editor_semantics.mjs`; `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Validates cycles, exactly-one-start semantics, and branch-label correctness. | passed |
| `SibAppearanceProvider` | `languages/cinco-de-bio/src/appearanceProviders/SibAppearanceProvider.ts` | `AppearanceProvider` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Returns the workflow SIB view and logs appearance refreshes for automated and interactive SIBs. | passed |
| `SibLabelAppearanceProvider` | `languages/cinco-de-bio/src/appearanceProviders/SibLabelAppearanceProvider.ts` | `AppearanceProvider` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Synchronizes SIB label text and service/task icon paths from the owning SIB. | passed |
| `InputAppearanceProvider` | `languages/cinco-de-bio/src/appearanceProviders/InputAppearanceProvider.ts` | `AppearanceProvider` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Refreshes input port properties from prime references when they are available. | passed |
| `OutputAppearanceProvider` | `languages/cinco-de-bio/src/appearanceProviders/OutputAppearanceProvider.ts` | `AppearanceProvider` | `workspace/semantic-coverage.flow` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Returns output port views and logs appearance refreshes. | passed |
| `SIBDefAppearanceProvider` | `languages/cinco-de-bio/src/appearanceProviders/SIBDefAppearanceProvider.ts` | `AppearanceProvider` | `workspace/sib-library-example.sibs` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Returns SIB library service/task definition views. | passed |
| `ServiceAppearanceProvider` | `languages/cinco-de-bio/src/appearanceProviders/ServiceAppearanceProviders.ts` | `AppearanceProvider` | `workspace/sib-library-example.sibs` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Returns service definition views and logs service appearance refreshes. | passed |
| `SibLibLabelAppearanceProvider` | `languages/cinco-de-bio/src/appearanceProviders/SibLibLabelAppearanceProvider.ts` | `AppearanceProvider` | `workspace/sib-library-example.sibs` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Synchronizes SIB library label nodes with their owning service/task definition. | passed |
| `SibLibInputAppearanceProvider` | `languages/cinco-de-bio/src/appearanceProviders/SibLibInputAppearanceProvider.ts` | `AppearanceProvider` | `workspace/sib-library-example.sibs` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Returns SIB library input views and logs appearance refreshes. | passed |
| `SibLibOutputAppearanceProvider` | `languages/cinco-de-bio/src/appearanceProviders/SibLibOutputAppearanceProvider.ts` | `AppearanceProvider` | `workspace/sib-library-example.sibs` | `tests/test_cinco_de_bio_runtime_contracts.mjs` | `tests/editor_semantic_coverage.spec.mjs` | Returns SIB library output views using the correct `Output` model type. | passed |
| Helpers / protocol | `languages/cinco-de-bio/src/helper/*.ts`; `languages/cinco-de-bio/src/protocol/*.ts` | n/a | all examples | `tests/test_editor_semantics.mjs`; `tests/test_cinco_de_bio_runtime_contracts.mjs` | Playwright diagnostics/log attachments | Pure helpers cover hashing, signatures, branch rules, layout contracts, SIB cache/write contracts, and backend URL contracts. | passed |

## Playwright Artifact Targets

| Test | Video | Trace | Logs | Status |
| --- | --- | --- | --- | --- |
| `tests/editor_model.spec.mjs` | `artifacts/playwright/editor-model-reviewdemo.webm` | `artifacts/playwright/editor-model-reviewdemo-trace.zip` | attached diagnostics | passed |
| `tests/editor_refresh_sib_library.spec.mjs` | `artifacts/playwright/editor-refresh-sib-library.webm` | `artifacts/playwright/editor-refresh-sib-library-trace.zip` | editor and SIB-manager logs attached | passed |
| `tests/editor_tma_workflow_recording.spec.mjs` | `artifacts/playwright/editor-tma-workflow-step-by-step.webm` | `artifacts/playwright/editor-tma-workflow-trace.zip` | attached diagnostics | passed |
| `tests/editor_semantic_coverage.spec.mjs` | `artifacts/playwright/editor-semantic-coverage.webm` | `artifacts/playwright/editor-semantic-coverage-trace.zip` | editor/backend diagnostics attached | passed |

## Validation Run

| Command | Result |
| --- | --- |
| `npm run test:editor-semantics` | passed, 20/20 |
| `npm run test:editor-semantic-coverage -- --reporter=line` | passed, 1/1 |
| `npm run test:editor-model -- --reporter=line` | passed, 1/1 |
| `npm run test:editor-refresh-sib-library -- --reporter=line` | passed, 1/1 |
| `npm run test:editor-recording -- --reporter=line` | passed, 1/1 |

## Bugs Fixed During Coverage

- `SIBHook`, `ControlFlowHook`, `UpdateSIB`, `GenericSibHook`, and `InputAppearanceProvider` now tolerate missing graph state or missing prime references instead of throwing runtime `undefined` errors.
- The editor image applies `patches/theia-property-view-content-widget-guard.patch` to guard Theia's property view against selection events before the first content widget is attached.
- The editor startup now cleans `/editor/workspace`, copies the versioned workspace template, and then copies `languages/cinco-de-bio` into `/editor/workspace/languages`.
- Local `run.sh` now exposes `3003` and mounts `languages` as the language template, avoiding a bind mount directly inside the cleaned workspace.

## Notes

- The repository currently uses Node's built-in test runner (`node --test`) for JavaScript/TypeScript source tests. The new tests follow that existing runner to avoid adding a second test framework solely for naming.
- Runtime-bound Cinco classes depend on generated API modules and GLSP runtime services. Their behavior is covered by contract/source tests plus live Playwright editor execution.
