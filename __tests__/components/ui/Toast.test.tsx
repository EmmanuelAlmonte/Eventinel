/**
 * Toast Component Tests
 *
 * Tests the toast notification system:
 * - ToastProvider component
 * - useToastConfig hook
 * - showToast helper functions
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import ToastLib from 'react-native-toast-message';

// Mock the hooks module BEFORE importing the component
jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      success: '#22C55E',
      error: '#DC2626',
      warning: '#F59E0B',
      info: '#3B82F6',
      primary: '#9333EA',
    },
    isDark: true,
  }),
}));

// Mock react-native-toast-message BEFORE component imports
jest.mock('react-native-toast-message', () => {
  const mockShow = jest.fn();
  const mockHide = jest.fn();

  const MockToast = (props: any) => null;
  MockToast.show = mockShow;
  MockToast.hide = mockHide;

  return {
    __esModule: true,
    default: MockToast,
    BaseToast: (props: any) => null,
    ErrorToast: (props: any) => null,
  };
});

// Import components under test AFTER mocking
import {
  ToastProvider,
  useToastConfig,
  showToast,
} from '../../../components/ui/Toast';

// =============================================================================
// TOASTPROVIDER TESTS
// =============================================================================

describe('ToastProvider', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(<ToastProvider />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('can be mounted in component tree', () => {
      const { UNSAFE_root } = render(
        <React.Fragment>
          <ToastProvider />
        </React.Fragment>
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

// =============================================================================
// USETOASTCONFIG HOOK TESTS
// =============================================================================

describe('useToastConfig', () => {
  // Helper to render hook
  const TestComponent = ({ onConfig }: { onConfig: (config: any) => void }) => {
    const config = useToastConfig();
    React.useEffect(() => {
      onConfig(config);
    }, [config, onConfig]);
    return null;
  };

  it('returns configuration object', () => {
    let capturedConfig: any;
    render(<TestComponent onConfig={(config) => (capturedConfig = config)} />);
    expect(capturedConfig).toBeDefined();
  });

  it('includes success toast config', () => {
    let capturedConfig: any;
    render(<TestComponent onConfig={(config) => (capturedConfig = config)} />);
    expect(capturedConfig.success).toBeDefined();
  });

  it('includes error toast config', () => {
    let capturedConfig: any;
    render(<TestComponent onConfig={(config) => (capturedConfig = config)} />);
    expect(capturedConfig.error).toBeDefined();
  });

  it('includes info toast config', () => {
    let capturedConfig: any;
    render(<TestComponent onConfig={(config) => (capturedConfig = config)} />);
    expect(capturedConfig.info).toBeDefined();
  });

  it('includes warning toast config', () => {
    let capturedConfig: any;
    render(<TestComponent onConfig={(config) => (capturedConfig = config)} />);
    expect(capturedConfig.warning).toBeDefined();
  });

  it('includes network toast config', () => {
    let capturedConfig: any;
    render(<TestComponent onConfig={(config) => (capturedConfig = config)} />);
    expect(capturedConfig.network).toBeDefined();
  });

  it('config functions are callable', () => {
    let capturedConfig: any;
    render(<TestComponent onConfig={(config) => (capturedConfig = config)} />);

    // Each config function should be callable with props
    const mockProps = { text1: 'Test', text2: 'Message' };
    expect(() => capturedConfig.success(mockProps)).not.toThrow();
    expect(() => capturedConfig.error(mockProps)).not.toThrow();
    expect(() => capturedConfig.info(mockProps)).not.toThrow();
    expect(() => capturedConfig.warning(mockProps)).not.toThrow();
    expect(() => capturedConfig.network(mockProps)).not.toThrow();
  });
});

// =============================================================================
// SHOWTOAST HELPER TESTS
// =============================================================================

describe('showToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showToast.success', () => {
    it('calls ToastLib.show with success type', () => {
      showToast.success('Success Title');

      expect(ToastLib.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Success Title',
        text2: undefined,
      });
    });

    it('passes title and message', () => {
      showToast.success('Title', 'Description message');

      expect(ToastLib.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Title',
        text2: 'Description message',
      });
    });

    it('handles empty message', () => {
      showToast.success('Title');

      expect(ToastLib.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          text1: 'Title',
        })
      );
    });
  });

  describe('showToast.error', () => {
    it('calls ToastLib.show with error type', () => {
      showToast.error('Error Title');

      expect(ToastLib.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Error Title',
        text2: undefined,
        visibilityTime: 4000,
      });
    });

    it('has longer visibility time for errors', () => {
      showToast.error('Error');

      expect(ToastLib.show).toHaveBeenCalledWith(
        expect.objectContaining({
          visibilityTime: 4000,
        })
      );
    });

    it('passes title and message', () => {
      showToast.error('Error Title', 'Error details');

      expect(ToastLib.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Error Title',
        text2: 'Error details',
        visibilityTime: 4000,
      });
    });
  });

  describe('showToast.info', () => {
    it('calls ToastLib.show with info type', () => {
      showToast.info('Info Title');

      expect(ToastLib.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Info Title',
        text2: undefined,
      });
    });

    it('passes title and message', () => {
      showToast.info('Info', 'Additional info');

      expect(ToastLib.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Info',
        text2: 'Additional info',
      });
    });
  });

  describe('showToast.warning', () => {
    it('calls ToastLib.show with warning type', () => {
      showToast.warning('Warning Title');

      expect(ToastLib.show).toHaveBeenCalledWith({
        type: 'warning',
        text1: 'Warning Title',
        text2: undefined,
        visibilityTime: 4000,
      });
    });

    it('has longer visibility time for warnings', () => {
      showToast.warning('Warning');

      expect(ToastLib.show).toHaveBeenCalledWith(
        expect.objectContaining({
          visibilityTime: 4000,
        })
      );
    });
  });

  describe('showToast.network', () => {
    it('calls ToastLib.show with network type', () => {
      showToast.network('Network Title');

      expect(ToastLib.show).toHaveBeenCalledWith({
        type: 'network',
        text1: 'Network Title',
        text2: undefined,
      });
    });

    it('passes title and message', () => {
      showToast.network('Connected', 'To 3 relays');

      expect(ToastLib.show).toHaveBeenCalledWith({
        type: 'network',
        text1: 'Connected',
        text2: 'To 3 relays',
      });
    });
  });

  describe('showToast.show', () => {
    it('passes full params to ToastLib.show', () => {
      const params = {
        type: 'success' as const,
        text1: 'Custom Title',
        text2: 'Custom Message',
        visibilityTime: 5000,
        position: 'bottom' as const,
      };

      showToast.show(params);

      expect(ToastLib.show).toHaveBeenCalledWith(params);
    });

    it('allows custom toast types', () => {
      showToast.show({
        type: 'network',
        text1: 'Custom',
      });

      expect(ToastLib.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network',
        })
      );
    });

    it('allows custom visibility time', () => {
      showToast.show({
        type: 'info',
        text1: 'Test',
        visibilityTime: 10000,
      });

      expect(ToastLib.show).toHaveBeenCalledWith(
        expect.objectContaining({
          visibilityTime: 10000,
        })
      );
    });
  });

  describe('showToast.hide', () => {
    it('calls ToastLib.hide', () => {
      showToast.hide();

      expect(ToastLib.hide).toHaveBeenCalled();
    });

    it('can be called multiple times', () => {
      showToast.hide();
      showToast.hide();
      showToast.hide();

      expect(ToastLib.hide).toHaveBeenCalledTimes(3);
    });
  });
});

// =============================================================================
// TOAST TYPES TESTS
// =============================================================================

describe('Toast Types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('all standard types are supported', () => {
    const types = ['success', 'error', 'info', 'warning', 'network'] as const;

    types.forEach((type) => {
      showToast.show({ type, text1: `Test ${type}` });
    });

    expect(ToastLib.show).toHaveBeenCalledTimes(5);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles empty string title', () => {
    showToast.success('');

    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        text1: '',
      })
    );
  });

  it('handles very long title', () => {
    const longTitle = 'A'.repeat(500);
    showToast.info(longTitle);

    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        text1: longTitle,
      })
    );
  });

  it('handles very long message', () => {
    const longMessage = 'B'.repeat(1000);
    showToast.error('Title', longMessage);

    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        text2: longMessage,
      })
    );
  });

  it('handles special characters in title', () => {
    const specialTitle = '<Title> & "Special" \'Chars\'';
    showToast.warning(specialTitle);

    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        text1: specialTitle,
      })
    );
  });

  it('handles unicode in messages', () => {
    showToast.success('Success', 'Data saved');

    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        text2: 'Data saved',
      })
    );
  });

  it('handles emojis in title', () => {
    showToast.info('Alert!');

    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        text1: 'Alert!',
      })
    );
  });

  it('handles rapid successive calls', () => {
    for (let i = 0; i < 10; i++) {
      showToast.info(`Toast ${i}`);
    }

    expect(ToastLib.show).toHaveBeenCalledTimes(10);
  });
});

// =============================================================================
// INTEGRATION SCENARIOS
// =============================================================================

describe('Integration Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows success then hides', () => {
    showToast.success('Saved');
    showToast.hide();

    expect(ToastLib.show).toHaveBeenCalledTimes(1);
    expect(ToastLib.hide).toHaveBeenCalledTimes(1);
  });

  it('shows multiple different types', () => {
    showToast.info('Loading...');
    showToast.success('Loaded!');

    expect(ToastLib.show).toHaveBeenCalledTimes(2);
    expect(ToastLib.show).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'info' }));
    expect(ToastLib.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'success' }));
  });

  it('error followed by success', () => {
    showToast.error('Failed');
    showToast.hide();
    showToast.success('Retry successful');

    expect(ToastLib.show).toHaveBeenCalledTimes(2);
    expect(ToastLib.hide).toHaveBeenCalledTimes(1);
  });

  it('network status updates', () => {
    showToast.network('Connecting...', 'Please wait');
    showToast.network('Connected', 'To 3 relays');

    expect(ToastLib.show).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// API STABILITY
// =============================================================================

describe('API Stability', () => {
  it('showToast object has all expected methods', () => {
    expect(showToast.success).toBeInstanceOf(Function);
    expect(showToast.error).toBeInstanceOf(Function);
    expect(showToast.info).toBeInstanceOf(Function);
    expect(showToast.warning).toBeInstanceOf(Function);
    expect(showToast.network).toBeInstanceOf(Function);
    expect(showToast.show).toBeInstanceOf(Function);
    expect(showToast.hide).toBeInstanceOf(Function);
  });

  it('ToastProvider is a valid React component', () => {
    expect(ToastProvider).toBeDefined();
    expect(() => render(<ToastProvider />)).not.toThrow();
  });

  it('useToastConfig is a valid hook', () => {
    expect(useToastConfig).toBeDefined();
    expect(useToastConfig).toBeInstanceOf(Function);
  });
});
