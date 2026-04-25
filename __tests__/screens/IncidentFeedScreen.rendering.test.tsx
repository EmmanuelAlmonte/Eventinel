/**
 * @jest-environment jsdom
 */

import {
  buildSharedIncidentsState,
  cleanupIncidentFeedScreenTestHarness,
  mockIncidents,
  mockUseSharedIncidents,
  renderActiveIncidentFeed,
  renderInactiveIncidentFeed,
  resetIncidentFeedScreenTestHarness,
} from './incidentFeedScreenTestHarness';

describe('IncidentFeedScreen rendering', () => {
  beforeEach(resetIncidentFeedScreenTestHarness);
  afterEach(cleanupIncidentFeedScreenTestHarness);

  it('renders the incidents title and screen container', () => {
    const { getByText, getByTestId } = renderActiveIncidentFeed();

    expect(getByText('Incidents')).toBeTruthy();
    expect(getByTestId('screen-container')).toBeTruthy();
  });

  it('renders a lightweight feed shell before activating the incident list', () => {
    const { getByText, queryByText } = renderInactiveIncidentFeed();

    expect(getByText('0')).toBeTruthy();
    expect(getByText('Updating now')).toBeTruthy();
    expect(queryByText('Fire on Main Street')).toBeNull();
  });

  it('renders subtitle with incident count after activation', () => {
    const { getByText } = renderActiveIncidentFeed();

    expect(getByText('3')).toBeTruthy();
    expect(getByText('nearby')).toBeTruthy();
  });

  it('shows updated status when history received', () => {
    const { getByText } = renderActiveIncidentFeed();

    expect(getByText(/Updated/)).toBeTruthy();
  });

  it('shows updating status when history not received', () => {
    mockUseSharedIncidents.mockReturnValue(
      buildSharedIncidentsState({
        incidents: mockIncidents,
        hasReceivedHistory: false,
      })
    );

    const { getByText } = renderActiveIncidentFeed();

    expect(getByText('Updating now')).toBeTruthy();
  });
});
