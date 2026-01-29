# Implementation Protocol

**Purpose**: Step-by-step verification process before implementing changes.

---

## Core Principle

```
Verify BEFORE implementing.
Type definitions are truth.
Search for dependencies BEFORE removing code.
```

---

## Phase 1: Pre-Implementation Verification

### Step 1: Verify APIs Being Used/Removed

```bash
# For each API you plan to use:
/check-export {API_NAME}

# Or manually:
grep "export.*{API_NAME}" node_modules/@nostr-dev-kit/mobile/dist/typescript/index.d.ts
```

**Questions to answer:**
- Does the API exist in type definitions?
- What is its exact signature?
- Is it mobile-compatible?

### Step 2: Search for Dependencies

```bash
# Search for usages of code being removed:
grep -r "{FUNCTION_NAME}" --include="*.ts" --include="*.tsx" | grep -v node_modules

# Search for imports of the file being modified:
grep -r "from.*{FILENAME}" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**Questions to answer:**
- Is this code used elsewhere?
- Will removing it break other files?
- Are there tests that depend on it?

### Step 3: Check for Exports

```bash
# If removing a function, check if it's exported:
grep "export.*{FUNCTION_NAME}" {FILE_PATH}
```

**Questions to answer:**
- Is this function/variable exported?
- If exported, who imports it?

---

## Phase 2: Document Current State

### Step 4: Baseline TypeScript Check

```bash
npx tsc --noEmit 2>&1 | tail -20
```

**Record:**
- Number of errors before change
- Any errors in the file being modified

### Step 5: Read File, Confirm Line Numbers

```bash
# Read the file to verify line numbers haven't changed
Read {FILE_PATH}
```

**Verify:**
- Line numbers match your analysis
- Code hasn't been modified since analysis

---

## Phase 3: Implementation

### Step 6: Make Changes (in order)

**Order matters:**
1. Remove usages first
2. Remove definitions second
3. Remove imports last

**Example for removing dead code:**
```
1. Remove calls to the function
2. Remove the function definition
3. Remove unused imports
```

---

## Phase 4: Post-Implementation Verification

### Step 7: TypeScript Check

```bash
npx tsc --noEmit 2>&1 | tail -20
```

**Expected:** Same or fewer errors than baseline
**If more errors:** STOP - investigate before proceeding

### Step 8: Search for Orphaned References

```bash
# Search for any remaining references to removed code:
grep -r "{REMOVED_ITEM}" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**Expected:** No matches

### Step 9: Build/Run Verification

```bash
# Verify app still builds:
npm start
# or
npx expo start
```

---

## Checklist Template

Copy this for each implementation:

```markdown
## {TASK_NAME} - Implementation Checklist

### Pre-Implementation
- [ ] Verify APIs exist: /check-export {API}
- [ ] Search for dependencies: grep -r "{CODE}"
- [ ] Check if code is exported
- [ ] Baseline: npx tsc --noEmit (errors: ___)

### Implementation
- [ ] Read file, confirm line numbers
- [ ] Change 1: {DESCRIPTION}
- [ ] Change 2: {DESCRIPTION}
- [ ] Change 3: {DESCRIPTION}

### Post-Implementation
- [ ] TypeScript check (errors ≤ baseline)
- [ ] Search for orphaned references
- [ ] App builds successfully

### Sign-off
- Verified by: ___
- Date: ___
```

---

## Quick Commands Reference

| Task | Command |
|------|---------|
| Check API exists | `/check-export {name}` |
| Search for usages | `grep -r "{name}" --include="*.ts"` |
| TypeScript check | `npx tsc --noEmit` |
| Find imports | `grep -r "from.*{file}"` |
| Check exports | `grep "export.*{name}" {file}` |

---

## Common Traps

| Trap | Prevention |
|------|------------|
| Line numbers changed | Always re-read file before editing |
| Code used elsewhere | Search before removing |
| Exported function | Check for external imports |
| Trusted docs | Verify against type definitions |
| Skipped TypeScript check | Always run tsc before AND after |

---

## Example: Dead Code Removal

```markdown
## MenuScreen Dead Code - Implementation Checklist

### Pre-Implementation
- [x] Verify NDKPrivateKeySigner exists: /check-export NDKPrivateKeySigner
- [x] Search: grep -r "getSessionSigner" (no external usages)
- [x] Not exported (local function)
- [x] Baseline: npx tsc --noEmit (0 errors)

### Implementation
- [x] Read MenuScreen.tsx, lines 19-34 confirmed
- [x] Remove signer usage in handleSendNote (lines 110-113)
- [x] Delete getSessionSigner function (lines 19-34)
- [x] Remove NDKPrivateKeySigner from import

### Post-Implementation
- [x] TypeScript check: 0 errors (same as baseline)
- [x] grep "sessionSigner\|getSessionSigner" - no matches
- [x] App builds successfully
```
