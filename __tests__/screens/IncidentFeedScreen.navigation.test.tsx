/**
 * @jest-environment jsdom
 */

import { fireEvent } from '@testing-library/react-native';

import {
  cleanupIncidentFeedScreenTestHarness,
  mockNavigate,
  renderActiveIncidentFeed,
  resetIncidentFeedScreenTestHarness,
} from './incidentFeedScreenTestHarness';

describe('IncidentFeedScreen navigation', () => {
  beforeEach(resetIncidentFeedScreenTestHarness);
  afterEach(cleanupIncidentFeedScreenTestHarness);

  it('navigates to incident detail when the first card is pressed', () => {
    const { getByText } = renderActiveIncidentFeed();

    fireEvent.press(getByText('Fire on Main Street'));

    expect(mockNavigate).toHaveBeenCalledWith('IncidentDetail', {
      incidentId: 'incident-1',
    });
  });

  it('navigates with the correct incident id for later items', () => {
    const { getByText } = renderActiveIncidentFeed();

    fireEvent.press(getByText('Traffic Accident'));
    expect(mockNavigate).toHaveBeenCalledWith('IncidentDetail', {
      incidentId: 'incident-2',
    });

    fireEvent.press(getByText('Medical Emergency'));
    expect(mockNavigate).toHaveBeenCalledWith('IncidentDetail', {
      incidentId: 'incident-3',
    });
  });
});
