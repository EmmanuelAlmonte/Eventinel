export function createConfirmDialogController(onOpenChange) {
  let resolver = null;

  return {
    request() {
      onOpenChange(true);
      return new Promise((resolve) => {
        resolver = resolve;
      });
    },
    resolve(confirmed) {
      if (!resolver) return false;
      const activeResolve = resolver;
      resolver = null;
      onOpenChange(false);
      activeResolve(confirmed);
      return true;
    },
  };
}
