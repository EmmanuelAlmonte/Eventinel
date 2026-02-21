# Blossom Reference Guide

This guide is the canonical reference map for Blossom-related work in Eventinel Mobile.

Use this file to:
- Find official Blossom specs quickly
- Align implementation decisions to current protocol language
- Keep PRs and task notes tied to stable references

## Source of Truth Order

When specs conflict, use this order:
1. NIP-B7 in `nostr-protocol/nips`
2. BUD docs in `hzrd149/blossom`
3. Local code constraints in this repo (`lib/media`, `lib/nostr`, `docs/PROJECT_SUMMARY.md`)

## Canonical Links

Primary protocol docs:
- NIP-B7 (Blossom media): https://github.com/nostr-protocol/nips/blob/master/B7.md
- NIP-96 (deprecated): https://github.com/nostr-protocol/nips/blob/master/96.md
- Blossom repo (BUD index root): https://github.com/hzrd149/blossom

Core BUD references:
- BUD-00 (common language): https://github.com/hzrd149/blossom/blob/master/buds/00.md
- BUD-01 (blob retrieval): https://github.com/hzrd149/blossom/blob/master/buds/01.md
- BUD-02 (upload + management): https://github.com/hzrd149/blossom/blob/master/buds/02.md
- BUD-03 (user server list, `kind:10063`): https://github.com/hzrd149/blossom/blob/master/buds/03.md
- BUD-04 (mirroring): https://github.com/hzrd149/blossom/blob/master/buds/04.md
- BUD-05 (media optimization): https://github.com/hzrd149/blossom/blob/master/buds/05.md
- BUD-06 (upload capabilities): https://github.com/hzrd149/blossom/blob/master/buds/06.md

## NDK/Kind Mapping (Current Code Context)

Relevant NDK kind constants and wrappers:
- `BlossomList` (`kind:10063`) is available in NDK wrapper types
- `BlossomUpload` (`kind:24242`) exists in NDK kinds enum

Local references:
- `node_modules/@nostr-dev-kit/ndk/src/events/kinds/index.ts`
- `node_modules/@nostr-dev-kit/ndk/src/events/kinds/blossom-list.ts`

## Eventinel Mobile Implementation Notes

Current media pipeline in this repo:
- Pick media: `lib/media/pickMedia.ts`
- Upload (NIP-96 style helper): `lib/media/nip96.ts`

Blossom expansion should be planned as:
1. Server discovery/config using `kind:10063` semantics
2. Upload path aligned to BUD-02 (+ optional BUD-06 capability checks)
3. Optional mirroring via BUD-04
4. Optional media optimization via BUD-05

## PR/Task Reference Rule

For any Blossom-related PR or MCP task:
- Include at least one direct link to NIP-B7
- Include specific BUD link(s) used for endpoint/auth behavior
- Note any intentional deviation from spec text with justification

## Quick Checklist For New Blossom Work

- Confirm target endpoint and method in BUD docs
- Confirm auth expectations (`kind:24242`, `t`, `x`, `expiration` tags when applicable)
- Confirm hash/addressing assumptions (sha256 path semantics)
- Confirm fallback behavior when a server/capability is missing
- Add/adjust tests and manual mobile checks
