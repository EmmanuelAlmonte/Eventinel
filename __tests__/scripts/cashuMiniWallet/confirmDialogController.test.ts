import { createConfirmDialogController } from '../../../scripts/cashu/mini-wallet/confirmDialogController';

describe('cashu mini-wallet confirmDialogController', () => {
  it('opens on request and resolves true when confirmed', async () => {
    const openCalls: boolean[] = [];
    const controller = createConfirmDialogController((isOpen: boolean) => {
      openCalls.push(isOpen);
    });

    const pending = controller.request();
    const resolved = controller.resolve(true);

    await expect(pending).resolves.toBe(true);
    expect(resolved).toBe(true);
    expect(openCalls).toEqual([true, false]);
  });

  it('resolves false when cancelled and ignores extra resolves', async () => {
    const openCalls: boolean[] = [];
    const controller = createConfirmDialogController((isOpen: boolean) => {
      openCalls.push(isOpen);
    });

    const pending = controller.request();
    const resolved = controller.resolve(false);
    const extraResolve = controller.resolve(true);

    await expect(pending).resolves.toBe(false);
    expect(resolved).toBe(true);
    expect(extraResolve).toBe(false);
    expect(openCalls).toEqual([true, false]);
  });

  it('returns the same pending promise when request is called twice before resolve', async () => {
    const openCalls: boolean[] = [];
    const controller = createConfirmDialogController((isOpen: boolean) => {
      openCalls.push(isOpen);
    });

    const firstPending = controller.request();
    const secondPending = controller.request();

    expect(secondPending).toBe(firstPending);
    expect(openCalls).toEqual([true]);

    const resolved = controller.resolve(true);
    expect(resolved).toBe(true);

    await expect(firstPending).resolves.toBe(true);
    await expect(secondPending).resolves.toBe(true);
    expect(openCalls).toEqual([true, false]);
  });

  it('returns false on double resolve after confirm and closes once', async () => {
    const openCalls: boolean[] = [];
    const controller = createConfirmDialogController((isOpen: boolean) => {
      openCalls.push(isOpen);
    });

    const pending = controller.request();
    const firstResolve = controller.resolve(true);
    const secondResolve = controller.resolve(true);

    expect(firstResolve).toBe(true);
    expect(secondResolve).toBe(false);
    await expect(pending).resolves.toBe(true);
    expect(openCalls).toEqual([true, false]);
  });
});
