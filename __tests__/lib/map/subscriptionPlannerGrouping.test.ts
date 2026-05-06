import {
  buildIncidentSubscriptionGroupKey,
  groupIncidentSubscriptionCells,
  isVisibleCellCoverageAcceptable,
  planIncidentCells,
  parseIncidentSubscriptionGroupKey,
  shouldReuseIncidentSubscriptionPlanForViewport,
  summarizeVisibleCellCoverage,
} from '../../../lib/map/subscriptionPlanner';

describe('incident subscription grouping', () => {
  it('chunks desired cells into deterministic grouped subscription keys', () => {
    const groups = groupIncidentSubscriptionCells(
      ['dr5reg', 'dr5ree', 'dr5ref', 'dr5ree', 'dr5reh'],
      2
    );

    expect(groups).toEqual([
      { key: 'dr5ree', cells: ['dr5ree'] },
      { key: 'g:dr5ref,dr5reg', cells: ['dr5ref', 'dr5reg'] },
      { key: 'dr5reh', cells: ['dr5reh'] },
    ]);
  });

  it('keeps unaffected stable buckets when a nearby cell is added', () => {
    const before = groupIncidentSubscriptionCells(
      ['dr5ree', 'dr5ref', 'dr5reg', 'dr5reh'],
      2
    );
    const after = groupIncidentSubscriptionCells(
      ['dr5red', 'dr5ree', 'dr5ref', 'dr5reg', 'dr5reh'],
      2
    );

    expect(before.map((group) => group.key)).toContain('g:dr5ref,dr5reg');
    expect(after.map((group) => group.key)).toContain('g:dr5ref,dr5reg');
  });

  it('keeps single-cell groups compatible with raw geohash keys', () => {
    expect(buildIncidentSubscriptionGroupKey(['dr5reg'])).toBe('dr5reg');
    expect(parseIncidentSubscriptionGroupKey('dr5reg')).toEqual(['dr5reg']);
  });

  it('parses grouped keys back to their raw cells', () => {
    expect(parseIncidentSubscriptionGroupKey('g:dr5ree,dr5ref,dr5reg')).toEqual([
      'dr5ree',
      'dr5ref',
      'dr5reg',
    ]);
  });
});

describe('incident subscription viewport planning', () => {
  const philadelphia = [-75.1652, 39.9526] as [number, number];

  it('uses viewport cells as visible intent when real bounds are available', () => {
    const plan = planIncidentCells({
      mode: 'viewport-ring',
      precision: 6,
      center: philadelphia,
      bounds: {
        ne: [-75.1452, 39.9726],
        sw: [-75.1852, 39.9326],
      },
      zoom: 14,
      maxCells: 200,
      prefetchRing: 0,
    });

    expect(plan.visibleCells.length).toBeGreaterThan(1);
    expect(plan.desiredCells).toEqual(expect.arrayContaining(plan.visibleCells));
    expect(plan.truncated).toBe(false);
  });

  it('falls back to the center grid before native map bounds are known', () => {
    const plan = planIncidentCells({
      mode: 'viewport-ring',
      precision: 6,
      center: philadelphia,
      bounds: {
        ne: philadelphia,
        sw: philadelphia,
      },
      zoom: 14,
      maxCells: 200,
      prefetchRing: 0,
    });

    expect(plan.visibleCells.length).toBeGreaterThan(1);
    expect(plan.key).toContain('radius:2');
  });

  it('summarizes visible-cell coverage for reuse decisions', () => {
    const coverage = summarizeVisibleCellCoverage(
      ['dr5ree', 'dr5ref', 'dr5reg', 'dr5reh'],
      ['dr5ree', 'dr5ref', 'dr5reg']
    );

    expect(coverage).toEqual({
      visibleCellCount: 4,
      desiredCellCount: 3,
      coveredVisibleCellCount: 3,
      missingVisibleCellCount: 1,
      coverageRatio: 0.75,
      isCovered: false,
    });
    expect(
      isVisibleCellCoverageAcceptable(coverage, {
        maxMissingCells: 1,
        minCoverageRatio: 0.7,
      })
    ).toBe(true);
  });

  it('reuses active coverage for small pans but not large zoom changes', () => {
    expect(
      shouldReuseIncidentSubscriptionPlanForViewport({
        activeDesiredCells: ['dr5ree', 'dr5ref', 'dr5reg', 'dr5reh'],
        nextVisibleCells: ['dr5ree', 'dr5ref', 'dr5reg'],
        previousZoom: 14,
        nextZoom: 14.2,
        maxMissingCells: 1,
        minCoverageRatio: 0.9,
        maxZoomDelta: 0.5,
      })
    ).toBe(true);

    expect(
      shouldReuseIncidentSubscriptionPlanForViewport({
        activeDesiredCells: ['dr5ree', 'dr5ref', 'dr5reg', 'dr5reh'],
        nextVisibleCells: ['dr5ree', 'dr5ref', 'dr5reg'],
        previousZoom: 14,
        nextZoom: 15,
        maxMissingCells: 1,
        minCoverageRatio: 0.9,
        maxZoomDelta: 0.5,
      })
    ).toBe(false);
  });
});
