/**
 * @eventinel/ui
 *
 * Pre-styled React Native Elements components with Eventinel branding.
 * All components follow the dark theme and use BRAND design tokens.
 *
 * @example
 * ```tsx
 * import { Button, Card, Input, Badge, Avatar, ScreenContainer } from '../components/ui';
 *
 * function MyScreen() {
 *   return (
 *     <ScreenContainer>
 *       <Card>
 *         <Text h3>Welcome</Text>
 *         <Input placeholder="Enter text..." />
 *         <Button title="Submit" />
 *       </Card>
 *     </ScreenContainer>
 *   );
 * }
 * ```
 */

// Re-export themed RNE components
export {
  Button,
  Text,
  Input,
  Icon,
  Avatar,
  Badge,
  Divider,
  Switch,
  SearchBar,
  Overlay,
  BottomSheet,
  Skeleton,
  LinearProgress,
  Dialog,
  FAB,
  SpeedDial,
  Tab,
  TabView,
  Tooltip,
  useTheme,
  useThemeMode,
  makeStyles,
} from '@rneui/themed';

// Export Card and ListItem with proper naming
export { Card, ListItem } from '@rneui/themed';

// Export custom Eventinel components
export { ScreenContainer } from './ScreenContainer';
export { StatusBadge, SeverityBadge, IncidentTypeBadge } from './StatusBadge';
export { IncidentCard, CompactIncidentCard } from './IncidentCard';
export { SectionHeader } from './SectionHeader';
export {
  EmptyState,
  NoIncidentsEmpty,
  NoRelaysEmpty,
  OfflineEmpty,
  ErrorEmpty,
} from './EmptyState';
export {
  LoadingScreen,
  ConnectingToRelays,
  LoadingIncidents,
  LoadingProfile,
  SigningIn,
  SkeletonCard,
  SkeletonList,
} from './LoadingScreen';

export { BRAND, PRIMARY, SEMANTIC, NEUTRAL } from '@lib/brand';
