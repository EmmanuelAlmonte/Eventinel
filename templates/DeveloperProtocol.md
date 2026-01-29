# Developer Implementation Protocol

**Purpose**: Complete workflow for implementing features, fixes, and enhancements.
**Audience**: Developers and LLMs working on this codebase.

---

## Quick Start

1. **Classify** your task (Feature / Fix / Enhancement)
2. **Research** before coding
3. **Verify** APIs exist
4. **Plan** the approach
5. **Implement** with verification
6. **Validate** the result

---

## Phase 1: Task Classification

### Identify Task Type

| Type | Description | Example |
|------|-------------|---------|
| **Feature** | New functionality | "Add NIP-55 device signing" |
| **Fix** | Something broken | "Session not persisting" |
| **Enhancement** | Improve existing | "Refactor auth flow" |
| **Cleanup** | Remove dead code | "Remove unused imports" |

### Fill Out Task Header

```markdown
## Task: {TITLE}

**Type**: Feature / Fix / Enhancement / Cleanup
**Risk**: Low / Medium / High
**Files**: {PRIMARY_FILES}
**APIs**: {NDK_APIS_INVOLVED}
```

---

## Phase 2: Research (Before Any Code)

### Step 2.1: Understand the Domain

```markdown
### Questions to Answer
- [ ] What is this feature/fix supposed to do?
- [ ] What existing code is related?
- [ ] What NDK APIs are involved?
- [ ] Are there examples in the codebase?
```

### Step 2.2: Find Existing Patterns

```bash
# Search for similar patterns in codebase
grep -r "{PATTERN}" --include="*.ts" --include="*.tsx" | grep -v node_modules

# Search NDK docs
grep -r "{PATTERN}" ndk-docs/mobile/
```

### Step 2.3: Read Related Files

```markdown
### Files to Read
- [ ] {FILE_1} - Why: {REASON}
- [ ] {FILE_2} - Why: {REASON}
- [ ] ndk-docs/mobile/docs/{TOPIC}.md - Reference
```

---

## Phase 3: API Verification

### Step 3.1: List APIs You Plan to Use

```markdown
### APIs Required
| API | Package | Verified |
|-----|---------|----------|
| {API_1} | @nostr-dev-kit/mobile | [ ] |
| {API_2} | @nostr-dev-kit/mobile | [ ] |
```

### Step 3.2: Verify Each API Exists

```bash
# For each API:
/check-export {API_NAME}

# Or manually:
grep "export.*{API_NAME}" node_modules/@nostr-dev-kit/mobile/dist/typescript/index.d.ts
```

### Step 3.3: Check Signatures

```bash
# Get exact signature
grep -A 10 "export.*{API_NAME}" node_modules/@nostr-dev-kit/react/dist/index.d.ts
```

### Step 3.4: Mobile Compatibility Check

```markdown
### Mobile Compatibility
- [ ] All imports from `@nostr-dev-kit/mobile` (not ndk or react)
- [ ] No web-only patterns (NDKHeadless, NIP-07, localStorage)
- [ ] No browser APIs (window.nostr)
```

---

## Phase 4: Planning

### Step 4.1: Define the Approach

```markdown
### Approach
**Strategy**: {HIGH_LEVEL_APPROACH}

**Why this approach**:
- {REASON_1}
- {REASON_2}

**Alternatives considered**:
- {ALT_1}: Why not - {REASON}
```

### Step 4.2: List Changes

```markdown
### Changes Required

**Files to CREATE:**
- [ ] {path/to/new-file.ts} - {PURPOSE}

**Files to MODIFY:**
- [ ] {path/to/existing.ts} - {WHAT_CHANGES}

**Files to DELETE:**
- [ ] {path/to/old-file.ts} - {WHY_REMOVING}
```

### Step 4.3: Define Success Criteria

```markdown
### Success Criteria
- [ ] {CRITERION_1} (testable)
- [ ] {CRITERION_2} (testable)
- [ ] TypeScript compiles without new errors
- [ ] App builds and runs
```

---

## Phase 5: Pre-Implementation Checks

### Step 5.1: Search for Dependencies

```bash
# If modifying existing code:
grep -r "{FUNCTION_NAME}" --include="*.ts" --include="*.tsx" | grep -v node_modules

# If removing code:
grep -r "{CODE_BEING_REMOVED}" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

### Step 5.2: Baseline State

```bash
# Record current TypeScript state
npx tsc --noEmit 2>&1 | tail -5
# Errors before: ___

# Record current test state (if applicable)
npm test 2>&1 | tail -5
```

### Step 5.3: Read Files to Modify

```markdown
### Pre-Read Checklist
- [ ] Read {FILE_1} - Confirmed line numbers
- [ ] Read {FILE_2} - Understood structure
- [ ] No recent changes that affect plan
```

---

## Phase 6: Implementation

### Step 6.1: Order of Changes

```markdown
### Implementation Order
1. {FIRST_CHANGE} - File: {FILE}
2. {SECOND_CHANGE} - File: {FILE}
3. {THIRD_CHANGE} - File: {FILE}

**Why this order**: {REASON}
```

### Step 6.2: Make Changes

For each change:
```markdown
- [ ] **Change {N}**: {DESCRIPTION}
  - File: {FILE_PATH}
  - Action: Create / Modify / Delete
  - Lines: {LINE_NUMBERS}
  - Verified after: [ ]
