function parseOptionalBoolFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return defaultValue;
}

// Cashu remains a dev-only surface until the production rollout is complete.
const cashuFlagRequested = parseOptionalBoolFlag(process.env.EXPO_PUBLIC_ENABLE_CASHU_WALLET, true);
const lightningFlagRequested = parseOptionalBoolFlag(
  process.env.EXPO_PUBLIC_ENABLE_LIGHTNING_WALLET,
  true
);

export const isCashuWalletFeatureEnabled = __DEV__ && cashuFlagRequested;
export const isLightningWalletFeatureEnabled = __DEV__ && lightningFlagRequested;
