# CincoDeBio Example Workspace

This workspace is copied into `/editor/workspace` when the CincoDeBio editor container starts.

## Models

- `example.flow`: small two-step workflow used by smoke and refresh tests.
- `semantic-coverage.flow`: focused model covering hooks, validation, appearance providers, context menus, and generator surfaces.
- `review-tma-workflow.flow`: realistic TMA workflow used by the step-by-step Playwright recording.
- `sib-library-example.sibs`: local SIB library model for semantic and SIB-definition examples.

The startup script refreshes this workspace before copying the language definitions into `languages/`.
