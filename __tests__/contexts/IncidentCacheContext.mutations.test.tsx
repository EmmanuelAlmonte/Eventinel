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

describe('IncidentCacheContext mutations', () => {
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
  
      it('removes incidents by ID', async () => {
        let cacheApi: ReturnType<typeof useIncidentCache> | null = null;
        const incident = createMockIncident('remove-test');
  
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
        expect(cacheApi!.getIncident('remove-test')).toBeDefined();
  
        await act(async () => {
          cacheApi!.removeMany(['remove-test']);
        });
  
        expect(cacheApi!.getIncident('remove-test')).toBeUndefined();
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
});
