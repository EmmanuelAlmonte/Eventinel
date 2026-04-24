import { buildFlags } from '@lib/buildFlags';

export function automationTestID(id: string): string | undefined {
  return buildFlags.enableAutomationTestIDs ? id : undefined;
}
