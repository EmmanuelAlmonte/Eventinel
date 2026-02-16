---
title: Docs Maintenance Workflow
description: One-command pipeline for syncing docs to code changes.
---

Use this workflow to keep docs aligned with the current codebase using `git diff`
and recent commit churn.

## One-command pipeline

Run from the repository root:

```bash
npm run docs:impact
```

This executes `scripts/docs-impact.ps1`, which:

1. Compares `origin/main...HEAD` for changed files.
2. Merges in current working-tree changes (tracked, staged, and untracked).
3. Scans recent churn over the last 7 days.
4. Classifies changed files as stable, moderate, or unstable.
5. Maps changed areas to doc targets.
6. Defers unstable areas (for example active incident-subscription refactors).
7. Runs docs validation:
   - `npm run build` in `eventinel-mobile-docsite`
   - `npx tsc --noEmit` in `eventinel-mobile-docsite`
8. Writes outputs to `agent-outputs/docs-impact`.

## Optional arguments

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/docs-impact.ps1 -BaseRef origin/main -HeadRef HEAD -LookbackDays 14
```

Optional flags:

- `-SkipValidation` skips docs build and typecheck.
- `-CommittedOnly` limits analysis to `<BaseRef>...<HeadRef>` and ignores working-tree changes.
- `-DocsitePath` overrides the docs directory path.
- `-OutputDir` writes reports to a custom folder.

## Pipeline outputs

The pipeline creates:

- `agent-outputs/docs-impact/summary.md`
- `agent-outputs/docs-impact/diff-name-status.txt`
- `agent-outputs/docs-impact/diff-name-only.txt`
- `agent-outputs/docs-impact/log-name-only.txt`
- `agent-outputs/docs-impact/working-tree-tracked.txt`
- `agent-outputs/docs-impact/working-tree-staged.txt`
- `agent-outputs/docs-impact/working-tree-untracked.txt`
- `agent-outputs/docs-impact/docs-build.txt`
- `agent-outputs/docs-impact/docs-typecheck.txt`

Use `summary.md` as the source artifact when deciding what to document next.

## Prompt for docs sync task

```text
You are an autonomous docs-sync agent in this repo.

Goal:
Update documentation so it reflects the latest code changes accurately, using git diff/history as source of truth.

Scope:
- Only edit docs site files under: eventinel-mobile-docsite
- Do NOT edit application source files.
- Exclude unstable/refactor paths from feature docs:
  - hooks/useIncidentSubscription*
  - any files I explicitly mark as active refactor

Inputs:
- Base ref: origin/main
- Head ref: HEAD
- Lookback window: last 7 days

Required workflow:
1) Run git commands to collect delta and churn:
   - git diff --name-status origin/main...HEAD
   - git diff --name-only origin/main...HEAD
   - git log --since="7 days ago" --name-only --pretty=format:
2) Build a short impact map:
   - Changed area -> user-facing behavior change -> docs page(s) to update
3) Update only stable/moderately stable docs pages first.
4) If a changed area is unstable, add a note to stability-scope instead of full documentation.
5) Update docs/changelog with "as of <date> / <commit>".
6) Validate:
   - npm run build (docsite)
   - npx tsc --noEmit (docsite)
7) Return:
   - commands run + exit status
   - files changed
   - what was documented vs deferred
   - any open questions requiring product/engineering confirmation

Quality bar:
- No speculation. If behavior is unclear, mark as "needs confirmation".
- Keep docs aligned to actual code paths and screen names.
```

## Reusable prompt template

```text
You are an autonomous docs-sync agent in this repo.

Goal:
Synchronize docs with code changes between <BASE_REF> and <HEAD_REF>.

Constraints:
- Docs root: <DOCSITE_PATH>
- Editable paths: <DOC_PATHS>
- Non-editable paths: <NON_DOC_PATHS>
- Exclude unstable areas: <UNSTABLE_GLOBS>
- Stability lookback: <LOOKBACK_DAYS> days

Context:
- Product/app name: <APP_NAME>
- Priority doc sections: <PRIORITY_SECTIONS>
- Optional defer sections: <DEFER_SECTIONS>

Workflow:
1) Gather change data:
   - git diff --name-status <BASE_REF>...<HEAD_REF>
   - git diff --name-only <BASE_REF>...<HEAD_REF>
   - git log --since="<LOOKBACK_DAYS> days ago" --name-only --pretty=format:
2) Compute doc impact map:
   - file/area -> behavior impact -> target doc page
   - classify each as Stable / Moderate / Unstable
3) Apply doc updates:
   - Update impacted existing pages
   - Create missing pages only for Stable/Moderate areas
   - For Unstable, add a deferred note in <STABILITY_DOC_PAGE>
4) Add/update changelog:
   - include "As of <DATE>, commit <SHORT_SHA>"
5) Validate:
   - <BUILD_COMMAND>
   - <TYPECHECK_COMMAND>
6) Output:
   - exact commands + exit codes
   - changed docs files
   - deferred items + reason
   - open questions

Definition of done:
- Docs build passes
- Typecheck passes
- No claims unsupported by current code
- Deferred unstable areas explicitly documented
```
