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

describe('IncidentCacheContext lookup', () => {
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
});

