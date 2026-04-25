import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#09090B',
      surface: '#18181B',
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      error: '#DC2626',
      warning: '#F59E0B',
      primary: '#9333EA',
      border: '#27272A',
    },
  }),
}));

export {
  ErrorBoundary,
  ScreenErrorFallback,
  CardErrorFallback,
  InlineErrorFallback,
} from '../../../components/ui/ErrorBoundary';

import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';

type BoundaryProps = Omit<React.ComponentProps<typeof ErrorBoundary>, 'children'>;

export function ErrorThrowingComponent({
  message = 'Test error message',
}: {
  message?: string;
}): React.ReactElement {
  throw new Error(message);
  return <Text />;
}

export function WorkingComponent({ text = 'Working content' }: { text?: string }) {
  return (
    <View testID="working-component">
      <Text>{text}</Text>
    </View>
  );
}

export function renderBoundary(children: React.ReactNode, props: BoundaryProps = {}) {
  return render(<ErrorBoundary {...props}>{children}</ErrorBoundary>);
}

const originalConsoleError = console.error;

beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});
