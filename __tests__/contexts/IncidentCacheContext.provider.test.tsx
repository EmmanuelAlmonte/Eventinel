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

describe('IncidentCacheContext provider', () => {
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
});
