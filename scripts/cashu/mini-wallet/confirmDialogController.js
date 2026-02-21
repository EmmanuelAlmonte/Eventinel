export function createConfirmDialogController(onOpenChange) {
  let resolver = null;
  let pendingPromise = null;

  return {
    request() {
      if (pendingPromise) {
        return pendingPromise;
      }
      onOpenChange(true);
      pendingPromise = new Promise((resolve) => {
        resolver = resolve;
      });
      return pendingPromise;
    },
    resolve(confirmed) {
      if (!resolver) return false;
      const activeResolve = resolver;
      resolver = null;
      try {
        onOpenChange(false);
      } finally {
        try {
          activeResolve(confirmed);
        } finally {
          pendingPromise = null;
        }
      }
      return true;
    },
  };
}
