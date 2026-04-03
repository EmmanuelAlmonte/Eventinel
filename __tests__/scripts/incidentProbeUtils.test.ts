/**
 * incident-probe-utils Tests
 *
 * Covers inline CLI parsing for relay URLs with additional '=' characters.
 */

const { parseArgs, getRelayUrls } = require('../../scripts/incident-probe-utils.js');

describe('incident-probe-utils', () => {
  it('preserves inline flag values containing additional "=" characters', () => {
    const relay =
      'wss://relay.example.com/path?token=abc=def&sig=ghi=jkl';

    const args = parseArgs([`--relay=${relay}`]);

    expect(getRelayUrls(args)).toEqual([relay]);
  });
});
