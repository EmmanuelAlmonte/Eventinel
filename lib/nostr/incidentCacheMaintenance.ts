import { NOSTR_KINDS } from './config';
import type { SQLiteBindValue } from 'expo-sqlite';

type SqliteLike = {
  getAllSync: <T = unknown>(query: string, params: SQLiteBindValue[]) => T[];
  runSync: (query: string, params: SQLiteBindValue[]) => unknown;
};

export type IncidentCacheDeleteTarget = {
  incidentId: string;
  pubkey?: string;
  eventId?: string;
};

export type IncidentCacheTrimResult = {
  removedStale: number;
  removedOverflow: number;
};

const INCIDENT_CACHE_DELETE_CHUNK_SIZE = 100;

function chunk<T>(values: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function deleteRowsByCacheIds(db: SqliteLike, cacheRowIds: readonly string[]): number {
  const uniqueIds = uniqueStrings(cacheRowIds);
  let removed = 0;

  for (const ids of chunk(uniqueIds, INCIDENT_CACHE_DELETE_CHUNK_SIZE)) {
    const placeholders = ids.map(() => '?').join(',');
    db.runSync(`DELETE FROM event_tags WHERE event_id IN (${placeholders});`, ids);
    db.runSync(`DELETE FROM events WHERE id IN (${placeholders});`, ids);
    removed += ids.length;
  }

  return removed;
}

function findCacheRowIdsForIncidentTargets(
  db: SqliteLike,
  targets: readonly IncidentCacheDeleteTarget[]
): string[] {
  const completeTargets = targets.filter(
    (target) => target.incidentId.trim().length > 0 && target.pubkey?.trim()
  );
  const idOnlyTargets = targets.filter(
    (target) => target.incidentId.trim().length > 0 && !target.pubkey?.trim()
  );
  const rowIds: string[] = [];

  for (const targetChunk of chunk(completeTargets, INCIDENT_CACHE_DELETE_CHUNK_SIZE)) {
    const clauses = targetChunk.map(() => '(e.pubkey = ? AND d.value = ?)').join(' OR ');
    const params = targetChunk.flatMap((target) => [
      target.pubkey!.trim(),
      target.incidentId.trim(),
    ]);
    const rows = db.getAllSync<{ id: string }>(
      `SELECT DISTINCT e.id FROM events e INNER JOIN event_tags d ON d.event_id = e.id WHERE e.kind = ? AND d.tag = 'd' AND (${clauses});`,
      [NOSTR_KINDS.INCIDENT, ...params]
    );
    rowIds.push(...rows.map((row) => row.id));
  }

  const idOnlyValues = uniqueStrings(idOnlyTargets.map((target) => target.incidentId));
  for (const incidentIds of chunk(idOnlyValues, INCIDENT_CACHE_DELETE_CHUNK_SIZE)) {
    const placeholders = incidentIds.map(() => '?').join(',');
    const rows = db.getAllSync<{ id: string }>(
      `SELECT DISTINCT e.id FROM events e INNER JOIN event_tags d ON d.event_id = e.id WHERE e.kind = ? AND d.tag = 'd' AND d.value IN (${placeholders});`,
      [NOSTR_KINDS.INCIDENT, ...incidentIds]
    );
    rowIds.push(...rows.map((row) => row.id));
  }

  const eventIds = uniqueStrings(
    targets.map((target) => target.eventId ?? '').filter(Boolean)
  );
  for (const ids of chunk(eventIds, INCIDENT_CACHE_DELETE_CHUNK_SIZE)) {
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.getAllSync<{ id: string }>(
      `SELECT id FROM events WHERE kind = ? AND id IN (${placeholders});`,
      [NOSTR_KINDS.INCIDENT, ...ids]
    );
    rowIds.push(...rows.map((row) => row.id));
  }

  return uniqueStrings(rowIds);
}

export function deleteIncidentEventsFromSqliteCache(
  db: SqliteLike,
  targets: readonly IncidentCacheDeleteTarget[]
): number {
  if (targets.length === 0) {
    return 0;
  }

  const rowIds = findCacheRowIdsForIncidentTargets(db, targets);
  return deleteRowsByCacheIds(db, rowIds);
}

export function trimIncidentEventsFromSqliteCache(
  db: SqliteLike,
  {
    maxRows,
    minCreatedAt,
  }: {
    maxRows: number;
    minCreatedAt: number;
  }
): IncidentCacheTrimResult {
  const staleRows = db.getAllSync<{ id: string }>(
    'SELECT id FROM events WHERE kind = ? AND created_at < ?;',
    [NOSTR_KINDS.INCIDENT, minCreatedAt]
  );
  const removedStale = deleteRowsByCacheIds(
    db,
    staleRows.map((row) => row.id)
  );

  const normalizedMaxRows = Math.max(0, Math.floor(maxRows));
  const overflowRows = db.getAllSync<{ id: string }>(
    'SELECT id FROM events WHERE kind = ? ORDER BY created_at DESC, id DESC LIMIT -1 OFFSET ?;',
    [NOSTR_KINDS.INCIDENT, normalizedMaxRows]
  );
  const removedOverflow = deleteRowsByCacheIds(
    db,
    overflowRows.map((row) => row.id)
  );

  return { removedStale, removedOverflow };
}
