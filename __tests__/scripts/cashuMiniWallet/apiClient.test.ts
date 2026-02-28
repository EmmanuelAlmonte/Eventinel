/**
 * @jest-environment jsdom
 */

import { request } from '../../../scripts/cashu/mini-wallet/apiClient.js';

const createResponse = (data: unknown, status = 200, ok = true) =>
  Promise.resolve({
    ok,
    status,
    json: async () => data,
    headers: new Headers(),
  }) as unknown as Response;

describe('cashu mini-wallet apiClient', () => {
  beforeEach(() => {
    (global as { fetch: typeof fetch }).fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      headers: new Headers(),
    }) as unknown as Response) as unknown as typeof fetch;
  });

  it('returns parsed payload for successful requests', async () => {
    (global as { fetch: typeof fetch }).fetch = jest.fn(async () => createResponse({ ok: true, value: 5 })) as unknown as typeof fetch;

    const result = await request('/api/echo', {
      method: 'POST',
      body: JSON.stringify({ value: 5 }),
    });

    expect(result).toEqual({ ok: true, value: 5 });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/echo');
    expect((global.fetch as jest.Mock).mock.calls[0][1]).toEqual({
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ value: 5 }),
    });
  });

  it('throws when the response is not ok', async () => {
    (global as { fetch: typeof fetch }).fetch = jest.fn(async () => createResponse({ error: 'bad request' }, 400, false)) as unknown as typeof fetch;

    await expect(request('/api/fail')).rejects.toThrow('bad request');
  });
});
