describe('NDK non-production relay policy', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDev = (globalThis as any).__DEV__;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.dontMock('@nostr-dev-kit/mobile');
    process.env.NODE_ENV = originalNodeEnv;
    Object.defineProperty(globalThis, '__DEV__', {
      value: originalDev,
      writable: true,
      configurable: true,
    });
  });

  function loadNdkOptionsForEnv(nodeEnv: string, devFlag: boolean) {
    const constructorOptions: any[] = [];

    process.env.NODE_ENV = nodeEnv;
    Object.defineProperty(globalThis, '__DEV__', {
      value: devFlag,
      writable: true,
      configurable: true,
    });

    jest.useFakeTimers();
    jest.isolateModules(() => {
      jest.doMock('@nostr-dev-kit/mobile', () => {
        class MockNDK {
          pool = {
            on: jest.fn(),
            off: jest.fn(),
            relays: new Map(),
          };
          signer: unknown = null;
          relayAuthDefaultPolicy: unknown;
          connect = jest.fn().mockResolvedValue(undefined);
          addExplicitRelay = jest.fn();
          on = jest.fn();

          constructor(options: any = {}) {
            constructorOptions.push(options);
          }
        }

        class MockCacheAdapterSqlite {
          ndk: unknown;
          db = {
            getFirstSync: jest.fn().mockReturnValue({ count: 0 }),
          };

          initialize() {}

          query() {
            return [];
          }
        }

        return {
          __esModule: true,
          default: MockNDK,
          NDKCacheAdapterSqlite: MockCacheAdapterSqlite,
        };
      });

      require('../../lib/ndk');
    });
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    expect(constructorOptions).toHaveLength(1);
    return constructorOptions[0];
  }

  it('keeps outbox and auto-connect user relays disabled in development', () => {
    const options = loadNdkOptionsForEnv('development', true);

    expect(options.enableOutboxModel).toBe(false);
    expect(options.autoConnectUserRelays).toBe(false);
  });

  it('keeps outbox and auto-connect user relays disabled in test/non-production', () => {
    const options = loadNdkOptionsForEnv('test', false);

    expect(options.enableOutboxModel).toBe(false);
    expect(options.autoConnectUserRelays).toBe(false);
  });
});
