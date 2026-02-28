/**
 * @jest-environment jsdom
 */

import { deriveConnectionState, renderConnectionStatus } from '../../../scripts/cashu/mini-wallet/connectionStatus.js';

describe('cashu mini-wallet connectionStatus', () => {
  it('maps server connection payload to local state', () => {
    expect(deriveConnectionState({ connected: true })).toBe(true);
    expect(deriveConnectionState({ connected: false })).toBe(false);
    expect(deriveConnectionState({ connected: undefined })).toBeNull();
  });

  it('renders unknown/loading state with unknown classes and label', () => {
    const badge = document.createElement('div');
    const label = document.createElement('span');
    const meta = document.createElement('span');

    renderConnectionStatus(badge, label, meta, { connected: null });

    expect(badge.className).toContain('status-unknown');
    expect(label.textContent).toBe('Checking...');
    expect(meta.textContent).toBe('Status unknown');
  });

  it('renders offline/online states', () => {
    const badge = document.createElement('div');
    const label = document.createElement('span');
    const meta = document.createElement('span');
    renderConnectionStatus(badge, label, meta, { connected: true, latencyMs: 3, mintName: 'mint-name' });
    expect(badge.className).toContain('status-online');
    expect(label.textContent).toBe('Connected');
    expect(meta.textContent).toBe('Connected in 3ms');

    renderConnectionStatus(badge, label, meta, { connected: false, error: 'offline' });
    expect(badge.className).toContain('status-offline');
    expect(label.textContent).toBe('Disconnected');
    expect(meta.textContent).toBe('offline');
  });
});
