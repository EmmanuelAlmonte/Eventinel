import React from 'react';

import { ErrorThrowingComponent, renderBoundary } from './errorBoundaryTestHarness';

describe('ErrorBoundary error reporting', () => {
  it('calls onError callback when error is caught', () => {
    const mockOnError = jest.fn();

    renderBoundary(<ErrorThrowingComponent />, { onError: mockOnError });

    expect(mockOnError).toHaveBeenCalled();
  });

  it('passes the error object and info to onError', () => {
    const mockOnError = jest.fn();

    renderBoundary(<ErrorThrowingComponent />, { onError: mockOnError });

    expect(mockOnError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });

  it('passes error with correct message to onError', () => {
    const mockOnError = jest.fn();

    renderBoundary(<ErrorThrowingComponent />, { onError: mockOnError });

    const [error] = mockOnError.mock.calls[0];
    expect(error.message).toBe('Test error message');
  });

  it('passes errorInfo with componentStack to onError', () => {
    const mockOnError = jest.fn();

    renderBoundary(<ErrorThrowingComponent />, { onError: mockOnError });

    const [, errorInfo] = mockOnError.mock.calls[0];
    expect(errorInfo.componentStack).toBeDefined();
  });
});
