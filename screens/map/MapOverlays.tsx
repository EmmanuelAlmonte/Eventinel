import { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import { Button, Icon } from '@rneui/themed';
import { Text } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@components/ui';
import type { ProcessedIncident } from '@hooks';
import { formatIncidentHistoryWindowChipLabel } from '@lib/incidentHistoryWindow';

import type { RelayBannerStatus } from './helpers';
import type { LocationPermissionStatus } from './useMapScreenState';
import { mapScreenStyles as styles } from './styles';

type ThemeColors = {
  border: string;
  primary: string;
  surface: string;
  text: string;
  textMuted: string;
};

type MapOverlaysProps = {
  colors: ThemeColors;
  insets: EdgeInsets;
  relayStatus: RelayBannerStatus;
  onRelaySettings: () => void;
  userLocation: [number, number] | null;
  isAnimating: boolean;
  onFlyToUser: () => void;
  visibleIncidents: ProcessedIncident[];
  hasReceivedHistory: boolean;
  historyWindowDays: number;
  historyWindowPresets: readonly number[];
  isHistoryWindowReady: boolean;
  activeDateRangeLabel: string;
  dateRangeStatusLabel: string;
  isDateRangeRefreshing: boolean;
  isLoadingLocation: boolean;
  isFocused: boolean;
  isViewportCoveredBySubscriptionGrid: boolean;
  locationSource: string | null;
  permission: LocationPermissionStatus;
  onSelectDateRange: (days: number) => void;
};

function RelayStatusBanner({
  relayStatus,
  colors,
  top,
  onRelaySettings,
}: {
  relayStatus: RelayBannerStatus;
  colors: ThemeColors;
  top: number;
  onRelaySettings: () => void;
}) {
  if (!relayStatus) {
    return null;
  }

  return (
    <View
      style={[
        styles.relayBanner,
        {
          top,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.relayBannerHeader}>
        <Icon name={relayStatus.icon} type="material" size={18} color={colors.textMuted} />
        <Text style={[styles.relayBannerTitle, { color: colors.text }]}>{relayStatus.title}</Text>
      </View>
      <Text style={[styles.relayBannerDescription, { color: colors.textMuted }]}>
        {relayStatus.description}
      </Text>
      <Button
        title={relayStatus.actionLabel}
        onPress={onRelaySettings}
        type="clear"
        containerStyle={styles.relayBannerActionContainer}
        titleStyle={[styles.relayBannerActionText, { color: colors.primary }]}
      />
    </View>
  );
}

function FlyToUserButton({
  colors,
  insets,
  onFlyToUser,
  isAnimating,
  userLocation,
}: {
  colors: ThemeColors;
  insets: EdgeInsets;
  userLocation: [number, number] | null;
  isAnimating: boolean;
  onFlyToUser: () => void;
}) {
  if (!userLocation) {
    return null;
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.flyToButton,
        { bottom: 100 + insets.bottom },
        pressed && styles.flyToButtonPressed,
      ]}
      disabled={isAnimating}
      onPress={onFlyToUser}
      accessibilityLabel="Fly to my location"
      accessibilityRole="button"
      accessibilityState={{ disabled: isAnimating }}
    >
      <Icon name="my-location" type="material" size={24} color="#FFFFFF" />
    </Pressable>
  );
}

function DevStatsOverlay({
  visibleIncidents,
  hasReceivedHistory,
  top,
}: {
  visibleIncidents: ProcessedIncident[];
  hasReceivedHistory: boolean;
  top: number;
}) {
  if (!__DEV__) {
    return null;
  }

  return (
    <View style={[styles.statsOverlay, { top }]}>
      <Text style={styles.statsText}>Incidents: {visibleIncidents.length}</Text>
      <Text style={styles.statsText}>EOSE: {hasReceivedHistory ? '✓' : '...'}</Text>
    </View>
  );
}

function LocationDebugOverlay({
  top,
  locationSource,
  permission,
  userLocation,
}: {
  top: number;
  locationSource: string | null;
  permission: LocationPermissionStatus;
  userLocation: [number, number] | null;
}) {
  if (!__DEV__) {
    return null;
  }

  return (
    <View style={[styles.locationDebugOverlay, { top }]}>
      <Text
        style={[
          styles.locationSourceText,
          locationSource === 'fresh' && styles.locationSourceFresh,
          locationSource === 'cached' && styles.locationSourceCached,
          locationSource === 'default' && styles.locationSourceDefault,
        ]}
      >
        📍 {locationSource?.toUpperCase() || 'NONE'}
      </Text>
      <Text style={styles.locationDebugText}>Perm: {permission ?? 'undetermined'}</Text>
      {userLocation ? (
        <Text style={styles.locationDebugText} numberOfLines={1}>
          {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
        </Text>
      ) : null}
    </View>
  );
}

function ViewportHint({
  insets,
  isLoadingLocation,
  isFocused,
  isViewportCoveredBySubscriptionGrid,
}: {
  insets: EdgeInsets;
  isLoadingLocation: boolean;
  isFocused: boolean;
  isViewportCoveredBySubscriptionGrid: boolean;
}) {
  if (isLoadingLocation || !isFocused || isViewportCoveredBySubscriptionGrid) {
    return null;
  }

  return (
    <View style={[styles.viewportHint, { bottom: 120 + insets.bottom }]}>
      <Text style={styles.viewportHintText}>Zoom in to load incidents for this area</Text>
    </View>
  );
}

function EmptyIncidentsState({
  insets,
  hasReceivedHistory,
  historyWindowDays,
  visibleIncidents,
  isLoadingLocation,
}: {
  insets: EdgeInsets;
  hasReceivedHistory: boolean;
  historyWindowDays: number;
  visibleIncidents: ProcessedIncident[];
  isLoadingLocation: boolean;
}) {
  if (isLoadingLocation || !hasReceivedHistory || visibleIncidents.length > 0) {
    return null;
  }

  return (
    <View style={[styles.emptyState, { bottom: 40 + insets.bottom }]}>
      <Text style={styles.emptyStateText}>No incidents found</Text>
      <Text style={styles.emptyStateSubtext}>
        Incidents from the last {historyWindowDays} days will appear here
      </Text>
    </View>
  );
}

function MapTopControls({
  colors,
  insets,
  historyWindowDays,
  historyWindowPresets,
  isHistoryWindowReady,
  activeDateRangeLabel,
  dateRangeStatusLabel,
  isDateRangeRefreshing,
  isDateRangeMenuOpen,
  onToggleDateRangeMenu,
  onCloseDateRangeMenu,
  onSelectDateRange,
  onLayout,
}: {
  colors: ThemeColors;
  insets: EdgeInsets;
  historyWindowDays: number;
  historyWindowPresets: readonly number[];
  isHistoryWindowReady: boolean;
  activeDateRangeLabel: string;
  dateRangeStatusLabel: string;
  isDateRangeRefreshing: boolean;
  isDateRangeMenuOpen: boolean;
  onToggleDateRangeMenu: () => void;
  onCloseDateRangeMenu: () => void;
  onSelectDateRange: (days: number) => void;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const pillLabel = isDateRangeRefreshing
    ? `Refreshing ${formatIncidentHistoryWindowChipLabel(historyWindowDays)}`
    : `Date Range ${formatIncidentHistoryWindowChipLabel(historyWindowDays)}`;

  return (
    <View
      style={[styles.topControlsContainer, { top: 12 + insets.top }]}
      onLayout={onLayout}
    >
      <View
        style={[
          styles.topControlSurface,
          styles.searchSurface,
          {
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            borderColor: 'rgba(148, 163, 184, 0.22)',
          },
        ]}
      >
        <SearchBar
          platform="default"
          placeholder="Search locations"
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={false}
          autoCorrect={false}
          autoCapitalize="none"
          lightTheme={false}
          round
          searchIcon={{ color: 'rgba(226, 232, 240, 0.8)', size: 18 }}
          clearIcon={{ color: 'rgba(226, 232, 240, 0.8)', size: 18 }}
          containerStyle={styles.searchBarContainer}
          inputContainerStyle={[
            styles.searchBarInputContainer,
            {
              backgroundColor: 'rgba(30, 41, 59, 0.82)',
              borderColor: 'rgba(148, 163, 184, 0.18)',
            },
          ]}
          inputStyle={styles.searchBarInput}
          placeholderTextColor="rgba(203, 213, 225, 0.72)"
        />
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={({ pressed }) => [
            styles.filterPill,
            isDateRangeMenuOpen && styles.filterPillOpen,
            isDateRangeRefreshing && styles.filterPillRefreshing,
            pressed && styles.filterPillPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open date range filter"
          accessibilityState={{
            disabled: !isHistoryWindowReady,
            expanded: isDateRangeMenuOpen,
          }}
          disabled={!isHistoryWindowReady}
          onPress={onToggleDateRangeMenu}
        >
          <Icon
            name="schedule"
            type="material"
            size={16}
            color={isDateRangeRefreshing ? colors.primary : '#E2E8F0'}
          />
          <Text
            style={[
              styles.filterPillText,
              isDateRangeRefreshing && styles.filterPillTextRefreshing,
            ]}
          >
            {pillLabel}
          </Text>
          <Icon
            name={isDateRangeMenuOpen ? 'expand-less' : 'expand-more'}
            type="material"
            size={18}
            color="#CBD5E1"
          />
        </Pressable>
      </View>

      {isDateRangeMenuOpen ? (
        <View style={styles.dateRangePopover}>
          <View style={styles.dateRangePopoverHeader}>
            <Text style={styles.dateRangePopoverTitle}>Date Range</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close date range options"
              onPress={onCloseDateRangeMenu}
              style={({ pressed }) => [styles.dateRangePopoverClose, pressed && styles.filterPillPressed]}
            >
              <Icon name="close" type="material" size={16} color="#CBD5E1" />
            </Pressable>
          </View>

          <Text style={styles.dateRangePopoverDescription}>
            This changes how much past incident history is loaded.
          </Text>

          <View style={styles.dateRangeChipRow}>
            {historyWindowPresets.map((days) => {
              const isActive = historyWindowDays === days;
              const isDisabled = !isHistoryWindowReady;

              return (
                <Pressable
                  key={days}
                  style={({ pressed }) => [
                    styles.dateRangeChip,
                    isActive && styles.dateRangeChipActive,
                    isDisabled && styles.dateRangeChipDisabled,
                    pressed && !isDisabled && styles.dateRangeChipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set date range to ${days} day${days === 1 ? '' : 's'}`}
                  accessibilityState={{ disabled: isDisabled, selected: isActive }}
                  disabled={isDisabled}
                  onPress={() => {
                    onSelectDateRange(days);
                    onCloseDateRangeMenu();
                  }}
                >
                  <Text
                    style={[
                      styles.dateRangeChipText,
                      isActive && styles.dateRangeChipTextActive,
                    ]}
                  >
                    {formatIncidentHistoryWindowChipLabel(days)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            style={[
              styles.dateRangePopoverStatusText,
              { color: isDateRangeRefreshing ? colors.primary : 'rgba(203, 213, 225, 0.74)' },
            ]}
          >
            {isDateRangeRefreshing
              ? dateRangeStatusLabel
              : `Current range: ${activeDateRangeLabel}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function MapOverlays({
  colors,
  insets,
  relayStatus,
  onRelaySettings,
  userLocation,
  isAnimating,
  onFlyToUser,
  visibleIncidents,
  hasReceivedHistory,
  historyWindowDays,
  historyWindowPresets,
  isHistoryWindowReady,
  activeDateRangeLabel,
  dateRangeStatusLabel,
  isDateRangeRefreshing,
  isLoadingLocation,
  isFocused,
  isViewportCoveredBySubscriptionGrid,
  locationSource,
  permission,
  onSelectDateRange,
}: MapOverlaysProps) {
  const [topControlsHeight, setTopControlsHeight] = useState(0);
  const [isDateRangeMenuOpen, setIsDateRangeMenuOpen] = useState(false);
  const overlayTopOffset =
    topControlsHeight > 0 ? 28 + insets.top + topControlsHeight : 20 + insets.top;

  return (
    <>
      {isDateRangeMenuOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close date range menu"
          onPress={() => setIsDateRangeMenuOpen(false)}
          style={styles.popoverBackdrop}
        />
      ) : null}
      <MapTopControls
        colors={colors}
        insets={insets}
        historyWindowDays={historyWindowDays}
        historyWindowPresets={historyWindowPresets}
        isHistoryWindowReady={isHistoryWindowReady}
        activeDateRangeLabel={activeDateRangeLabel}
        dateRangeStatusLabel={dateRangeStatusLabel}
        isDateRangeRefreshing={isDateRangeRefreshing}
        isDateRangeMenuOpen={isDateRangeMenuOpen}
        onToggleDateRangeMenu={() => setIsDateRangeMenuOpen((current) => !current)}
        onCloseDateRangeMenu={() => setIsDateRangeMenuOpen(false)}
        onSelectDateRange={onSelectDateRange}
        onLayout={(event) => setTopControlsHeight(event.nativeEvent.layout.height)}
      />
      <RelayStatusBanner
        relayStatus={relayStatus}
        colors={colors}
        top={overlayTopOffset}
        onRelaySettings={onRelaySettings}
      />
      <FlyToUserButton
        colors={colors}
        insets={insets}
        userLocation={userLocation}
        isAnimating={isAnimating}
        onFlyToUser={onFlyToUser}
      />
      <DevStatsOverlay
        visibleIncidents={visibleIncidents}
        hasReceivedHistory={hasReceivedHistory}
        top={overlayTopOffset}
      />
      <LocationDebugOverlay
        top={overlayTopOffset}
        locationSource={locationSource}
        permission={permission}
        userLocation={userLocation}
      />
      <ViewportHint
        insets={insets}
        isLoadingLocation={isLoadingLocation}
        isFocused={isFocused}
        isViewportCoveredBySubscriptionGrid={isViewportCoveredBySubscriptionGrid}
      />
      <EmptyIncidentsState
        insets={insets}
        hasReceivedHistory={hasReceivedHistory}
        historyWindowDays={historyWindowDays}
        visibleIncidents={visibleIncidents}
        isLoadingLocation={isLoadingLocation}
      />
    </>
  );
}
