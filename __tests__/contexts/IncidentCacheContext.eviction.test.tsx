/**
 * @jest-environment jsdom
 */

import {
  act,
  CacheConsumer,
  CacheUpdater,
  createMockIncident,
  IncidentCacheProvider,
  IncidentFetcher,
  INCIDENT_LIMITS,
  render,
  Text,
  useIncidentCache,
  View,
  waitFor,
} from './incidentCacheContextTestHarness';
import type { ProcessedIncident } from '../../hooks/useIncidentSubscription';

describe('IncidentCacheContext eviction and edge cases', () => {
    describe('Cache Eviction', () => {
      it('evicts oldest incidents when exceeding max size', async () => {
        const maxCacheSize = INCIDENT_LIMITS.MAX_CACHE;
        const overflowCount = 10;
        const incidents: ProcessedIncident[] = [];
        const baseTime = Math.floor(Date.now() / 1000);
  
        // Create incidents beyond max size with strictly increasing timestamps.
        for (let i = 0; i < maxCacheSize + overflowCount; i++) {
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
  
        // Oldest overflowed incidents should be evicted.
        expect(cacheApi!.getIncident('evict-0')).toBeUndefined();
        expect(cacheApi!.getIncident(`evict-${overflowCount - 1}`)).toBeUndefined();
  
        // Newer incidents should still exist.
        expect(cacheApi!.getIncident(`evict-${overflowCount}`)).toBeDefined();
        expect(cacheApi!.getIncident(`evict-${maxCacheSize + overflowCount - 1}`)).toBeDefined();
      });
  
      it('keeps max cache size most recent incidents after eviction', async () => {
        const maxCacheSize = INCIDENT_LIMITS.MAX_CACHE;
        const overflowCount = 50;
        const incidents: ProcessedIncident[] = [];
        const baseTime = Math.floor(Date.now() / 1000);
  
        for (let i = 0; i < maxCacheSize + overflowCount; i++) {
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
        for (let i = 0; i < maxCacheSize + overflowCount; i++) {
          if (cacheApi!.getIncident(`count-${i}`)) {
            count++;
          }
        }
  
        expect(count).toBe(maxCacheSize);
      });
    });
  
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
});

