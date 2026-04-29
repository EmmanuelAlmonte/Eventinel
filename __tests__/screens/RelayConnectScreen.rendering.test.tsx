/**
 * RelayConnectScreen rendering tests.
 *
 * @jest-environment jsdom
 */

import {
  cleanupRelayConnectScreenTest,
  renderRelayConnectScreen,
  setupRelayConnectScreenTest,
} from './relayConnectScreenTestHarness';

describe('RelayConnectScreen rendering', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  it('renders the screen title', () => {
    const { getByText } = renderRelayConnectScreen();
    expect(getByText('Relays')).toBeTruthy();
  });

  it('renders relay count in subtitle', () => {
    const { getByText } = renderRelayConnectScreen();
    expect(getByText(/Connected 1 of 2/)).toBeTruthy();
  });

  it('renders connected count in subtitle', () => {
    const { getByText } = renderRelayConnectScreen();
    expect(getByText('Syncing')).toBeTruthy();
  });

  it('renders Add New Relay section', () => {
    const { getAllByText } = renderRelayConnectScreen();
    expect(getAllByText('Add relay').length).toBeGreaterThan(0);
  });

  it('renders Connected Relays section', () => {
    const { getByText } = renderRelayConnectScreen();
    expect(getByText('Your relays')).toBeTruthy();
  });

  it('renders info note about relay persistence', () => {
    const { getByText } = renderRelayConnectScreen();
    expect(getByText(/Relay choices stay on this device/)).toBeTruthy();
  });

  it('renders screen container with scroll', () => {
    const { getByTestId } = renderRelayConnectScreen();
    expect(getByTestId('screen-container-scroll')).toBeTruthy();
  });

  it('renders developer tools in dev mode', () => {
    const { getByText } = renderRelayConnectScreen();
    expect(getByText('Developer tools')).toBeTruthy();
  });
});