```

### Step 6.3: Incremental Verification

After each significant change:
```bash
# TypeScript check
npx tsc --noEmit

# If errors increased: STOP and investigate
```

---

## Phase 7: Post-Implementation Validation

### Step 7.1: TypeScript Verification

```bash
npx tsc --noEmit 2>&1 | tail -5
# Errors after: ___
# Expected: Same or fewer than baseline
```

### Step 7.2: Search for Orphaned References

```bash
# If removed code:
grep -r "{REMOVED_ITEM}" --include="*.ts" --include="*.tsx" | grep -v node_modules
# Expected: No matches
```

### Step 7.3: Build Verification

```bash
npm start
# or
npx expo start
```

### Step 7.4: Functional Testing

```markdown
### Manual Test Checklist
- [ ] {TEST_CASE_1}
- [ ] {TEST_CASE_2}
- [ ] No regressions in related features
```

---

## Phase 8: Documentation

### Step 8.1: Update CHANGELOG (if applicable)

```markdown
## [Unreleased]

### Added/Changed/Fixed/Removed
- {DESCRIPTION_OF_CHANGE}
```

### Step 8.2: Update Relevant Docs

```markdown
### Docs to Update
- [ ] CLAUDE.md (if patterns changed)
- [ ] README.md (if user-facing)
- [ ] Code comments (if complex logic)
```

---

## Task Type Specific Guides

### For Features

```markdown
## Feature Implementation Checklist

### Research
- [ ] Understand requirements
- [ ] Find similar features in codebase
- [ ] Identify NDK APIs needed
- [ ] Verify APIs exist

### Plan
- [ ] Define approach
- [ ] List files to create/modify
- [ ] Define success criteria

### Implement
- [ ] Create new files
- [ ] Add imports
- [ ] Implement logic
- [ ] Add error handling

### Validate
- [ ] TypeScript passes
- [ ] Feature works as expected
- [ ] No regressions
```

### For Fixes

```markdown
## Bug Fix Checklist

### Investigate
- [ ] Reproduce the bug
- [ ] Identify root cause
- [ ] Check if API usage is correct
- [ ] Verify against type definitions

### Plan
- [ ] Define fix approach
- [ ] Identify affected files
- [ ] Consider side effects

### Implement
- [ ] Apply fix
- [ ] Verify TypeScript passes

### Validate
- [ ] Bug is fixed
- [ ] No new bugs introduced
- [ ] Related features still work
```

### For Cleanup/Refactoring

```markdown
## Cleanup Checklist

### Verify Safe to Remove
- [ ] Code is actually dead/unused
- [ ] No external dependencies
- [ ] Not exported for external use

### Pre-Implementation
- [ ] Search for all usages
- [ ] Baseline TypeScript errors
- [ ] Read files to confirm line numbers

### Implement
- [ ] Remove usages first
- [ ] Remove definitions second
- [ ] Remove imports last

### Validate
- [ ] No orphaned references
- [ ] TypeScript passes
- [ ] App builds
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Check API exists | `/check-export {name}` |
| Search codebase | `grep -r "{pattern}" --include="*.ts"` |
| TypeScript check | `npx tsc --noEmit` |
| Find usages | `grep -r "{name}" --include="*.tsx"` |
| Read NDK docs | `cat ndk-docs/mobile/docs/{topic}.md` |
| Check signature | `grep -A 10 "export.*{name}" node_modules/...` |

---

## Anti-Pattern Reminders

Before implementing, verify you're NOT doing:

| Anti-Pattern | Check |
|--------------|-------|
| Wrong package | All imports from `@nostr-dev-kit/mobile` |
| Web patterns | No NDKHeadless, NIP-07, localStorage |
| Trusting docs | Verified against type definitions |
| Wrong signature | `login(signer, boolean)` not options |
| No verification | Ran `/check-export` for new APIs |

---

## Template: Complete Task File

```markdown
# Task: {TITLE}

**Type**: {TYPE}
**Risk**: {RISK}
**Files**: {FILES}

---

## Research
- [ ] Understood requirements
- [ ] Found related code
- [ ] Identified APIs: {LIST}

## Verification
- [ ] APIs verified: /check-export {API}
- [ ] Mobile compatible: Yes/No
- [ ] Signatures checked

## Plan
**Approach**: {APPROACH}

**Changes**:
1. {CHANGE_1}
2. {CHANGE_2}

**Success Criteria**:
- [ ] {CRITERION_1}
- [ ] {CRITERION_2}

## Pre-Implementation
- [ ] Dependencies searched
- [ ] Baseline errors: ___
- [ ] Files read and confirmed

## Implementation
- [ ] Change 1: {DESCRIPTION}
- [ ] Change 2: {DESCRIPTION}
- [ ] Incremental TypeScript checks

## Validation
- [ ] TypeScript: ___ errors (≤ baseline)
- [ ] Orphaned refs: None
- [ ] Build: Passes
- [ ] Tests: Pass

## Documentation
- [ ] CHANGELOG updated
- [ ] Docs updated (if needed)
```

---

*This protocol applies to all implementation work in this codebase.*
*For NDK-specific validation, see `.claude/skills/ndk-mobile/SKILL.md`*
