import type { NDKSubscription } from '@nostr-dev-kit/mobile';
import { type SubscriptionLifecycle } from './types';

export function createSubscriptionRegistry(): SubscriptionLifecycle {
  const subscriptions = new Map<string, NDKSubscription>();
  const eoseBySubscriptionKey = new Map<string, boolean>();

  const start = (key: string, subscription: NDKSubscription) => {
    subscriptions.set(key, subscription);
    eoseBySubscriptionKey.set(key, false);
  };

  const stop = (key: string) => {
    const subscription = subscriptions.get(key);
    if (subscription) {
      subscription.stop();
    }
    subscriptions.delete(key);
    eoseBySubscriptionKey.delete(key);
  };

  const stopAll = () => {
    for (const subscription of subscriptions.values()) {
      subscription.stop();
    }
    subscriptions.clear();
    eoseBySubscriptionKey.clear();
  };

  const setHasReceivedHistory = (key: string) => {
    eoseBySubscriptionKey.set(key, true);
  };

  const clear = () => {
    subscriptions.clear();
    eoseBySubscriptionKey.clear();
  };

  return {
    start,
    stop,
    stopAll,
    setHasReceivedHistory,
    clear,
    subscriptions,
    eoseBySubscriptionKey,
  };
}

