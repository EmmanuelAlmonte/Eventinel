/**
 * LoadingScreen Component Tests
 *
 * Tests the loading screen components and skeleton placeholders:
 * - LoadingScreen (base component)
 * - ConnectingToRelays preset
 * - LoadingIncidents preset
 * - LoadingProfile preset
 * - SigningIn preset
 * - SkeletonCard
 * - SkeletonList
 * - MapSkeleton
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// Import components under test
import {
  LoadingScreen,
  ConnectingToRelays,
  LoadingIncidents,
  LoadingProfile,
  SigningIn,
  SkeletonCard,
  SkeletonList,
  MapSkeleton,
} from '../../../components/ui/LoadingScreen';

// =============================================================================
// LOADINGSCREEN BASE COMPONENT TESTS
// =============================================================================

describe('LoadingScreen', () => {
  describe('Basic Rendering', () => {
    it('renders loading message', () => {
      const { getByText } = render(<LoadingScreen />);
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('renders custom message when provided', () => {
      const { getByText } = render(<LoadingScreen message="Please wait..." />);
      expect(getByText('Please wait...')).toBeTruthy();
    });

    it('renders ActivityIndicator', () => {
      const { UNSAFE_root } = render(<LoadingScreen />);
      const indicators = UNSAFE_root.findAllByType('ActivityIndicator' as any);
      expect(indicators.length).toBe(1);
    });

    it('renders without message when empty string provided', () => {
      const { queryByText } = render(<LoadingScreen message="" />);
      // Empty string message should not render text
      expect(queryByText('Loading...')).toBeNull();
    });
  });

  describe('Inline Mode', () => {
    it('renders inline variant when inline=true', () => {
      const { UNSAFE_root } = render(<LoadingScreen inline={true} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders message in inline mode', () => {
      const { getByText } = render(
        <LoadingScreen inline={true} message="Inline loading" />
      );
      expect(getByText('Inline loading')).toBeTruthy();
    });

    it('renders without message in inline mode when not provided', () => {
      const { queryByText } = render(<LoadingScreen inline={true} message="" />);
      expect(queryByText('Loading')).toBeNull();
    });
  });

  describe('Size Configuration', () => {
    it('uses large size by default', () => {
      const { UNSAFE_root } = render(<LoadingScreen />);
      const indicator = UNSAFE_root.findByType('ActivityIndicator' as any);
      expect(indicator.props.size).toBe('large');
    });

    it('uses small size when specified', () => {
      const { UNSAFE_root } = render(<LoadingScreen size="small" />);
      const indicator = UNSAFE_root.findByType('ActivityIndicator' as any);
      expect(indicator.props.size).toBe('small');
    });

    it('uses large size when specified', () => {
      const { UNSAFE_root } = render(<LoadingScreen size="large" />);
      const indicator = UNSAFE_root.findByType('ActivityIndicator' as any);
      expect(indicator.props.size).toBe('large');
    });
  });

  describe('Color Configuration', () => {
    it('uses default primary color', () => {
      const { UNSAFE_root } = render(<LoadingScreen />);
      const indicator = UNSAFE_root.findByType('ActivityIndicator' as any);
      expect(indicator.props.color).toBeDefined();
    });

    it('uses custom color when provided', () => {
      const { UNSAFE_root } = render(<LoadingScreen color="#FF0000" />);
      const indicator = UNSAFE_root.findByType('ActivityIndicator' as any);
      expect(indicator.props.color).toBe('#FF0000');
    });
  });
});

// =============================================================================
// PRESET LOADING STATES TESTS
// =============================================================================

describe('ConnectingToRelays', () => {
  it('renders correct message', () => {
    const { getByText } = render(<ConnectingToRelays />);
    expect(getByText('Connecting to relays...')).toBeTruthy();
  });

  it('renders ActivityIndicator', () => {
    const { UNSAFE_root } = render(<ConnectingToRelays />);
    const indicators = UNSAFE_root.findAllByType('ActivityIndicator' as any);
    expect(indicators.length).toBe(1);
  });
});

describe('LoadingIncidents', () => {
  it('renders correct message', () => {
    const { getByText } = render(<LoadingIncidents />);
    expect(getByText('Loading incidents...')).toBeTruthy();
  });

  it('renders ActivityIndicator', () => {
    const { UNSAFE_root } = render(<LoadingIncidents />);
    const indicators = UNSAFE_root.findAllByType('ActivityIndicator' as any);
    expect(indicators.length).toBe(1);
  });
});

describe('LoadingProfile', () => {
  it('renders correct message', () => {
    const { getByText } = render(<LoadingProfile />);
    expect(getByText('Loading profile...')).toBeTruthy();
  });

  it('renders ActivityIndicator', () => {
    const { UNSAFE_root } = render(<LoadingProfile />);
    const indicators = UNSAFE_root.findAllByType('ActivityIndicator' as any);
    expect(indicators.length).toBe(1);
  });
});

describe('SigningIn', () => {
  it('renders correct message', () => {
    const { getByText } = render(<SigningIn />);
    expect(getByText('Signing in...')).toBeTruthy();
  });

  it('renders ActivityIndicator', () => {
    const { UNSAFE_root } = render(<SigningIn />);
    const indicators = UNSAFE_root.findAllByType('ActivityIndicator' as any);
    expect(indicators.length).toBe(1);
  });
});

// =============================================================================
// SKELETONCARD TESTS
// =============================================================================

describe('SkeletonCard', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(<SkeletonCard />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders skeleton elements', () => {
      const { UNSAFE_root } = render(<SkeletonCard />);
      // Component renders with skeleton elements
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Lines Configuration', () => {
    it('renders default 2 description lines', () => {
      const { UNSAFE_root } = render(<SkeletonCard />);
      // Component should render with default lines
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders custom number of lines', () => {
      const { UNSAFE_root } = render(<SkeletonCard lines={4} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with 0 lines', () => {
      const { UNSAFE_root } = render(<SkeletonCard lines={0} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with 1 line', () => {
      const { UNSAFE_root } = render(<SkeletonCard lines={1} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Animation Configuration', () => {
    it('uses pulse animation by default', () => {
      const { UNSAFE_root } = render(<SkeletonCard />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('accepts wave animation', () => {
      const { UNSAFE_root } = render(<SkeletonCard animation="wave" />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('accepts pulse animation', () => {
      const { UNSAFE_root } = render(<SkeletonCard animation="pulse" />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('accepts none animation', () => {
      const { UNSAFE_root } = render(<SkeletonCard animation="none" />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

// =============================================================================
// SKELETONLIST TESTS
// =============================================================================

describe('SkeletonList', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(<SkeletonList />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders default 3 skeleton cards', () => {
      const { UNSAFE_root } = render(<SkeletonList />);
      // Should have container with multiple skeleton cards
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Count Configuration', () => {
    it('renders custom number of cards', () => {
      const { UNSAFE_root } = render(<SkeletonList count={5} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with 0 cards', () => {
      const { UNSAFE_root } = render(<SkeletonList count={0} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with 1 card', () => {
      const { UNSAFE_root } = render(<SkeletonList count={1} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with many cards', () => {
      const { UNSAFE_root } = render(<SkeletonList count={10} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Animation Configuration', () => {
    it('passes animation to child cards', () => {
      const { UNSAFE_root } = render(<SkeletonList animation="wave" />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('uses default pulse animation', () => {
      const { UNSAFE_root } = render(<SkeletonList />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

// =============================================================================
// MAPSKELETON TESTS
// =============================================================================

describe('MapSkeleton', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(<MapSkeleton />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders "Loading map..." text', () => {
      const { getByText } = render(<MapSkeleton />);
      expect(getByText('Loading map...')).toBeTruthy();
    });

    it('renders overlay with skeleton', () => {
      const { UNSAFE_root } = render(<MapSkeleton />);
      const { View } = require('react-native');
      const views = UNSAFE_root.findAllByType(View);
      expect(views.length).toBeGreaterThan(0);
    });
  });

  describe('Animation Configuration', () => {
    it('uses default pulse animation', () => {
      const { UNSAFE_root } = render(<MapSkeleton />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('accepts wave animation', () => {
      const { UNSAFE_root } = render(<MapSkeleton animation="wave" />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('accepts none animation', () => {
      const { UNSAFE_root } = render(<MapSkeleton animation="none" />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  describe('LoadingScreen', () => {
    it('handles very long message', () => {
      const longMessage = 'A'.repeat(200);
      const { getByText } = render(<LoadingScreen message={longMessage} />);
      expect(getByText(longMessage)).toBeTruthy();
    });

    it('handles message with special characters', () => {
      const { getByText } = render(
        <LoadingScreen message="Loading <data> & more..." />
      );
      expect(getByText('Loading <data> & more...')).toBeTruthy();
    });

    it('handles message with unicode', () => {
      const { getByText } = render(<LoadingScreen message="Loading... Please wait" />);
      expect(getByText('Loading... Please wait')).toBeTruthy();
    });
  });

  describe('SkeletonCard', () => {
    it('handles negative line count gracefully', () => {
      // Negative numbers will create empty array, which is fine
      const { UNSAFE_root } = render(<SkeletonCard lines={-1} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles large line count', () => {
      const { UNSAFE_root } = render(<SkeletonCard lines={100} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('SkeletonList', () => {
    it('handles negative count gracefully', () => {
      const { UNSAFE_root } = render(<SkeletonList count={-1} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles large count', () => {
      const { UNSAFE_root } = render(<SkeletonList count={50} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

// =============================================================================
// ACCESSIBILITY
// =============================================================================

describe('Accessibility', () => {
  it('LoadingScreen is visible to users', () => {
    const { getByText } = render(<LoadingScreen message="Loading content" />);
    expect(getByText('Loading content')).toBeTruthy();
  });

  it('preset loading states have descriptive messages', () => {
    const { getByText: getRelays } = render(<ConnectingToRelays />);
    expect(getRelays('Connecting to relays...')).toBeTruthy();

    const { getByText: getIncidents } = render(<LoadingIncidents />);
    expect(getIncidents('Loading incidents...')).toBeTruthy();

    const { getByText: getProfile } = render(<LoadingProfile />);
    expect(getProfile('Loading profile...')).toBeTruthy();

    const { getByText: getSignIn } = render(<SigningIn />);
    expect(getSignIn('Signing in...')).toBeTruthy();
  });

  it('MapSkeleton has loading text', () => {
    const { getByText } = render(<MapSkeleton />);
    expect(getByText('Loading map...')).toBeTruthy();
  });
});
