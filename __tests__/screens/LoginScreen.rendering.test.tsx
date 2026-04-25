/**
 * LoginScreen rendering and platform-specific behavior.
 *
 * @jest-environment jsdom
 */

import {
  PRIVATE_KEY_BUTTON,
  PRIVATE_KEY_PLACEHOLDER,
  RELAY_PLACEHOLDER,
  REMOTE_SIGNER_BUTTON,
  REMOTE_SIGNER_PLACEHOLDER,
  renderLoginScreen,
  resetLoginScreenMocks,
  selectLoginMethod,
  setAndroidSignerAvailable,
  setIOSWithoutSigner,
} from './loginScreenTestHarness';

describe('LoginScreen rendering', () => {
  beforeEach(resetLoginScreenMocks);

  it('renders the sign in title and subtitle', () => {
    const { getByText } = renderLoginScreen();

    expect(getByText('Sign in to Eventinel')).toBeTruthy();
    expect(getByText('Choose how you want to sign in. You can switch methods anytime.')).toBeTruthy();
  });

  it('renders method tabs and help text', () => {
    const { getAllByText, getByText } = renderLoginScreen();

    expect(getAllByText('Signer app').length).toBeGreaterThan(0);
    expect(getByText('Nostr Connect')).toBeTruthy();
    expect(getByText('Private key')).toBeTruthy();
    expect(getByText('Need help choosing?')).toBeTruthy();
  });

  it('renders remote signer content by default', () => {
    const { getByText, getByPlaceholderText } = renderLoginScreen();

    expect(getByText('Use a bunker URI or NIP-05 to connect a signer securely.')).toBeTruthy();
    expect(getByPlaceholderText(REMOTE_SIGNER_PLACEHOLDER)).toBeTruthy();
    expect(getByText(REMOTE_SIGNER_BUTTON)).toBeTruthy();
  });

  it('renders nostr connect section after selecting that method', () => {
    const screen = renderLoginScreen();

    selectLoginMethod(screen, 'Nostr Connect');

    expect(screen.getByText('Connect using a URI')).toBeTruthy();
    expect(screen.getByPlaceholderText(RELAY_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByText('Generate Nostr Connect')).toBeTruthy();
  });

  it('renders manual key login section after selecting that method', () => {
    const screen = renderLoginScreen();

    selectLoginMethod(screen, 'Private key');

    expect(screen.getByText('Use carefully')).toBeTruthy();
    expect(screen.getByText(/Never paste a private key/)).toBeTruthy();
    expect(screen.getByPlaceholderText(PRIVATE_KEY_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByText(PRIVATE_KEY_BUTTON)).toBeTruthy();
  });

  it('shows NIP-55 section on Android when signer apps are available', () => {
    setAndroidSignerAvailable();

    const { getByText } = renderLoginScreen();

    expect(getByText('Installed signer apps')).toBeTruthy();
    expect(getByText('Recommended')).toBeTruthy();
    expect(getByText('Amber')).toBeTruthy();
  });

  it('shows signer-app helper text on Android', () => {
    setAndroidSignerAvailable();

    const { getByText } = renderLoginScreen();

    expect(getByText(/You can use an installed signer directly/)).toBeTruthy();
  });

  it('does not show NIP-55 section on iOS', () => {
    setIOSWithoutSigner();

    const { queryByText } = renderLoginScreen();

    expect(queryByText('Installed signer apps')).toBeNull();
  });

  it('keeps signer method recommended on iOS', () => {
    setIOSWithoutSigner();

    const { getAllByText, getByText } = renderLoginScreen();

    expect(getAllByText('Signer app').length).toBeGreaterThan(0);
    expect(getByText('Recommended')).toBeTruthy();
  });
});
