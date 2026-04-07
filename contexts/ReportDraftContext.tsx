import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { ReportIncidentType, ReportLocation, ReportSourceTab } from '@lib/navigation';

export type ReportDraft = {
  sourceTab?: ReportSourceTab;
  location: ReportLocation | null;
  incidentType: ReportIncidentType | null;
  description: string;
  locationNote: string;
};

export type ReportAdjustEntryMode = 'initial_required' | 'report_edit' | 'review_edit' | null;

type ReportDraftContextValue = {
  draft: ReportDraft;
  sessionKey: string | null;
  adjustEntryMode: ReportAdjustEntryMode;
  startDraft: (sessionKey: string, initial?: Partial<ReportDraft>) => void;
  updateDraft: (updates: Partial<ReportDraft>) => void;
  setAdjustEntryMode: (mode: ReportAdjustEntryMode) => void;
  resetDraft: () => void;
};

const EMPTY_REPORT_DRAFT: ReportDraft = {
  sourceTab: undefined,
  location: null,
  incidentType: null,
  description: '',
  locationNote: '',
};

const ReportDraftContext = createContext<ReportDraftContextValue | null>(null);

function normalizeDraft(initial?: Partial<ReportDraft>): ReportDraft {
  return {
    sourceTab: initial?.sourceTab,
    location: initial?.location ?? null,
    incidentType: initial?.incidentType ?? null,
    description: initial?.description ?? '',
    locationNote: initial?.locationNote ?? '',
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

  const updateDraft = useCallback((updates: Partial<ReportDraft>) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...updates,
      sourceTab: updates.sourceTab ?? currentDraft.sourceTab,
      location: updates.location !== undefined ? updates.location : currentDraft.location,
      incidentType: updates.incidentType !== undefined ? updates.incidentType : currentDraft.incidentType,
      description: updates.description ?? currentDraft.description,
      locationNote: updates.locationNote ?? currentDraft.locationNote,
    }));
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
