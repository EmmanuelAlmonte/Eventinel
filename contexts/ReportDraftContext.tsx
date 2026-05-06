import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { BlossomUploadedMedia } from '@lib/media/blossomUpload';
import type { ReportIncidentType, ReportLocation, ReportSourceTab } from '@lib/navigation';

export type ReportMediaAttachmentKind = 'image' | 'video';

export type ReportMediaAttachment = {
  id: string;
  url: string;
  sha256?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  uploaded?: number;
  mediaKind: ReportMediaAttachmentKind;
  serverUrl?: string;
  endpoint?: '/upload' | '/media';
};

export type ReportDraft = {
  sourceTab?: ReportSourceTab;
  location: ReportLocation | null;
  incidentType: ReportIncidentType | null;
  description: string;
  locationNote: string;
  stillActive: boolean | null;
  mediaAttachments: ReportMediaAttachment[];
};

export type ReportAdjustEntryMode = 'initial_required' | 'report_edit' | 'review_edit' | null;

type ReportDraftContextValue = {
  draft: ReportDraft;
  sessionKey: string | null;
  adjustEntryMode: ReportAdjustEntryMode;
  startDraft: (sessionKey: string, initial?: Partial<ReportDraft>) => void;
  updateDraft: (updates: ReportDraftUpdate) => void;
  setAdjustEntryMode: (mode: ReportAdjustEntryMode) => void;
  resetDraft: () => void;
};

type ReportDraftUpdate = Partial<ReportDraft> | ((currentDraft: ReportDraft) => Partial<ReportDraft>);

const EMPTY_REPORT_DRAFT: ReportDraft = {
  sourceTab: undefined,
  location: null,
  incidentType: null,
  description: '',
  locationNote: '',
  stillActive: null,
  mediaAttachments: [],
};

const ReportDraftContext = createContext<ReportDraftContextValue | null>(null);

function normalizePositiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function inferReportMediaKind(mimeType?: string): ReportMediaAttachmentKind {
  return mimeType?.toLowerCase().startsWith('video/') ? 'video' : 'image';
}

