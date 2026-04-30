import {
  buildIncidentSubscriptionGroupKey,
  groupIncidentSubscriptionCells,
  parseIncidentSubscriptionGroupKey,
} from '../../../lib/map/subscriptionPlanner';

describe('incident subscription grouping', () => {
  it('chunks desired cells into deterministic grouped subscription keys', () => {
    const groups = groupIncidentSubscriptionCells(
      ['dr5reg', 'dr5ree', 'dr5ref', 'dr5ree', 'dr5reh'],
      2
    );

    expect(groups).toEqual([
      { key: 'g:dr5ree,dr5ref', cells: ['dr5ree', 'dr5ref'] },
      { key: 'g:dr5reg,dr5reh', cells: ['dr5reg', 'dr5reh'] },
    ]);
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
