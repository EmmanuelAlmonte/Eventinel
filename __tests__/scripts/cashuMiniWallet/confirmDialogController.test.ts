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
});
