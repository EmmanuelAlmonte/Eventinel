/**
 * @jest-environment jsdom
 */

import {
  buildSharedIncidentsState,
  cleanupIncidentFeedScreenTestHarness,
  createLocationState,
  mockUseSharedIncidents,
  mockUseSharedLocation,
  renderActiveIncidentFeed,
  resetIncidentFeedScreenTestHarness,
} from './incidentFeedScreenTestHarness';

describe('IncidentFeedScreen loading and empty states', () => {
  beforeEach(resetIncidentFeedScreenTestHarness);
  afterEach(cleanupIncidentFeedScreenTestHarness);

  it('shows skeleton list and finding location message when location is loading', () => {
    mockUseSharedLocation.mockReturnValue(
      createLocationState({
        location: null,
        isLoading: true,
        source: 'none',
        permission: 'undetermined',
      })
    );

    const { getByTestId, getByText } = renderActiveIncidentFeed();

    expect(getByTestId('skeleton-list')).toBeTruthy();
    expect(getByText('Finding your location...')).toBeTruthy();
  });

  it('does not show skeleton when location is ready', () => {
    const { queryByTestId } = renderActiveIncidentFeed();

    expect(queryByTestId('skeleton-list')).toBeNull();
  });

  it('shows quiet empty state when no incidents and history received', () => {
    mockUseSharedIncidents.mockReturnValue(
      buildSharedIncidentsState({
        incidents: [],
        hasReceivedHistory: true,
      })
    );

    const { getByText, getByTestId } = renderActiveIncidentFeed();

    expect(getByText('Quiet right now')).toBeTruthy();
    expect(getByText('No nearby incidents have been reported in your current area.')).toBeTruthy();
    expect(getByTestId('icon-check-circle')).toBeTruthy();
  });

  it('shows checking activity empty state before history arrives', () => {
    mockUseSharedIncidents.mockReturnValue(
      buildSharedIncidentsState({
        incidents: [],
        hasReceivedHistory: false,
      })
    );

    const { getByText, getByTestId } = renderActiveIncidentFeed();

    expect(getByText('Checking nearby activity')).toBeTruthy();
    expect(getByText('Pulling the latest incident reports from your relays.')).toBeTruthy();
    expect(getByTestId('icon-hourglass-empty')).toBeTruthy();
  });
});
