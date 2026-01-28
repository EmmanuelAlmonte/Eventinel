# Residual Risks & Gaps Register

Purpose: Track known non-blocking risks, technical gaps, or temporary shims that need revisiting.

## Open Items

1) **NIP-11 relay metadata omitted**
   - **File**: `lib/relay/status.ts:109-118`
   - **Risk**: `name/description/supportedNips` are not populated; any UI expecting these will show empty values.
   - **Reason**: Stable NDK 0.8.x does not expose `relay.info`.
   - **Follow-up**: Re-enable after NDK upgrade that exposes NIP-11 relay info.

2) **Local Icon typings shim**
   - **File**: `types/react-native-vector-icons/Icon.d.ts:1-27`
   - **Risk**: Shim may drift from upstream `react-native-vector-icons` / `@rneui/base` typings.
   - **Reason**: Added locally to fix missing IconProps typing.
   - **Follow-up**: Re-validate or remove after upgrading related packages.

## Add New Items

When adding a new item, include:
- File path and line (if available)
- Risk summary
- Why it exists
- What triggers re-evaluation
