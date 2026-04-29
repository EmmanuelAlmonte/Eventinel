import React from 'react';
import { StyleSheet, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import {
  CardErrorFallback,
  InlineErrorFallback,
  ScreenErrorFallback,
} from './errorBoundaryTestHarness';

describe('ErrorBoundary fallback variants', () => {
  describe('ScreenErrorFallback', () => {
    it('renders visible text and icon', () => {
      const { getByTestId, getByText } = render(<ScreenErrorFallback />);

      expect(getByText('Unable to load screen')).toBeTruthy();
      expect(getByText(/Something went wrong while loading/)).toBeTruthy();
      expect(getByTestId('RNE__ICON__CONTAINER')).toBeTruthy();
    });

    it('renders Retry button only when onRetry is provided', () => {
      const { getByText, rerender, queryByText } = render(<ScreenErrorFallback />);

      expect(queryByText('Retry')).toBeNull();

      rerender(<ScreenErrorFallback onRetry={jest.fn()} />);

      expect(getByText('Retry')).toBeTruthy();
    });

    it('calls onRetry when Retry is pressed', () => {
      const mockRetry = jest.fn();
      const { getByText } = render(<ScreenErrorFallback onRetry={mockRetry} />);

      fireEvent.press(getByText('Retry'));

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('CardErrorFallback', () => {
    it('renders visible text and icon', () => {
      const { getByTestId, getByText } = render(<CardErrorFallback />);

      expect(getByText('Failed to load')).toBeTruthy();
      expect(getByTestId('RNE__ICON__CONTAINER')).toBeTruthy();
    });

    it('renders retry link only when onRetry is provided', () => {
      const { getByText, rerender, queryByText } = render(<CardErrorFallback />);

      expect(queryByText('Tap to retry')).toBeNull();

      rerender(<CardErrorFallback onRetry={jest.fn()} />);

      expect(getByText('Tap to retry')).toBeTruthy();
    });

    it('calls onRetry when retry link is pressed', () => {
      const mockRetry = jest.fn();
      const { getByText } = render(<CardErrorFallback onRetry={mockRetry} />);

      fireEvent.press(getByText('Tap to retry'));

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('InlineErrorFallback', () => {
    it('renders visible text and icon', () => {
      const { getByTestId, getByText } = render(<InlineErrorFallback />);

      expect(getByText('Error loading content')).toBeTruthy();
      expect(getByTestId('RNE__ICON__CONTAINER')).toBeTruthy();
    });

    it('renders in a horizontal layout', () => {
      const { UNSAFE_getAllByType } = render(<InlineErrorFallback />);
      const [root] = UNSAFE_getAllByType(View);
      const rootStyle = StyleSheet.flatten(root.props.style);

      expect(rootStyle).toEqual(expect.objectContaining({ flexDirection: 'row' }));
    });
  });
});
