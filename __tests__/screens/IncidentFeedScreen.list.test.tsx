/**
 * @jest-environment jsdom
 */

import {
  buildSharedIncidentsState,
  cleanupIncidentFeedScreenTestHarness,
  mockIncidents,
  mockUseSharedIncidents,
  renderActiveIncidentFeed,
  resetIncidentFeedScreenTestHarness,
} from './incidentFeedScreenTestHarness';

describe('IncidentFeedScreen incident list', () => {
  beforeEach(resetIncidentFeedScreenTestHarness);
  afterEach(cleanupIncidentFeedScreenTestHarness);

  it('renders all incident cards', () => {
    const { getByText } = renderActiveIncidentFeed();

    expect(getByText('Fire on Main Street')).toBeTruthy();
    expect(getByText('Traffic Accident')).toBeTruthy();
    expect(getByText('Medical Emergency')).toBeTruthy();
  });

  it('displays incident descriptions and addresses', () => {
    const { getByText, getAllByText } = renderActiveIncidentFeed();

    expect(getByText(/Large fire reported/)).toBeTruthy();
    expect(getByText(/Multi-car accident/)).toBeTruthy();
    expect(getAllByText(/123 Main St/).length).toBeGreaterThan(0);
    expect(getAllByText(/456 Broadway/).length).toBeGreaterThan(0);
  });

  it('displays severity badges and relative timestamps', () => {
    const { getByText, getAllByText } = renderActiveIncidentFeed();

    expect(getByText('High')).toBeTruthy();
    expect(getByText('Medium')).toBeTruthy();
    expect(getByText('Critical')).toBeTruthy();
    expect(getAllByText(/ago/).length).toBeGreaterThan(0);
  });

  it('shows correct nearby count for zero, one, and multiple incidents', () => {
    const multiple = renderActiveIncidentFeed();
    expect(multiple.getByText('3')).toBeTruthy();
    expect(multiple.getByText('nearby')).toBeTruthy();
    multiple.unmount();

    mockUseSharedIncidents.mockReturnValue(
      buildSharedIncidentsState({
        incidents: [],
        hasReceivedHistory: true,
      })
    );
    const empty = renderActiveIncidentFeed();
    expect(empty.getByText('0')).toBeTruthy();
    expect(empty.getByText('nearby')).toBeTruthy();
    empty.unmount();

    mockUseSharedIncidents.mockReturnValue(
      buildSharedIncidentsState({
        incidents: [mockIncidents[0]],
        hasReceivedHistory: true,
      })
    );
    const single = renderActiveIncidentFeed();
    expect(single.getByText('1')).toBeTruthy();
    expect(single.getByText('nearby')).toBeTruthy();
  });
});
