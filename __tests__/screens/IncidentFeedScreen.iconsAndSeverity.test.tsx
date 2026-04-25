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

describe('IncidentFeedScreen icons and severity', () => {
  beforeEach(resetIncidentFeedScreenTestHarness);
  afterEach(cleanupIncidentFeedScreenTestHarness);

  it('shows incident type icons', () => {
    const { getByTestId } = renderActiveIncidentFeed();

    expect(getByTestId('icon-local-fire-department')).toBeTruthy();
    expect(getByTestId('icon-traffic')).toBeTruthy();
    expect(getByTestId('icon-medical-services')).toBeTruthy();
  });

  it('shows meta icons for time, address, and navigation affordance', () => {
    const { getAllByTestId } = renderActiveIncidentFeed();

    expect(getAllByTestId('icon-schedule').length).toBeGreaterThan(0);
    expect(getAllByTestId('icon-location-on').length).toBeGreaterThan(0);
    expect(getAllByTestId('icon-chevron-right').length).toBe(3);
  });

  it('handles minimum and maximum severity labels', () => {
    mockUseSharedIncidents.mockReturnValue(
      buildSharedIncidentsState({
        incidents: [
          {
            ...mockIncidents[0],
            severity: 1,
          },
          mockIncidents[2],
        ],
      })
    );

    const { getByText } = renderActiveIncidentFeed();

    expect(getByText('Info')).toBeTruthy();
    expect(getByText('Critical')).toBeTruthy();
  });
});
