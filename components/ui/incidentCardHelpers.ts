import { SEVERITY_COLORS } from '@lib/brand/colors';

import type { IncidentLocation } from './incidentCardTypes';

const incidentTypeConfig: Record<string, { emoji: string; color: string }> = {
  fire: { emoji: '🔥', color: '#DC2626' },
  medical: { emoji: '🚑', color: '#EF4444' },
  crime: { emoji: '🚨', color: '#7C2D12' },
  traffic: { emoji: '🚗', color: '#F59E0B' },
  weather: { emoji: '⛈️', color: '#3B82F6' },
  hazmat: { emoji: '☢️', color: '#A855F7' },
  missing: { emoji: '🔍', color: '#EC4899' },
  robbery: { emoji: '💰', color: '#B91C1C' },
  assault: { emoji: '⚠️', color: '#DC2626' },
  burglary: { emoji: '🏠', color: '#92400E' },
  shooting: { emoji: '🔫', color: '#7F1D1D' },
  other: { emoji: '📢', color: '#71717A' },
};

export function getTypeConfig(type: string) {
  const normalized = type.toLowerCase().replace(/[_-]/g, '');
  return incidentTypeConfig[normalized] ?? incidentTypeConfig.other;
}

export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString();
}

export function formatLocation(location: IncidentLocation): string {
  if (location.address) {
    return location.address;
  }
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

export function getSeverityColor(severity: number): string {
  const colors: Record<number, string> = {
    1: SEVERITY_COLORS.info,
    2: SEVERITY_COLORS.low,
    3: SEVERITY_COLORS.medium,
    4: SEVERITY_COLORS.high,
    5: SEVERITY_COLORS.critical,
  };
  return colors[severity] ?? SEVERITY_COLORS.info;
}
