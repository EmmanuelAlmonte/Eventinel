/**
 * @jest-environment jsdom
 */

import {
  deleteIncidentEventsFromSqliteCache,
  trimIncidentEventsFromSqliteCache,
} from '../../../lib/nostr/incidentCacheMaintenance';

class FakeSqliteDb {
  queries: Array<{ query: string; params?: unknown[] }> = [];
  deletes: Array<{ query: string; params?: unknown[] }> = [];

  getAllSync<T = unknown>(query: string, params?: unknown[]): T[] {
    this.queries.push({ query, params });

    if (query.includes('INNER JOIN event_tags')) {
      return [{ id: '30911:pubkey-a:incident-a' }] as T[];
    }

    if (query.includes('created_at <')) {
      return [{ id: 'stale-row' }] as T[];
    }

    if (query.includes('OFFSET')) {
      return [{ id: 'overflow-row' }] as T[];
    }

    return [] as T[];
  }

  runSync(query: string, params?: unknown[]): unknown {
    this.deletes.push({ query, params });
    return undefined;
  }
}

describe('incidentCacheMaintenance', () => {
  it('deletes kind 30911 cache rows by pubkey and d tag', () => {
    const db = new FakeSqliteDb();

    const removed = deleteIncidentEventsFromSqliteCache(db, [
      {
        incidentId: 'incident-a',
        pubkey: 'pubkey-a',
        eventId: 'event-a',
      },
    ]);

    expect(removed).toBe(1);
    expect(db.queries[0].query).toContain("d.tag = 'd'");
    expect(db.queries[0].params).toEqual([30911, 'pubkey-a', 'incident-a']);
    expect(db.deletes).toEqual([
      {
        query: 'DELETE FROM event_tags WHERE event_id IN (?);',
        params: ['30911:pubkey-a:incident-a'],
      },
      {
        query: 'DELETE FROM events WHERE id IN (?);',
        params: ['30911:pubkey-a:incident-a'],
      },
    ]);
  });

  it('trims stale and overflow kind 30911 cache rows', () => {
    const db = new FakeSqliteDb();

    const result = trimIncidentEventsFromSqliteCache(db, {
      maxRows: 1000,
      minCreatedAt: 1_776_000_000,
    });

    expect(result).toEqual({
      removedStale: 1,
      removedOverflow: 1,
    });
    expect(db.queries.some((entry) => entry.query.includes('created_at <'))).toBe(true);
    expect(db.queries.some((entry) => entry.query.includes('OFFSET'))).toBe(true);
    expect(db.deletes.map((entry) => entry.params?.[0])).toEqual([
      'stale-row',
      'stale-row',
      'overflow-row',
      'overflow-row',
    ]);
  });
});
