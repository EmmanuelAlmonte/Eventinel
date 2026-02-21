import { useCallback, useMemo, useState } from 'react';
import { NDKEvent, useNDK } from '@nostr-dev-kit/mobile';

import { isConnected } from '../../lib/relay/status';

type ComposeColors = {
  error: string;
  success: string;
};

export function useQuickCompose(colors: ComposeColors) {
  const { ndk } = useNDK();
  const [noteContent, setNoteContent] = useState('');
  const [sendStatus, setSendStatus] = useState('');

  const handleSendNote = useCallback(async () => {
    if (!ndk) {
      setSendStatus('NDK not initialized');
      return;
    }

    const trimmed = noteContent.trim();
    if (!trimmed) {
      setSendStatus('Please enter a note');
      return;
    }

    const poolRelays = Array.from(ndk.pool.relays.values());
    const connectedRelays = poolRelays.filter((relay) => isConnected(relay.status));
    const connectedCount = connectedRelays.length;

    console.log('📝 [Note] User sending note, content length:', trimmed.length);
    console.log('🔌 [Note] Connected relays:', connectedCount, connectedRelays.map((relay) => relay.url));

    if (connectedCount === 0) {
      console.warn('⚠️ [Note] No connected relays, cannot publish');
      setSendStatus('Please connect to at least one relay first');
      setTimeout(() => setSendStatus(''), 3000);
      return;
    }

    try {
      const event = new NDKEvent(ndk);
      event.kind = 1;
      event.content = trimmed;
      console.log('📤 [Note] Publishing note to', connectedCount, 'relay(s)...');
      event.publish();

      console.log('✅ [Note] Note published');
      setSendStatus('Note published!');
      setNoteContent('');
      setTimeout(() => setSendStatus(''), 3000);
    } catch (error) {
      console.error('❌ [Note] Failed to send:', error);
      setSendStatus(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setSendStatus(''), 5000);
    }
  }, [ndk, noteContent]);

  const isError = useMemo(
    () => sendStatus.includes('Failed') || sendStatus.includes('Please'),
    [sendStatus]
  );
  const statusColor = isError ? colors.error : colors.success;

  return {
    noteContent,
    setNoteContent,
    sendStatus,
    isError,
    statusColor,
    handleSendNote,
  };
}
