import {
  buildIncidentBackfillSubscriptionKey,
  buildIncidentBackfillWindows,
  createIncidentBackfillRuntime,
  resetIncidentBackfillRuntime,
} from '../../../hooks/incidentSubscription/backfillWindows';

describe('incident subscription backfill windows', () => {
  const now = 1_735_689_600;

  it('builds newest-first non-overlapping windows clipped to the selected range', () => {
    const windows = buildIncidentBackfillWindows({
      sinceDays: 7,
      nowUnixSeconds: now,
    });

    expect(windows.map((window) => window.key)).toEqual([
      '0d-1d',
      '1d-2d',
      '2d-3d',
      '3d-5d',
      '5d-7d',
    ]);
    expect(windows[0]).toEqual(
      expect.objectContaining({
        since: now - 86400,
        until: null,
        isLiveWindow: true,
      })
    );
    expect(windows[1]).toEqual(
      expect.objectContaining({
        since: now - 2 * 86400,
        until: now - 86400,
        isLiveWindow: false,
      })
    );
  });

  it('adds the selected range as the final boundary when it is not a preset', () => {
    const windows = buildIncidentBackfillWindows({
      sinceDays: 10,
      nowUnixSeconds: now,
    });

    expect(windows.map((window) => window.key)).toEqual([
      '0d-1d',
      '1d-2d',
      '2d-3d',
      '3d-5d',
      '5d-7d',
      '7d-10d',
    ]);
  });

  it('builds deterministic transient subscription keys', () => {
    const [liveWindow] = buildIncidentBackfillWindows({
      sinceDays: 1,
      nowUnixSeconds: now,
    });

    expect(
      buildIncidentBackfillSubscriptionKey({
        epoch: 3,
        groupKey: 'g:dr5reg|dr5ref',
        window: liveWindow,
      })
    ).toBe('backfill:3:0d-1d:g:dr5reg|dr5ref');
  });

  it('resets runtime guards so delayed continuations become stale', () => {
    const runtime = createIncidentBackfillRuntime();
    const windows = buildIncidentBackfillWindows({
      sinceDays: 3,
      nowUnixSeconds: now,
    });
    runtime.planKey = 'active-plan';
    runtime.windows = windows;
    runtime.nextWindowIndex = 2;
    runtime.activeWindowIndex = 1;
    runtime.stopReason = null;

    resetIncidentBackfillRuntime({
      runtime,
      planKey: 'unmount',
      windows: [],
      stopReason: 'unmount',
    });

    expect(runtime).toEqual(
      expect.objectContaining({
        epoch: 1,
        planKey: 'unmount',
        windows: [],
        nextWindowIndex: 1,
        activeWindowIndex: null,
        stopReason: 'unmount',
      })
    );
  });
});
