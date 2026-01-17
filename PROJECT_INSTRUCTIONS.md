# Project Instructions - Eventinel Mobile

**For use with:** Claude.ai (Web/Chat Interface)  
**Last Updated:** 2025-01-16

> ⚠️ This file is optimized for Claude.ai chat sessions. For Claude Code (CLI), use CLAUDE.md instead.

---

## Section 1: Platform Identity

### What This Project IS

**Eventinel Mobile** is a React Native/Expo mobile app for Nostr-native public safety monitoring.

| Attribute | Value |
|-----------|-------|
| **Platform** | 📱 iOS & Android (NOT web) |
| **Framework** | React Native 0.79.6 + Expo 53 |
| **Language** | TypeScript (strict mode) |
| **JS Engine** | Hermes + New Architecture |
| **Navigation** | React Navigation (Bottom Tabs) |
| **UI Library** | React Native Elements (@rneui/themed) |
| **Nostr SDK** | @nostr-dev-kit/mobile (v0.9.3-beta.70) |
| **State** | Zustand |
| **Database** | expo-sqlite |

### What This Project is NOT

- ❌ **Not a web app** - No browser APIs (window, localStorage, document)
- ❌ **Not using @nostr-dev-kit/react** - That's web-only
- ❌ **Not using @nostr-dev-kit/ndk directly** - Causes version conflicts
- ❌ **Not Next.js/Remix/Vite** - Pure React Native

---

## Section 2: Critical Rules (Non-Negotiable)

### 🔴 Rule #1: Single Package Rule

```typescript
// ✅ ALWAYS - ndk-mobile re-exports everything
import { useNDK, NDKEvent, NDKNip55Signer } from '@nostr-dev-kit/mobile';

// ❌ NEVER - causes version conflicts
import { NDKEvent } from '@nostr-dev-kit/ndk';

// ❌ NEVER - web-only, doesn't exist in React Native
import { useNDK } from '@nostr-dev-kit/react';
```

### 🔴 Rule #2: Mobile-Only Patterns

| ✅ DO Use | ❌ DON'T Use | Why |
|-----------|-------------|-----|
| `useSessionMonitor()` | `<NDKHeadless>` | NDKHeadless is web-only |
| `NDKNip55Signer` | `NDKNip07Signer` | NIP-07 is browser extension |
| `NDKSessionExpoSecureStore` | `NDKSessionLocalStorage` | localStorage doesn't exist |
| `NDKCacheAdapterSqlite` | localStorage cache | Same reason |
| `login(signer, true)` | `login(signer, { profile: true })` | Second param is boolean, NOT object |

### 🔴 Rule #3: Import Order in App.tsx

```typescript
// App.tsx - FIRST LINE (REQUIRED)
import 'react-native-get-random-values'; // Polyfills crypto for NDK

// Then other imports...
import { NDKProvider } from '@nostr-dev-kit/mobile';
```

### 🔴 Rule #4: Cache Adapter Initialization

```typescript
// ✅ CORRECT - initialize() is REQUIRED
const cacheAdapter = new NDKCacheAdapterSqlite('eventinel.db');
await cacheAdapter.initialize();

// ❌ WRONG - crashes without initialize()
const ndk = new NDK({ cacheAdapter: new NDKCacheAdapterSqlite('app') });
```

### 🔴 Rule #5: Universal NDK Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| Timestamps | `Math.floor(Date.now() / 1000)` (seconds) | `Date.now()` (milliseconds) |
| Filter pubkeys | Hex: `a1b2c3d4...` | Bech32: `npub1...` |
| NDK instance | Module-level singleton | `new NDK()` inside component |

---

## Section 3: Project Structure

