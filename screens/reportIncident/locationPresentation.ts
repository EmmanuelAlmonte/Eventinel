import { useEffect, useMemo, useState } from 'react';
import * as ExpoLocation from 'expo-location';

import type { ReportLocation, ReportSourceTab } from '@lib/navigation';

export type LocationPresentation = {
  primary: string;
  secondary: string;
  note?: string | null;
  tertiary?: string | null;
};

const LOCATION_META_LOADING = 'Finding nearby place details…';
const locationResolutionCache = new Map<string, { placeLabel: string | null; contextLine: string | null }>();

function buildCacheKey(location?: ReportLocation | null): string | null {
  if (!location) {
    return null;
  }

  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
}

export function formatCoordinateLine(location?: ReportLocation | null) {
  if (!location) {
    return null;
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export function formatSourceContext(
  sourceTab?: ReportSourceTab,
  hasLocation?: boolean,
  missingLocationCopy = 'Move the map or enable location before continuing.'
) {
  if (sourceTab === 'Map') {
    return hasLocation ? 'Using current map area' : missingLocationCopy;
  }

  if (sourceTab === 'Incidents') {
    return hasLocation ? 'Using nearby incident context' : missingLocationCopy;
  }

  if (hasLocation) {
    return 'Using current location';
  }

  return missingLocationCopy;
}

export function formatBlockLabel(streetNumber?: string | null, street?: string | null) {
  if (!street) {
    return null;
  }

  if (!streetNumber) {
    return street;
  }

  const parsedStreetNumber = Number.parseInt(streetNumber, 10);
  if (!Number.isNaN(parsedStreetNumber) && parsedStreetNumber >= 100) {
    const blockBase = Math.floor(parsedStreetNumber / 100) * 100;
    return `${blockBase} block ${street}`;
  }

  return `${streetNumber} ${street}`;
}

export function buildContextLine(address?: ExpoLocation.LocationGeocodedAddress | null) {
  if (!address) {
    return null;
  }

  const parts = [address.district, address.city, address.region].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(', ');
  }

  return address.subregion ?? address.country ?? null;
}

export function buildLocationPresentation({
  sourceTab,
  location,
  locationNote,
  resolvedPlaceLabel,
  resolvedContextLine,
  isResolvingPlace,
  missingLocationCopy,
}: {
  sourceTab?: ReportSourceTab;
  location?: ReportLocation | null;
  locationNote?: string;
  resolvedPlaceLabel?: string | null;
  resolvedContextLine?: string | null;
  isResolvingPlace?: boolean;
  missingLocationCopy?: string;
}): LocationPresentation {
  const trimmedNote = locationNote?.trim();
  const coordinateLine = formatCoordinateLine(location);
  const fallbackMissingLocationCopy = missingLocationCopy ?? 'Move the map or enable location before continuing.';
  const primary =
    resolvedPlaceLabel ??
    trimmedNote ??
    (sourceTab === 'Map'
      ? 'Current map area'
      : sourceTab === 'Incidents'
        ? 'Nearby incident area'
        : location
          ? 'Current location'
          : 'Location unavailable');
  const secondary =
    resolvedContextLine ??
    (isResolvingPlace && location
      ? LOCATION_META_LOADING
      : formatSourceContext(sourceTab, Boolean(location), fallbackMissingLocationCopy));

  return {
    primary,
    secondary,
    note: resolvedPlaceLabel ? trimmedNote || null : null,
    tertiary: coordinateLine,
  };
}

export function useResolvedReportLocation(
  location: ReportLocation | null,
  options?: {
    debounceMs?: number;
  }
) {
  const debounceMs = options?.debounceMs ?? 0;
  const [resolvedPlaceLabel, setResolvedPlaceLabel] = useState<string | null>(null);
  const [resolvedContextLine, setResolvedContextLine] = useState<string | null>(null);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const cacheKey = useMemo(() => buildCacheKey(location), [location]);

  useEffect(() => {
    let isMounted = true;

    async function resolvePlaceLabel() {
      if (!location || !cacheKey) {
        setResolvedPlaceLabel(null);
        setResolvedContextLine(null);
        setIsResolvingPlace(false);
        return;
      }

      const cached = locationResolutionCache.get(cacheKey);
      if (cached) {
        setResolvedPlaceLabel(cached.placeLabel);
        setResolvedContextLine(cached.contextLine);
        setIsResolvingPlace(false);
        return;
      }

      setIsResolvingPlace(true);

      try {
        const [address] = await ExpoLocation.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        if (!isMounted) {
          return;
        }

        const nextResolvedPlaceLabel = formatBlockLabel(address?.streetNumber, address?.street);
        const nextResolvedContextLine = buildContextLine(address);

        locationResolutionCache.set(cacheKey, {
          placeLabel: nextResolvedPlaceLabel,
          contextLine: nextResolvedContextLine,
        });
        setResolvedPlaceLabel(nextResolvedPlaceLabel);
        setResolvedContextLine(nextResolvedContextLine);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.warn('[ReportLocation] Failed to resolve place label:', error);
        setResolvedPlaceLabel(null);
        setResolvedContextLine(null);
      } finally {
        if (isMounted) {
          setIsResolvingPlace(false);
        }
      }
    }

    const timerId = setTimeout(() => {
      void resolvePlaceLabel();
    }, debounceMs);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [cacheKey, debounceMs, location]);

  return {
    resolvedPlaceLabel,
    resolvedContextLine,
    isResolvingPlace,
  };
}
