---
title: tsconfig.review.json
description: Review-focused TypeScript project config and when to use it.
---

As of `2026-02-16`, `tsconfig.review.json` is a review-oriented TypeScript
config that narrows analysis scope.

## File location

- `tsconfig.review.json` at repository root.

## Purpose

- Focus type review on application source trees:
  - `components/**`
  - `contexts/**`
  - `hooks/**`
  - `lib/**`
  - `screens/**`
  - `App.tsx`
  - `index.ts`
- Exclude generated/build/docs paths and docsite code during focused review.

## When to use

- During code review or refactor validation where docs/build artifacts create noise.
- When you want quicker type-check iterations focused on app runtime code.

## Example command

```bash
npx tsc --project tsconfig.review.json --noEmit
```

## Notes

- This does not replace the main project type-check expectations.
- Use repository-standard checks in CI or before release.
