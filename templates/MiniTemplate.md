# Task Implementation Guide

## Task Context

**Current Task**: `{TASK_TITLE}` (ID: `{TASK_ID}`)
**Category**: {CATEGORY} | **Tags**: {TASK_TAGS}

> **How to fill out:**
> - **TASK_TITLE**: Clear, actionable name (e.g., "Add user authentication", "Fix memory leak ")
> - **TASK_ID**: Your tracking system ID (Jira, Linear, GitHub issue, or custom)
> - **CATEGORY**: One of: Feature, Bug, Refactor, Chore, Docs, Test, Performance
> - **TASK_TAGS**: Comma-separated keywords for searchability

### Description

{TASK_DESCRIPTION}

> **How to fill out:**
> Write 2-4 sentences explaining:
> - What needs to be done
> - Why it needs to be done (business/technical reason)
> - Any important constraints or considerations

### Dependencies

- **Requires**: {BLOCKING_DEPENDENCIES}
- **Enables**: {DEPENDENT_TASKS}

> **How to fill out:**
> - **Requires**: List tasks/features that MUST be complete before this one (or "None")
> - **Enables**: List tasks/features that are BLOCKED until this one completes (or "None")

---

## Feature Context & File Mapping

### Feature Path

**App/Package**: `{APP_OR_PACKAGE_PATH}`
**Feature Area**: `{FEATURE_AREA}`
**Route/Endpoint**: `{ROUTE_OR_ENDPOINT}`

> **How to fill out:**
> - **App/Package**: Root path to the app or package being modified (e.g., `apps/web`, `packages/api`, `src/`)
> - **Feature Area**: Logical grouping (e.g., `authentication`, `user-profile`, `data-sync`, `caching`)
> - **Route/Endpoint**: URL route or API endpoint if applicable, otherwise "N/A"

### Core Files to Modify

```
{LIST_FILES_BY_CATEGORY}
```

> **How to fill out:**
> Group files by their role. Example structure:
> ```
> Files to CREATE:
> ├── path/to/new-file.ts           # Brief description
> └── path/to/another-new-file.ts   # Brief description
>
> Files to MODIFY:
> ├── path/to/existing-file.ts      # What changes
> └── path/to/config.ts             # What changes
>
> Files to DELETE (if any):
> └── path/to/deprecated-file.ts    # Why removing
>
> Test Files:
> ├── path/to/unit.test.ts          # What's being tested
> └── path/to/integration.test.ts   # What's being tested
> ```

### Key Dependencies

- **Internal**: {INTERNAL_DEPENDENCIES}
- **External**: {EXTERNAL_DEPENDENCIES}

> **How to fill out:**
> - **Internal**: Other modules/packages in your codebase this task depends on
> - **External**: Third-party libraries, APIs, or services involved

---

## Implementation Plan

### Root Cause Analysis (for bugs/fixes)

**Issue**: {ROOT_CAUSE_DESCRIPTION}
**Impact**: {IMPACT_ASSESSMENT}
**Solution Approach**: {SOLUTION_STRATEGY}

> **How to fill out (skip for new features):**
> - **Issue**: What is actually broken and why (technical root cause)
> - **Impact**: Who/what is affected and how severely
> - **Solution Approach**: High-level strategy to fix (not the code, the approach)

### Implementation Steps

1. **{STEP_1_TITLE}** - `{STEP_1_FILES}`
2. **{STEP_2_TITLE}** - `{STEP_2_FILES}`
3. **{STEP_3_TITLE}** - `{STEP_3_FILES}`
4. **{STEP_4_TITLE}** - `{STEP_4_FILES}`

> **How to fill out:**
> List steps in execution order. Each step should be:
> - Independently testable (you can verify it works before moving on)
> - Small enough to complete in one sitting
> - Include the primary files touched
>
> Example:
> 1. **Install dependencies** - `package.json`
> 2. **Create data model** - `src/models/user.ts`
> 3. **Implement service layer** - `src/services/user-service.ts`
> 4. **Add API endpoint** - `src/routes/users.ts`
> 5. **Write tests** - `src/__tests__/user.test.ts`

### Key Code Changes

#### {CHANGE_SECTION_TITLE}

**File**: `{FILE_PATH}`

```
{CODE_SNIPPET_OR_PSEUDOCODE}
```

> **How to fill out:**
> For each significant change, document:
> - Which file
> - What the change looks like (code snippet, pseudocode, or before/after comparison)
>
> Use multiple sections if there are several distinct changes. Focus on the non-obvious parts - don't document trivial changes.

---

## Testing & Validation

### Test Files

- `{TEST_FILE_1}` - {TEST_PURPOSE_1}
- `{TEST_FILE_2}` - {TEST_PURPOSE_2}

> **How to fill out:**
> List test files to create or update, with a brief description of what each tests.

### Success Criteria

- [ ] {CRITERION_1}
- [ ] {CRITERION_2}
- [ ] {CRITERION_3}

> **How to fill out:**
> Define what "done" looks like. Each criterion should be:
> - Objectively verifiable (yes/no, not subjective)
> - Specific enough that anyone can check it
> - Cover both functionality AND quality (tests pass, no regressions, etc.)
>
> Example:
> - [ ] Users can log in with email/password
> - [ ] Invalid credentials show error message
> - [ ] Session persists across page refresh
> - [ ] All tests pass
> - [ ] No TypeScript errors

---

## Quick Commands

```bash
# Development
{DEV_COMMAND}                    # Start development environment

# Testing
{TEST_COMMAND}                   # Run tests
{LINT_COMMAND}                   # Check code quality

# Build
{BUILD_COMMAND}                  # Production build
```

> **How to fill out:**
> List the commands someone would need to:
> 1. Run the development environment
> 2. Run tests for the affected code
> 3. Verify the build works
>
> Include any task-specific commands (database migrations, code generation, etc.)

### Commit Template

```
{TYPE}({SCOPE}): {DESCRIPTION}

- {CHANGE_1}
- {CHANGE_2}

{OPTIONAL_FOOTER}
```

> **How to fill out:**
> - **TYPE**: feat, fix, refactor, chore, docs, test, perf, style
> - **SCOPE**: Feature area or component name
> - **DESCRIPTION**: Imperative mood, lowercase, no period (e.g., "add user login")
> - **CHANGE_1, CHANGE_2**: Bullet points of what changed
> - **OPTIONAL_FOOTER**: Breaking changes, issue references, co-authors

---

## Context Notes

{RELEVANT_CONTEXT}

> **How to fill out:**
> Include any information that would help someone unfamiliar with the codebase:
> - Architecture decisions relevant to this task
> - Gotchas or things that aren't obvious
> - Related documentation or previous discussions
> - Constraints (performance requirements, backwards compatibility, etc.)
> - Links to relevant docs, PRs, or issues
