export function deriveConnectionState(connection) {
  if (connection.connected === true) {
    return true;
  }
  if (connection.connected === false) {
    return false;
  }
  return null;
}

export function renderConnectionStatus(connectionStatusEl, connectionLabelEl, connectionMetaEl, connection) {
  connectionStatusEl.classList.remove('status-online', 'status-offline', 'status-unknown');

  if (connection.connected === true) {
    connectionStatusEl.classList.add('status-online');
    connectionLabelEl.textContent = 'Connected';
    connectionMetaEl.textContent = `Connected in ${connection.latencyMs}ms`;
    connectionStatusEl.title = `${connection.mintName || 'Mint'} reachable`;
  } else if (connection.connected === false) {
    connectionStatusEl.classList.add('status-offline');
    connectionLabelEl.textContent = 'Disconnected';
    connectionMetaEl.textContent = connection.error || 'Mint unreachable';
    connectionStatusEl.title = connection.error || 'Mint unreachable';
  } else {
    connectionStatusEl.classList.add('status-unknown');
    connectionLabelEl.textContent = 'Checking...';
    connectionMetaEl.textContent = 'Status unknown';
    connectionStatusEl.title = 'Checking mint connection';
  }
}