```
Eventinel-mobile/
├── App.tsx                      # Root component, NDK initialization
├── index.ts                     # Expo entry point
│
├── screens/                     # Screen components
│   ├── HomeScreen.tsx
│   ├── MapScreen.tsx            # Mapbox + incident display
│   ├── ProfileScreen.tsx
│   └── ...
│
├── lib/
│   ├── nostr/                   # Nostr integration (@eventinel/nostr)
│   │   ├── client.ts            # NDK singleton
│   │   ├── config.ts            # Relays, kinds, tags
│   │   └── events/              # Event creation/parsing
│   │       ├── incident.ts      # kind:30911 incidents
│   │       └── types.ts         # ParsedIncident, etc.
│   │
│   ├── theme/                   # UI theming
│   │   └── index.ts             # useAppTheme(), colors
│   │
│   └── brand/                   # Design tokens (@eventinel/brand)
│       ├── colors.ts
│       └── typography.ts
│
├── components/                  # Reusable components
├── hooks/                       # Custom hooks
├── types/                       # TypeScript types
│
├── .claude/                     # Claude Code configuration
│   ├── skills/                  # Skill definitions
│   ├── agents/                  # Agent definitions
│   ├── commands/                # Custom commands
│   └── tasks/                   # Task files
│
└── templates/                   # Protocol templates
    └── DeveloperProtocol.md     # Implementation workflow
```

---

## Section 4: Key Patterns

### NDK Subscription Pattern

```typescript
import { useSubscribe } from '@nostr-dev-kit/mobile';
import type { NDKFilter } from '@nostr-dev-kit/mobile';

const filter = useMemo((): NDKFilter[] | false => {
  if (!ready) return false;
  return [{
    kinds: [30911 as number],
    '#t': ['incident'],
    since: Math.floor(Date.now() / 1000) - 7 * 86400,
    limit: 100,
  }];
}, [ready]);

const { events, eose } = useSubscribe(filter, {
  closeOnEose: false,
  bufferMs: 100,
});
```

### RNE Component Pattern

```typescript
// ✅ CORRECT - import directly from @rneui/themed
import { Text, Card, ListItem, Badge, Icon } from '@rneui/themed';
import { useAppTheme } from '../lib/theme';

function MyComponent() {
  const { colors } = useAppTheme();
  
  return (
    <Card containerStyle={{ backgroundColor: colors.surface }}>
      <Card.Title style={{ color: colors.text }}>Title</Card.Title>
      <ListItem>
        <Icon name="check" color={colors.primary} />
        <ListItem.Content>
          <ListItem.Title>Item</ListItem.Title>
        </ListItem.Content>
      </ListItem>
    </Card>
  );
}
```

### Event Publishing Pattern

```typescript
import { NDKEvent } from '@nostr-dev-kit/mobile';
import { ndk } from '../lib/ndk';

const publishEvent = async () => {
  const event = new NDKEvent(ndk);
  event.kind = 30911;
  event.content = JSON.stringify(incidentContent);
  event.tags = [
    ['d', incidentId],
    ['t', 'incident'],
    ['g', geohash],
    ['l', `${lat},${lng}`],
    ['type', incidentType],
    ['severity', severity.toString()],
  ];

  await event.sign();
  const relaySet = await event.publish();
};
```

### Screen Container Pattern

```typescript
import { ScreenContainer } from '../lib/ui';

export function MyScreen() {
  return (
    <ScreenContainer>
      {/* Screen content */}
    </ScreenContainer>
  );
}
```

---

## Section 5: Incident Events (kind:30911)

### Event Structure

```typescript
{
  kind: 30911,  // Parameterized replaceable event
  content: JSON.stringify({
    title: "Fire at Main St",
    description: "Large fire...",
    type: "fire",
    severity: 4,
    location: {
      lat: 40.0345,
      lng: -75.0433,
      address: "123 Main St, Philadelphia, PA"
    },
    occurredAt: 1705380000,
    source: "community"
  }),
  tags: [
    ['d', 'unique-incident-id'],   // Replaceable ID
    ['t', 'incident'],              // Type tag
    ['g', 'dr4eu'],                 // Geohash (NIP-52)
    ['l', '40.0345,-75.0433'],      // Precise location
    ['type', 'fire'],               // Incident type
    ['severity', '4'],              // 1-5 scale
    ['source', 'community']         // Data source
  ]
}
```