function normalizeReportMediaAttachment(attachment: ReportMediaAttachment): ReportMediaAttachment | null {
  const url = normalizeString(attachment.url);
  if (!url) return null;

  const mimeType = normalizeString(attachment.mimeType)?.toLowerCase();
  const mediaKind =
    attachment.mediaKind === 'video' || attachment.mediaKind === 'image'
      ? attachment.mediaKind
      : inferReportMediaKind(mimeType);

  return {
    id: normalizeString(attachment.id) ?? normalizeString(attachment.sha256) ?? url,
    url,
    ...(normalizeString(attachment.sha256) ? { sha256: normalizeString(attachment.sha256) } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(normalizePositiveInteger(attachment.size) ? { size: normalizePositiveInteger(attachment.size) } : {}),
    ...(normalizePositiveInteger(attachment.width) ? { width: normalizePositiveInteger(attachment.width) } : {}),
    ...(normalizePositiveInteger(attachment.height) ? { height: normalizePositiveInteger(attachment.height) } : {}),
    ...(normalizePositiveInteger(attachment.duration) ? { duration: normalizePositiveInteger(attachment.duration) } : {}),
    ...(normalizePositiveInteger(attachment.uploaded) ? { uploaded: normalizePositiveInteger(attachment.uploaded) } : {}),
    mediaKind,
    ...(normalizeString(attachment.serverUrl) ? { serverUrl: normalizeString(attachment.serverUrl) } : {}),
    ...(attachment.endpoint === '/media' || attachment.endpoint === '/upload' ? { endpoint: attachment.endpoint } : {}),
  };
}

function normalizeReportMediaAttachments(attachments: readonly ReportMediaAttachment[] | undefined): ReportMediaAttachment[] {
  if (!attachments?.length) return [];

  const seen = new Set<string>();
  const normalized: ReportMediaAttachment[] = [];

  for (const attachment of attachments) {
    const nextAttachment = normalizeReportMediaAttachment(attachment);
    if (!nextAttachment) continue;
    const key = nextAttachment.sha256 ?? nextAttachment.url;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(nextAttachment);
  }

  return normalized;
}

function normalizeDraft(initial?: Partial<ReportDraft>): ReportDraft {
  return {
    sourceTab: initial?.sourceTab,
    location: initial?.location ?? null,
    incidentType: initial?.incidentType ?? null,
    description: initial?.description ?? '',
    locationNote: initial?.locationNote ?? '',
    stillActive: initial?.stillActive ?? null,
    mediaAttachments: normalizeReportMediaAttachments(initial?.mediaAttachments),
  };
}

export function reportMediaAttachmentFromBlossomUpload(uploadedMedia: BlossomUploadedMedia): ReportMediaAttachment {
  return {
    id: uploadedMedia.sha256 || uploadedMedia.url,
    url: uploadedMedia.url,
    sha256: uploadedMedia.sha256,
    mimeType: uploadedMedia.type,
    size: uploadedMedia.size,
    width: uploadedMedia.source.width,
    height: uploadedMedia.source.height,
    duration: uploadedMedia.source.duration,
    uploaded: uploadedMedia.uploaded,
    mediaKind: uploadedMedia.mediaKind,
    serverUrl: uploadedMedia.sourceServerUrl,
    endpoint: uploadedMedia.endpoint,
  };
}

export function ReportDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_REPORT_DRAFT);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [adjustEntryMode, setAdjustEntryMode] = useState<ReportAdjustEntryMode>(null);

  const startDraft = useCallback((nextSessionKey: string, initial?: Partial<ReportDraft>) => {
    setSessionKey((currentSessionKey) => {
      if (currentSessionKey !== nextSessionKey) {
        setDraft(normalizeDraft(initial));
        setAdjustEntryMode(null);
        return nextSessionKey;
      }

      return currentSessionKey;
    });
  }, []);

  const updateDraft = useCallback((updates: ReportDraftUpdate) => {
    setDraft((currentDraft) => {
      const resolvedUpdates = typeof updates === 'function' ? updates(currentDraft) : updates;

      return {
        ...currentDraft,
        ...resolvedUpdates,
        sourceTab: resolvedUpdates.sourceTab ?? currentDraft.sourceTab,
        location: resolvedUpdates.location !== undefined ? resolvedUpdates.location : currentDraft.location,
        incidentType:
          resolvedUpdates.incidentType !== undefined ? resolvedUpdates.incidentType : currentDraft.incidentType,
        description: resolvedUpdates.description ?? currentDraft.description,
        locationNote: resolvedUpdates.locationNote ?? currentDraft.locationNote,
        stillActive: resolvedUpdates.stillActive !== undefined ? resolvedUpdates.stillActive : currentDraft.stillActive,
        mediaAttachments:
          resolvedUpdates.mediaAttachments !== undefined
            ? normalizeReportMediaAttachments(resolvedUpdates.mediaAttachments)
            : currentDraft.mediaAttachments,
      };
    });
  }, []);

  const resetDraft = useCallback(() => {
    setSessionKey(null);
    setDraft(EMPTY_REPORT_DRAFT);
    setAdjustEntryMode(null);
  }, []);

  const value = useMemo(
    () => ({
      draft,
      sessionKey,
      adjustEntryMode,
      startDraft,
      updateDraft,
      setAdjustEntryMode,
      resetDraft,
    }),
    [adjustEntryMode, draft, resetDraft, sessionKey, startDraft, updateDraft]
  );

  return <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>;
}

export function useReportDraft(): ReportDraftContextValue {
  const context = useContext(ReportDraftContext);
  if (!context) {
    throw new Error('useReportDraft must be used within ReportDraftProvider');
  }

  return context;
}
