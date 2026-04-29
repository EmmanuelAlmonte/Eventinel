import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ErrorBoundary, ErrorThrowingComponent, renderBoundary } from './errorBoundaryTestHarness';

describe('ErrorBoundary recovery and details', () => {
  it('renders recovered children after retry resets error state', () => {
    let shouldThrow = true;
    const DynamicComponent = () => {
      if (shouldThrow) {
        throw new Error('Error');
      }

      return <Text>Recovered</Text>;
    };

    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <DynamicComponent />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(getByText('Try Again'));

    expect(getByText('Recovered')).toBeTruthy();
    expect(queryByText('Something went wrong')).toBeNull();
  });

  it('keeps retry button pressable while the child still throws', () => {
    const { getByText } = renderBoundary(<ErrorThrowingComponent />);

    expect(() => fireEvent.press(getByText('Try Again'))).not.toThrow();
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('shows error details toggle when details are enabled', () => {
    const { getByText } = renderBoundary(
      <ErrorThrowingComponent />,
      { showDetails: true }
    );

    expect(getByText('Error Details')).toBeTruthy();
  });

  it('keeps error details collapsed until the toggle is pressed', () => {
    const { getByText, queryByText } = renderBoundary(
      <ErrorThrowingComponent />,
      { showDetails: true }
    );

    expect(getByText('Error Details')).toBeTruthy();
    expect(queryByText('Test error message')).toBeNull();

    fireEvent.press(getByText('Error Details'));

    expect(getByText('Test error message')).toBeTruthy();
  });

  it('hides details when showDetails is false', () => {
    const { queryByText } = renderBoundary(
      <ErrorThrowingComponent />,
      { showDetails: false }
    );

    expect(queryByText('Error Details')).toBeNull();
  });

  it('handles error with empty message', () => {
    const { getByText } = renderBoundary(<ErrorThrowingComponent message="" />);

    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('handles error with very long message', () => {
    const { getByText } = renderBoundary(
      <ErrorThrowingComponent message={'A'.repeat(1000)} />,
      { showDetails: true }
    );

    expect(getByText('Something went wrong')).toBeTruthy();
  });
});