### ParsedIncident Type

```typescript
interface ParsedIncident {
  incidentId: string;
  title: string;
  description: string;
  type: string;
  severity: number;        // 1-5
  source: string;
  occurredAt: Date;
  location: {
    lat: number;
    lng: number;
    address: string;
    geohash: string;
  };
  rawEvent: NDKEvent;
}
```

---

## Section 6: Anti-Pattern Quick Reference

| ❌ Wrong | ✅ Correct | Why |
|----------|-----------|-----|
| `import {...} from '@nostr-dev-kit/ndk'` | `import {...} from '@nostr-dev-kit/mobile'` | Version conflicts |
| `import {...} from '@nostr-dev-kit/react'` | `import {...} from '@nostr-dev-kit/mobile'` | Web-only package |
| `<NDKHeadless>` | `useSessionMonitor()` | NDKHeadless doesn't exist in mobile |
| `NDKNip07Signer` | `NDKNip55Signer` | NIP-07 is browser extension |
| `window.nostr` | NIP-55 device signing | No window in React Native |
| `login(signer, { profile: true })` | `login(signer, true)` | Second param is boolean |
| `new NDK()` inside component | Module-level singleton | Creates new instance per render |
| `Date.now()` for event timestamps | `Math.floor(Date.now() / 1000)` | Nostr uses seconds |
| `{ authors: ['npub1...'] }` | `{ authors: ['hex...'] }` | Filters need hex pubkeys |
| `import { Card } from '../lib/ui'` | `import { Card } from '@rneui/themed'` | Use RNE directly |

---

## Section 7: Development Commands

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# TypeScript check
npx tsc --noEmit

# Run tests
npm test
```

---

## Section 8: Working with Claude.ai

When working with me (Claude.ai), I can:

### ✅ I CAN Do
- Read and analyze files in your codebase
- Generate code following your patterns
- Create new files and write them to your project
- Provide implementation guidance based on your skills
- Review code for anti-patterns
- Search through your codebase for patterns

### ❌ I CANNOT Do
- Run bash commands in your project
- Execute /check-export or custom commands
- Invoke subagents (library-api-verifier, etc.)
- Run tests or build the app
- Access external URLs or your ndk-docs folder (unless you upload files)

### Best Practices for Our Sessions

1. **Share relevant files** - Upload or paste key files I should reference
2. **Specify patterns** - Tell me which existing file to use as a pattern
3. **Ask for verification** - I'll check my output against anti-patterns
4. **Request file creation** - I can write files directly to your project

---

## Section 9: Key File Locations

| Purpose | Location |
|---------|----------|
| NDK configuration | `lib/nostr/client.ts` |
| Event kinds & config | `lib/nostr/config.ts` |
| Incident parsing | `lib/nostr/events/incident.ts` |
| Theme & colors | `lib/theme/index.ts` |
| Brand tokens | `lib/brand/colors.ts` |
| NDK skill (Claude Code) | `.claude/skills/ndk-mobile/SKILL.md` |
| Developer protocol | `templates/DeveloperProtocol.md` |
| Quick reference | `.claude/NDK_QUICK_REFERENCE.md` |
| Task handoffs | `LLM-HANDOFF.md` |

---

## Section 10: Before Implementing Any Feature

### Self-Check Checklist

- [ ] All NDK imports from `@nostr-dev-kit/mobile`
- [ ] No web-only patterns (NDKHeadless, NIP-07, localStorage)
- [ ] RNE components imported from `@rneui/themed` directly
- [ ] Using `useAppTheme()` for colors (dark mode support)
- [ ] Timestamps in seconds: `Math.floor(Date.now() / 1000)`
- [ ] Filter pubkeys in hex, not bech32
- [ ] Cache adapter initialized before use
- [ ] NDK instance at module level (not in component)
- [ ] login() uses boolean, not options object

---

*This document provides context for Claude.ai sessions. For Claude Code (CLI), refer to CLAUDE.md*
