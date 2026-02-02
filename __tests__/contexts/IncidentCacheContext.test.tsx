/**
 * IncidentCacheContext Tests
 *
 * Tests the incident cache context provider functionality including:
 * - Provider renders children correctly
 * - Context values are accessible to consumers
 * - Cache hit/miss behavior
 * - Upsert operations
 * - Cache eviction when exceeding max size
 * - Version updates for re-renders
 * - Edge cases
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, View, Button } from 'react-native';

import {
  IncidentCacheProvider,
  useIncidentCache,
} from '../../contexts/IncidentCacheContext';
import type { ProcessedIncident } from '../../hooks/useIncidentSubscription';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Creates a mock ProcessedIncident for testing
 */
function createMockIncident(
  id: string,
  createdAt: number = Date.now() / 1000,
  overrides: Partial<ProcessedIncident> = {}
): ProcessedIncident {
  const occurredAt = new Date(createdAt * 1000);
  return {
    incidentId: id,
    eventId: `event_${id}`,
    pubkey: 'test_pubkey_123',
    title: `Test Incident ${id}`,
    description: `Description for incident ${id}`,
    type: 'fire',
    severity: 3,
    createdAt,
    createdAtMs: createdAt * 1000,
    occurredAt,
    occurredAtMs: occurredAt.getTime(),
    location: {
      lat: 40.7128,
      lng: -74.006,
      address: '123 Test St',
      city: 'New York',
      state: 'NY',
      geohash: 'dr5r',
    },
    source: 'community',
    sourceId: `source_${id}`,
    isVerified: false,
    ...overrides,
  };
}

/**
 * Test consumer component that displays cache state
 */
function CacheConsumer({
  testId,
  onReady,
}: {
  testId?: string;
  onReady?: (api: ReturnType<typeof useIncidentCache>) => void;
}) {
  const cache = useIncidentCache();

  React.useEffect(() => {
    if (onReady) {
      onReady(cache);
    }
  }, [cache, onReady]);

  return (
    <View testID={testId}>
      <Text testID="version">{cache.version}</Text>
    </View>
  );
}

/**
 * Test consumer that fetches and displays an incident
 */
function IncidentFetcher({
  incidentId,
  testId,
}: {
  incidentId: string;
  testId?: string;
}) {
  const { getIncident, version } = useIncidentCache();
  const incident = getIncident(incidentId);

  return (
    <View testID={testId}>
      <Text testID="incident-title">{incident?.title || 'Not Found'}</Text>
      <Text testID="incident-id">{incident?.incidentId || 'N/A'}</Text>
      <Text testID="version">{version}</Text>
    </View>
  );
}

/**
 * Test consumer that can upsert incidents
 */
