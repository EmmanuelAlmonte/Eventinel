/**
 * Time Formatting Utilities
 *
 * Pure functions for formatting timestamps as relative time.
 * No React imports - safe for use in lib/ directory.
 */

/**
 * Format a Date as relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future timestamps (clock skew, test data)
  if (diffMs < 0) return 'just now';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format milliseconds timestamp as relative time (e.g., "2h ago")
 * Convenience wrapper for use with occurredAtMs/createdAtMs
 */
export function formatRelativeTimeMs(ms: number): string {
  return formatRelativeTime(new Date(ms));
}

/**
 * Format seconds as human-readable age
 */
export function formatAge(seconds: number): string {
  if (seconds < 0) return 'just now';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
