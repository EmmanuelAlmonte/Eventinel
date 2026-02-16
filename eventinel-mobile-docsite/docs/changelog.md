---
title: Changelog
description: Release notes and documentation changes for Eventinel Mobile docs.
---

This changelog follows semantic versioning.

## [Unreleased]

### Added

- Eventinel Mobile branding and project-focused content.
- Installation, quickstart, commands, configuration, and troubleshooting guides.
- Docs maintenance workflow and one-command impact pipeline (`npm run docs:impact`).
- New architecture docs for Incident Detail modules, map overlays/viewport subscription, and incident subscription API surface.
- Deferred tracker for incident subscription refactor scope.
- Development note for `tsconfig.review.json`.

### Updated

- Incident Feed guide updated for modular `screens/incidentFeed/*` flow.
- Push Notifications guide updated for bridge dedupe and runtime notification handling.
- Login And Authentication guide updated for current split login method flows.
- Docs impact pipeline now includes working-tree changes by default (not only commit-range diffs).
- Incident Detail, Map Screen, and Stability Scope docs updated for current module split and deferred boundaries.

## [0.1.0] - 2026-02-16

### Added

- Initial documentation baseline from Docusaurus scaffold.
