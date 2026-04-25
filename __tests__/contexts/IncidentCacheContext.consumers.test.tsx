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

describe('IncidentCacheContext consumers', () => {
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
