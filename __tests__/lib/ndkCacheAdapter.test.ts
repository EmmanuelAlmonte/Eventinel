/**
 * Regression test for NDKCacheAdapterSqlite tag query consistency.
 *
 * Ensures replaceable events store tag rows using the same referenceId
 * as the events table so tag-based cache queries work.
 */

import fs from 'fs';
import path from 'path';

describe('NDKCacheAdapterSqlite tag storage', () => {
  it('writes tag rows using referenceId in the patched adapter', () => {
    const adapterPath = path.resolve(
      __dirname,
      '../../node_modules/@nostr-dev-kit/mobile/dist/module/cache-adapter/sqlite/index.js'
    );
    const source = fs.readFileSync(adapterPath, 'utf8');

    expect(source).toContain('[referenceId, tag[0], tag[1]]');
    expect(source).not.toContain('[event.id, tag[0], tag[1]]');
  });
});