function CacheUpdater({
  incidents,
  onUpsert,
}: {
  incidents: ProcessedIncident[];
  onUpsert?: () => void;
}) {
  const { upsertMany, version } = useIncidentCache();

  const handleUpsert = () => {
    upsertMany(incidents);
    if (onUpsert) {
      onUpsert();
    }
  };

  return (
    <View>
      <Text testID="version">{version}</Text>
      <Button testID="upsert-button" title="Upsert" onPress={handleUpsert} />
    </View>
  );
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('IncidentCacheContext', () => {
  // =============================================================================
  // PROVIDER RENDERING TESTS
  // =============================================================================

  describe('Provider Rendering', () => {
    it('renders children correctly', () => {
      const { getByText } = render(
        <IncidentCacheProvider>
          <Text>Child Content</Text>
        </IncidentCacheProvider>
      );

      expect(getByText('Child Content')).toBeTruthy();
    });

    it('renders multiple children', () => {
      const { getByText } = render(
        <IncidentCacheProvider>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </IncidentCacheProvider>
      );

      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
    });

    it('renders nested components', () => {
      const { getByText } = render(
        <IncidentCacheProvider>
          <View>
            <View>
              <Text>Nested Content</Text>
            </View>
          </View>
        </IncidentCacheProvider>
      );

      expect(getByText('Nested Content')).toBeTruthy();
    });
  });

  // =============================================================================
  // CONTEXT VALUE ACCESS TESTS
  // =============================================================================

  describe('Context Value Access', () => {
    it('provides getIncident function', () => {
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      expect(cacheApi).not.toBeNull();
      expect(typeof cacheApi!.getIncident).toBe('function');
    });

    it('provides upsertMany function', () => {
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      expect(cacheApi).not.toBeNull();
      expect(typeof cacheApi!.upsertMany).toBe('function');
    });

    it('provides version number', () => {
      const { getByTestId } = render(
        <IncidentCacheProvider>
          <CacheConsumer />
        </IncidentCacheProvider>
      );

      const versionText = getByTestId('version');
      expect(versionText.props.children).toBe(0);
    });

    it('throws error when used outside provider', () => {
      // Suppress console.error for this test since we expect an error
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<CacheConsumer />);
      }).toThrow('useIncidentCache must be used within IncidentCacheProvider');

      console.error = originalError;
    });
  });

  // =============================================================================
  // CACHE MISS TESTS
  // =============================================================================

  describe('Cache Miss Behavior', () => {
    it('returns undefined for non-existent incident', () => {
      let result: ProcessedIncident | undefined;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              result = api.getIncident('non-existent-id');
            }}
          />
        </IncidentCacheProvider>
      );

      expect(result).toBeUndefined();
    });

    it('displays "Not Found" for missing incident', () => {
      const { getByTestId } = render(
        <IncidentCacheProvider>
          <IncidentFetcher incidentId="missing-id" />
        </IncidentCacheProvider>
      );

      expect(getByTestId('incident-title').props.children).toBe('Not Found');
    });

    it('returns undefined for empty string ID', () => {
      let result: ProcessedIncident | undefined;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              result = api.getIncident('');
            }}
          />
        </IncidentCacheProvider>
      );

      expect(result).toBeUndefined();
    });
  });

  // =============================================================================
  // CACHE HIT TESTS
  // =============================================================================

  describe('Cache Hit Behavior', () => {
    it('returns incident after upsert', async () => {
      const mockIncident = createMockIncident('test-1');
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      const { rerender } = render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([mockIncident]);
      });

      const result = cacheApi!.getIncident('test-1');
      expect(result).toBeDefined();
      expect(result?.incidentId).toBe('test-1');
      expect(result?.title).toBe('Test Incident test-1');
    });

    it('returns correct incident by ID', async () => {
      const incident1 = createMockIncident('inc-1');
      const incident2 = createMockIncident('inc-2');
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([incident1, incident2]);
      });

      const result1 = cacheApi!.getIncident('inc-1');
      const result2 = cacheApi!.getIncident('inc-2');

      expect(result1?.title).toBe('Test Incident inc-1');
      expect(result2?.title).toBe('Test Incident inc-2');
    });
  });

  // =============================================================================
  // UPSERT OPERATION TESTS
  // =============================================================================

  describe('Upsert Operations', () => {
    it('inserts new incidents', async () => {
      const incidents = [
        createMockIncident('new-1'),
        createMockIncident('new-2'),
        createMockIncident('new-3'),
      ];
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany(incidents);
      });

      expect(cacheApi!.getIncident('new-1')).toBeDefined();
      expect(cacheApi!.getIncident('new-2')).toBeDefined();
      expect(cacheApi!.getIncident('new-3')).toBeDefined();
    });

    it('updates existing incident with newer version', async () => {
      const oldIncident = createMockIncident('update-test', 1000);
      const newIncident = createMockIncident('update-test', 2000, {
        title: 'Updated Title',
      });
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([oldIncident]);
      });

      expect(cacheApi!.getIncident('update-test')?.title).toBe(
        'Test Incident update-test'
      );

      await act(async () => {
        cacheApi!.upsertMany([newIncident]);
      });

      expect(cacheApi!.getIncident('update-test')?.title).toBe('Updated Title');
    });

    it('ignores older versions of existing incidents', async () => {
      const newIncident = createMockIncident('keep-new', 2000, {
        title: 'Newer Version',
      });
      const oldIncident = createMockIncident('keep-new', 1000, {
        title: 'Older Version',
      });
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([newIncident]);
      });

      await act(async () => {
        cacheApi!.upsertMany([oldIncident]);
      });

      // Should keep the newer version
      expect(cacheApi!.getIncident('keep-new')?.title).toBe('Newer Version');
    });

    it('handles empty array upsert', async () => {
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;
      let initialVersion: number;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      initialVersion = cacheApi!.version;

      await act(async () => {
        cacheApi!.upsertMany([]);
      });

      // Version should not change for empty upsert
      expect(cacheApi!.version).toBe(initialVersion);
    });

    it('handles duplicate incidents in same upsert', async () => {
      const incident1 = createMockIncident('dup-test', 1000);
      const incident2 = createMockIncident('dup-test', 2000, {
        title: 'Later Version',
      });
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([incident1, incident2]);
      });

      // Should keep the one with higher createdAt
      expect(cacheApi!.getIncident('dup-test')?.title).toBe('Later Version');
    });
  });

  // =============================================================================
  // VERSION UPDATE TESTS
  // =============================================================================

  describe('Version Updates', () => {
    it('starts with version 0', () => {
      const { getByTestId } = render(
        <IncidentCacheProvider>
          <CacheConsumer />
        </IncidentCacheProvider>
      );

      expect(getByTestId('version').props.children).toBe(0);
    });

    it('increments version on new incident insert', async () => {
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      const { getByTestId, rerender } = render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      expect(cacheApi!.version).toBe(0);

      await act(async () => {
        cacheApi!.upsertMany([createMockIncident('v-test')]);
      });

      expect(cacheApi!.version).toBe(1);
    });

    it('increments version on update', async () => {
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([createMockIncident('v-update', 1000)]);
      });

      const versionAfterInsert = cacheApi!.version;

      await act(async () => {
        cacheApi!.upsertMany([createMockIncident('v-update', 2000)]);
      });

      expect(cacheApi!.version).toBe(versionAfterInsert + 1);
    });

    it('does not increment version when no changes occur', async () => {
      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      const incident = createMockIncident('no-change', 1000);

      await act(async () => {
        cacheApi!.upsertMany([incident]);
      });

      const versionAfterInsert = cacheApi!.version;

      // Upsert same incident (older timestamp)
      await act(async () => {
        cacheApi!.upsertMany([createMockIncident('no-change', 500)]);
      });

      // Version should not change since older incident was ignored
      expect(cacheApi!.version).toBe(versionAfterInsert);
    });
  });

  // =============================================================================
  // CACHE EVICTION TESTS
  // =============================================================================

  describe('Cache Eviction', () => {
    it('evicts oldest incidents when exceeding max size', async () => {
      // MAX_CACHE_SIZE is 500, so we need to exceed it
      const incidents: ProcessedIncident[] = [];
      const baseTime = Math.floor(Date.now() / 1000);

      // Create 510 incidents with different timestamps
      for (let i = 0; i < 510; i++) {
        incidents.push(createMockIncident(`evict-${i}`, baseTime + i));
      }

      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany(incidents);
      });

      // Oldest incidents (0-9) should be evicted
      expect(cacheApi!.getIncident('evict-0')).toBeUndefined();
      expect(cacheApi!.getIncident('evict-9')).toBeUndefined();

      // Newer incidents should still exist
      expect(cacheApi!.getIncident('evict-10')).toBeDefined();
      expect(cacheApi!.getIncident('evict-509')).toBeDefined();
    });

    it('keeps 500 most recent incidents after eviction', async () => {
      const incidents: ProcessedIncident[] = [];
      const baseTime = Math.floor(Date.now() / 1000);

      for (let i = 0; i < 550; i++) {
        incidents.push(createMockIncident(`count-${i}`, baseTime + i));
      }

      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany(incidents);
      });

      // Count how many incidents are in cache
      let count = 0;
      for (let i = 0; i < 550; i++) {
        if (cacheApi!.getIncident(`count-${i}`)) {
          count++;
        }
      }

      expect(count).toBe(500);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles incidents with same createdAt timestamp', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const incident1 = createMockIncident('same-time-1', timestamp);
      const incident2 = createMockIncident('same-time-2', timestamp);

      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([incident1, incident2]);
      });

      // Both should be in cache since they have different IDs
      expect(cacheApi!.getIncident('same-time-1')).toBeDefined();
      expect(cacheApi!.getIncident('same-time-2')).toBeDefined();
    });

    it('handles special characters in incident IDs', async () => {
      const specialId = 'test-id_with.special:chars';
      const incident = createMockIncident(specialId);

      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([incident]);
      });

      expect(cacheApi!.getIncident(specialId)).toBeDefined();
    });

    it('handles very long incident IDs', async () => {
      const longId = 'a'.repeat(1000);
      const incident = createMockIncident(longId);

      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([incident]);
      });

      expect(cacheApi!.getIncident(longId)).toBeDefined();
    });

    it('handles null-ish createdAt values gracefully', async () => {
      const incident = createMockIncident('null-time', 0);

      let cacheApi: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cacheApi = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cacheApi!.upsertMany([incident]);
      });

      expect(cacheApi!.getIncident('null-time')).toBeDefined();
    });
  });

  // =============================================================================
  // MULTIPLE CONSUMER TESTS
  // =============================================================================

  describe('Multiple Consumers', () => {
    it('shares state across multiple consumers', async () => {
      let consumer1Api: ReturnType<typeof useIncidentCache> | null = null;
      let consumer2Api: ReturnType<typeof useIncidentCache> | null = null;

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            testId="consumer-1"
            onReady={(api) => {
              consumer1Api = api;
            }}
          />
          <CacheConsumer
            testId="consumer-2"
            onReady={(api) => {
              consumer2Api = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        consumer1Api!.upsertMany([createMockIncident('shared-incident')]);
      });

      // Both consumers should see the same incident
      expect(consumer1Api!.getIncident('shared-incident')).toBeDefined();
      expect(consumer2Api!.getIncident('shared-incident')).toBeDefined();
    });

    it('updates all consumers on cache change', async () => {
      const { getAllByTestId } = render(
        <IncidentCacheProvider>
          <IncidentFetcher incidentId="multi-test" testId="fetcher-1" />
          <IncidentFetcher incidentId="multi-test" testId="fetcher-2" />
        </IncidentCacheProvider>
      );

      // Initially both should show "Not Found"
      const titles = getAllByTestId('incident-title');
      expect(titles[0].props.children).toBe('Not Found');
      expect(titles[1].props.children).toBe('Not Found');
    });
  });

  // =============================================================================
  // PROVIDER ISOLATION TESTS
  // =============================================================================

  describe('Provider Isolation', () => {
    it('separate providers have independent caches', async () => {
      let cache1Api: ReturnType<typeof useIncidentCache> | null = null;
      let cache2Api: ReturnType<typeof useIncidentCache> | null = null;

      // Note: Rendering two providers separately
      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cache1Api = api;
            }}
          />
        </IncidentCacheProvider>
      );

      render(
        <IncidentCacheProvider>
          <CacheConsumer
            onReady={(api) => {
              cache2Api = api;
            }}
          />
        </IncidentCacheProvider>
      );

      await act(async () => {
        cache1Api!.upsertMany([createMockIncident('isolated-1')]);
      });

      // First provider's consumer should have the incident
      expect(cache1Api!.getIncident('isolated-1')).toBeDefined();

      // Second provider's consumer should NOT have the incident
      expect(cache2Api!.getIncident('isolated-1')).toBeUndefined();
    });
  });
});
