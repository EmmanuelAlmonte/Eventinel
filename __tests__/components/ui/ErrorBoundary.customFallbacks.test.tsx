import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

import {
  CardErrorFallback,
  ErrorBoundary,
  ErrorThrowingComponent,
  InlineErrorFallback,
  ScreenErrorFallback,
  renderBoundary,
} from './errorBoundaryTestHarness';

describe('ErrorBoundary custom fallbacks', () => {
  it('renders custom fallback when provided', () => {
    const { getByText } = renderBoundary(
      <ErrorThrowingComponent />,
      { fallback: <Text>Custom Error UI</Text> }
    );

    expect(getByText('Custom Error UI')).toBeTruthy();
  });

  it('does not show default fallback when custom fallback is provided', () => {
    const { queryByText } = renderBoundary(
      <ErrorThrowingComponent />,
      { fallback: <Text>Custom</Text> }
    );

    expect(queryByText('Something went wrong')).toBeNull();
  });

  it('accepts complex custom fallback content', () => {
    const { getByText } = renderBoundary(
      <ErrorThrowingComponent />,
      {
        fallback: (
          <View>
            <Text>Custom Title</Text>
            <Text>Custom Message</Text>
          </View>
        ),
      }
    );

    expect(getByText('Custom Title')).toBeTruthy();
    expect(getByText('Custom Message')).toBeTruthy();
  });

  it('can wrap ScreenErrorFallback as custom fallback', () => {
    const { getByText } = renderBoundary(
      <ErrorThrowingComponent />,
      { fallback: <ScreenErrorFallback /> }
    );

    expect(getByText('Unable to load screen')).toBeTruthy();
  });

  it('can wrap CardErrorFallback as custom fallback', () => {
    const { getByText } = renderBoundary(
      <ErrorThrowingComponent />,
      { fallback: <CardErrorFallback /> }
    );

    expect(getByText('Failed to load')).toBeTruthy();
  });

  it('can wrap InlineErrorFallback as custom fallback', () => {
    const { getByText } = renderBoundary(
      <ErrorThrowingComponent />,
      { fallback: <InlineErrorFallback /> }
    );

    expect(getByText('Error loading content')).toBeTruthy();
  });

  it('lets nested boundaries catch their own errors', () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary fallback={<Text>Outer Fallback</Text>}>
        <View>
          <ErrorBoundary fallback={<Text>Inner Fallback</Text>}>
            <ErrorThrowingComponent />
          </ErrorBoundary>
        </View>
      </ErrorBoundary>
    );

    expect(getByText('Inner Fallback')).toBeTruthy();
    expect(queryByText('Outer Fallback')).toBeNull();
  });
});
