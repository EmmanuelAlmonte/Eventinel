import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ReportDraftProvider, useReportDraft } from '../../contexts/ReportDraftContext';

function ReportDraftProbe() {
  const { draft, sessionKey, startDraft, updateDraft, resetDraft } = useReportDraft();

  return (
    <View>
      <Text testID="session-key">{sessionKey ?? 'none'}</Text>
      <Text testID="draft-description">{draft.description || 'empty'}</Text>
      <Text testID="draft-location-note">{draft.locationNote || 'empty'}</Text>
      <Text testID="draft-incident-type">{draft.incidentType ?? 'none'}</Text>
      <Text testID="draft-still-active">{draft.stillActive === null ? 'unset' : String(draft.stillActive)}</Text>
      <Pressable
        testID="start-draft"
        onPress={() =>
          startDraft('session-1', {
            sourceTab: 'Map',
            incidentType: 'fire',
            description: 'Initial draft',
            locationNote: 'Warehouse entrance',
            location: { latitude: 40.0, longitude: -75.0 },
            stillActive: true,
          })
        }
      />
      <Pressable
        testID="update-draft"
        onPress={() =>
          updateDraft({
            description: 'Updated draft',
            locationNote: 'Rear alley',
          })
        }
      />
      <Pressable testID="set-still-active-false" onPress={() => updateDraft({ stillActive: false })} />
      <Pressable
        testID="resume-same-session"
        onPress={() =>
          startDraft('session-1', {
            incidentType: 'medical',
            description: 'Should not replace current draft',
            stillActive: true,
          })
        }
      />
      <Pressable
        testID="restart-draft"
        onPress={() =>
          startDraft('session-2', {
            incidentType: 'medical',
            description: 'Fresh draft',
            stillActive: true,
          })
        }
      />
      <Pressable testID="reset-draft" onPress={resetDraft} />
    </View>
  );
}

describe('ReportDraftContext', () => {
  it('starts, updates, and resets a report draft', () => {
    const screen = render(
      <ReportDraftProvider>
        <ReportDraftProbe />
      </ReportDraftProvider>
    );

    expect(screen.getByTestId('session-key').props.children).toBe('none');
    expect(screen.getByTestId('draft-description').props.children).toBe('empty');

    fireEvent.press(screen.getByTestId('start-draft'));

    expect(screen.getByTestId('session-key').props.children).toBe('session-1');
    expect(screen.getByTestId('draft-description').props.children).toBe('Initial draft');
    expect(screen.getByTestId('draft-location-note').props.children).toBe('Warehouse entrance');
    expect(screen.getByTestId('draft-incident-type').props.children).toBe('fire');
    expect(screen.getByTestId('draft-still-active').props.children).toBe('true');

    fireEvent.press(screen.getByTestId('update-draft'));
    fireEvent.press(screen.getByTestId('set-still-active-false'));

    expect(screen.getByTestId('draft-description').props.children).toBe('Updated draft');
    expect(screen.getByTestId('draft-location-note').props.children).toBe('Rear alley');
    expect(screen.getByTestId('draft-still-active').props.children).toBe('false');

    fireEvent.press(screen.getByTestId('resume-same-session'));

    expect(screen.getByTestId('session-key').props.children).toBe('session-1');
    expect(screen.getByTestId('draft-description').props.children).toBe('Updated draft');
    expect(screen.getByTestId('draft-incident-type').props.children).toBe('fire');
    expect(screen.getByTestId('draft-still-active').props.children).toBe('false');

    fireEvent.press(screen.getByTestId('restart-draft'));

    expect(screen.getByTestId('session-key').props.children).toBe('session-2');
    expect(screen.getByTestId('draft-description').props.children).toBe('Fresh draft');
    expect(screen.getByTestId('draft-location-note').props.children).toBe('empty');
    expect(screen.getByTestId('draft-incident-type').props.children).toBe('medical');
    expect(screen.getByTestId('draft-still-active').props.children).toBe('true');

    fireEvent.press(screen.getByTestId('reset-draft'));

    expect(screen.getByTestId('session-key').props.children).toBe('none');
    expect(screen.getByTestId('draft-description').props.children).toBe('empty');
    expect(screen.getByTestId('draft-location-note').props.children).toBe('empty');
    expect(screen.getByTestId('draft-still-active').props.children).toBe('unset');
  });
});
