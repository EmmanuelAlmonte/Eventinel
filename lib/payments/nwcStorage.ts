import * as SecureStore from 'expo-secure-store';

const NWC_PAIRING_CODE_KEY = '@eventinel/nwcPairingCode';

export async function saveNwcPairingCode(pairingCode: string): Promise<void> {
  // Pairing code contains the NWC secret; store in SecureStore (not AsyncStorage).
  await SecureStore.setItemAsync(NWC_PAIRING_CODE_KEY, pairingCode);
}

export async function loadNwcPairingCode(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(NWC_PAIRING_CODE_KEY);
  } catch (error) {
    console.warn('[NWC] Failed to load pairing code from SecureStore:', error);
    return null;
  }
}

export async function clearNwcPairingCode(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(NWC_PAIRING_CODE_KEY);
  } catch (error) {
    console.warn('[NWC] Failed to clear pairing code from SecureStore:', error);
  }
}

