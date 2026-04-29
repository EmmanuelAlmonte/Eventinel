import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import {
  ErrorBoundary,
  ErrorThrowingComponent,
  WorkingComponent,
  renderBoundary,
} from './errorBoundaryTestHarness';

describe('ErrorBoundary rendering', () => {
  it('renders children when no error occurs', () => {
    const { getByText } = renderBoundary(<WorkingComponent text="Hello World" />);

    expect(getByText('Hello World')).toBeTruthy();
  });

  it('renders multiple children', () => {
    const { getByText } = renderBoundary(
      <>
        <WorkingComponent text="First" />
        <WorkingComponent text="Second" />
      </>
    );

    expect(getByText('First')).toBeTruthy();
    expect(getByText('Second')).toBeTruthy();
  });

  it('passes through children unchanged', () => {
    const { getByTestId } = renderBoundary(<WorkingComponent />);

    expect(getByTestId('working-component')).toBeTruthy();
  });

  it('catches render errors and shows the default fallback UI', () => {
    const { getByText } = renderBoundary(<ErrorThrowingComponent />);

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
    expect(getByText(/We're sorry, but something unexpected happened/)).toBeTruthy();
  });

  it('handles null children gracefully', () => {
    const { UNSAFE_root } = render(
      <ErrorBoundary>
        {null}
      </ErrorBoundary>
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('handles undefined children gracefully', () => {
    const { UNSAFE_root } = render(
      <ErrorBoundary>
        {undefined}
      </ErrorBoundary>
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('does not interfere with components that render before effect work runs', () => {
    const UseEffectComponent = () => {
      React.useEffect(() => undefined, []);
      return <Text>Initial Render</Text>;
    };

    const { getByText } = renderBoundary(<UseEffectComponent />);

    expect(getByText('Initial Render')).toBeTruthy();
  });
});
