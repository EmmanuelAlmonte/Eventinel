# Claude Code Prompt Templates

**Purpose**: Copy-paste templates for effective Claude Code sessions.

---

## Quick Reference (Copy These)

### Verification Triggers
```
Verify all imports exist in type definitions before implementing.
Use /check-export [name] to confirm the API exists.
Check against node_modules, not documentation.
This is mobile - web patterns don't work.
```

### Agent Triggers
```
Use library-api-verifier to check imports in [file]
Check the signature of [function] before using it
Find examples of [pattern] in the codebase
Validate this plan against actual NDK APIs
```

---

## Session Starters

### New Session (Full Context)
```markdown
Read CLAUDE.md for project context.

Platform: React Native + Expo (mobile)
NDK Package: @nostr-dev-kit/mobile ONLY

I want to: {WHAT_YOU_WANT}

Constraints:
- Verify all NDK imports exist using /check-export before implementing
- Only use @nostr-dev-kit/mobile (no ndk or ndk-react)
- Check ndk-mobile skill for correct patterns
```

### Quick Session
```markdown
Mobile app using @nostr-dev-kit/mobile.
Task: {TASK}
Verify imports exist before implementing.
```

---

## Task Templates

### Feature Implementation
```markdown
## Feature: {FEATURE_NAME}

**What**: {BRIEF_DESCRIPTION}
**Files involved**: {KEY_FILES}

### Constraints
- Only import from @nostr-dev-kit/mobile
- Verify each NDK import exists using /check-export
- Follow patterns in ndk-mobile skill
- This is mobile - no web patterns

### Before implementing
1. /check-export {API_NAME} for each NDK function
2. Find example in ndk-docs/mobile/
3. Check ndk-mobile skill anti-patterns
```

### Bug Fix
```markdown
## Bug: {BUG_TITLE}

**Symptom**: {WHAT_GOES_WRONG}
**Location**: {FILE_AND_LINE}

### Investigation
1. Use library-api-verifier to check current imports
2. Verify correct API signatures
3. Check for mobile/web pattern confusion

### Constraints
- Verify fix against type definitions before applying
- Don't trust documentation - check node_modules/*.d.ts
```

### Code Review / Cleanup
```markdown
## Cleanup: {FILE_OR_FEATURE}

### Context
- Platform: React Native mobile
- Package: @nostr-dev-kit/mobile only

### Proposed Changes
{DESCRIBE_CHANGES}

### Verification Done
- [ ] Checked affected APIs exist
- [ ] Searched for dependencies on removed code
- [ ] Baseline TypeScript errors recorded

### Success Criteria
- [ ] Dead code removed
- [ ] No new TypeScript errors
- [ ] No behavioral changes
```

### Quick Verification
```markdown
/check-export {FUNCTION_NAME}

If exists: show correct usage pattern
If not: what's the alternative?
```

---

## Quick Copy Section

**For features:**
```
Verify all imports exist using /check-export before implementing.
Only import from @nostr-dev-kit/mobile.
Check ndk-mobile skill for patterns.
This is mobile - no web patterns.
```

**For bugs:**
```
Use library-api-verifier to check if we're using correct APIs.
Verify against type definitions, not documentation.
```

**For cleanups:**
```
Search for dependencies before removing code.
Run tsc --noEmit before and after changes.
```
