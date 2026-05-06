/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ReportIncidentScreen from '../../screens/ReportIncidentScreen';
import { buildReportDraft } from '../fixtures/report/buildReportDraft';
import { buildReportLocation, buildResolvedReportLocation } from '../fixtures/report/buildReportLocation';
import { pickMediaFromLibrary } from '../../lib/media/pickMedia';
import { validatePickedMediaForUpload } from '../../lib/media/validatePickedMedia';
import { uploadToBlossom } from '../../lib/media/blossomUpload';

const mockConstants = {
  expoConfig: {
    extra: {
      EVENTINEL_BLOSSOM_SERVERS: 'https://cdn.example.com',
    } as Record<string, unknown>,
  },
};

let mockDraft = buildReportDraft();
let mockResolvedReportLocation = buildResolvedReportLocation();
const mockStartDraft = jest.fn();
const mockUpdateDraft = jest.fn();
const mockResetDraft = jest.fn();
const mockSetAdjustEntryMode = jest.fn();

jest.mock('expo-constants', () => ({
  ...mockConstants,
  default: mockConstants,
}));

jest.mock('../../lib/media/pickMedia', () => ({
  pickMediaFromLibrary: jest.fn(),
}));

jest.mock('../../lib/media/validatePickedMedia', () => ({
  validatePickedMediaForUpload: jest.fn(),
}));

jest.mock('../../lib/media/blossomUpload', () => ({
  uploadToBlossom: jest.fn(),
}));

jest.mock('@contexts', () => ({
  useSharedLocation: () => ({
    location: [-75.05134, 40.03836],
  }),
  useReportDraft: () => ({
    draft: mockDraft,
    startDraft: mockStartDraft,
    updateDraft: mockUpdateDraft,
    resetDraft: mockResetDraft,
    setAdjustEntryMode: mockSetAdjustEntryMode,
  }),
}));

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      textMuted: '#9CA3AF',
      primary: '#2563eb',
      success: '#22c55e',
      warning: '#f59e0b',
      border: '#374151',
    },
    isDark: true,
  }),
}));

jest.mock('@lib/utils/reportLocationRadius', () => ({
  getReportRadiusState: () => ({
    isWithinRadius: true,
    message: 'Within half a mile of your current location.',
  }),
}));

jest.mock('./../../screens/reportIncident/locationPresentation', () => ({
  buildLocationPresentation: () => ({
    title: '3100 block Princeton Avenue',
    subtitle: 'Philadelphia, Pennsylvania',
    tertiary: 'LOCAL RELAY QA 1776709409',
  }),
  useResolvedReportLocation: () => mockResolvedReportLocation,
}));

jest.mock('./../../screens/reportIncident/ReportLocationPreview', () => ({
  ReportLocationPreview: () => {
    const ReactNative = require('react-native');
    return require('react').createElement(
      ReactNative.View,
      null,
      require('react').createElement(ReactNative.Text, null, 'Preview')
    );
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('@rneui/themed', () => ({
  Text: ({ children, style, ...props }: any) => {
    return require('react').createElement(require('react-native').Text, { style, ...props }, children);
  },
  Input: ({ placeholder, value, onChangeText, onBlur }: any) => {
    return require('react').createElement(require('react-native').TextInput, {
      accessibilityLabel: placeholder,
      placeholder,
      value,
      onChangeText,
      onBlur,
    });
  },
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    return require('react').createElement(require('react-native').Text, null, name);
  },
}));

function buildReportIncidentScreenProps() {
  return {
    navigation: {
      navigate: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    },
    route: {
      key: 'ReportIncident-key',
      name: 'ReportIncident',
      params: {
        sessionKey: 'session-1',
      },
    },
  } as any;
}

function buildUploadedMedia(overrides: Record<string, unknown> = {}) {
  const sha256 = 'a'.repeat(64);
  return {
    url: `https://cdn.example.com/${sha256}.jpg`,
    sha256,
    size: 12345,
    type: 'image/jpeg',
    uploaded: 1_714_000_000,
    server: {
      url: 'https://cdn.example.com',
      source: 'app-default',
    },
    sourceServerUrl: 'https://cdn.example.com',
    endpoint: '/upload',
    mediaKind: 'image',
    source: {
      uri: 'file:///picked/report.jpg',
      fileName: 'report.jpg',
      width: 640,
      height: 480,
    },
    descriptor: {
      url: `https://cdn.example.com/${sha256}.jpg`,
      sha256,
      size: 12345,
      type: 'image/jpeg',
      uploaded: 1_714_000_000,
    },
    ...overrides,
  };
}

describe('ReportIncidentScreen media upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConstants.expoConfig.extra = {
      EVENTINEL_BLOSSOM_SERVERS: 'https://cdn.example.com',
    };
    process.env.EVENTINEL_BLOSSOM_SERVERS = 'https://cdn.example.com';
    mockDraft = buildReportDraft({
      location: buildReportLocation(),
      mediaAttachments: [],
    });
    mockResolvedReportLocation = buildResolvedReportLocation();
    jest.mocked(validatePickedMediaForUpload).mockResolvedValue({ ok: true });
  });

  it('uploads picked media through Blossom and stores the report attachment in draft state', async () => {
    const pickedMedia = {
      uri: 'file:///picked/report.jpg',
      mimeType: 'image/jpeg',
      fileName: 'report.jpg',
      fileSize: 12345,
      width: 640,
      height: 480,
      type: 'image' as const,
    };
    let resolveUpload: (value: any) => void = () => undefined;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });

    jest.mocked(pickMediaFromLibrary).mockResolvedValue(pickedMedia);
    jest.mocked(uploadToBlossom).mockImplementation(async (params: any) => {
      params.onProgress?.({
        stage: 'uploading',
        attempt: 1,
        loadedBytes: 40,
        totalBytes: 100,
        fraction: 0.4,
      });
      return uploadPromise as any;
    });

    const screen = render(<ReportIncidentScreen {...buildReportIncidentScreenProps()} />);
    fireEvent.press(screen.getByLabelText('Add report media'));

    await waitFor(() => {
      expect(screen.getByText('Uploading media 40%')).toBeTruthy();
    });

    resolveUpload({
      ok: true,
      result: buildUploadedMedia(),
    });

    await waitFor(() => {
      expect(mockUpdateDraft).toHaveBeenCalledWith({
        mediaAttachments: [
          expect.objectContaining({
            id: 'a'.repeat(64),
            url: `https://cdn.example.com/${'a'.repeat(64)}.jpg`,
            sha256: 'a'.repeat(64),
            mimeType: 'image/jpeg',
            size: 12345,
            width: 640,
            height: 480,
            mediaKind: 'image',
          }),
        ],
      });
    });

    expect(uploadToBlossom).toHaveBeenCalledWith(
      expect.objectContaining({
        media: pickedMedia,
        capability: expect.objectContaining({
          status: 'ready',
          uploadServers: [{ url: 'https://cdn.example.com', source: 'app-default' }],
        }),
      })
    );
    expect(validatePickedMediaForUpload).toHaveBeenCalledWith(pickedMedia);
  });

  it('rejects corrupt picked images before Blossom upload', async () => {
    const pickedMedia = {
      uri: 'file:///picked/corrupt.png',
      mimeType: 'image/png',
      fileName: 'corrupt.png',
      fileSize: 70,
      type: 'image' as const,
    };

    jest.mocked(pickMediaFromLibrary).mockResolvedValue(pickedMedia);
    jest.mocked(validatePickedMediaForUpload).mockResolvedValue({
      ok: false,
      error: {
        type: 'invalid-image',
        message: 'Selected image could not be opened. Choose a different image file.',
      },
    });

    const screen = render(<ReportIncidentScreen {...buildReportIncidentScreenProps()} />);
    fireEvent.press(screen.getByLabelText('Add report media'));

    expect(await screen.findByText('Selected image could not be opened. Choose a different image file.')).toBeTruthy();
    expect(validatePickedMediaForUpload).toHaveBeenCalledWith(pickedMedia);
    expect(uploadToBlossom).not.toHaveBeenCalled();
    expect(mockUpdateDraft).not.toHaveBeenCalled();
  });

  it('blocks media selection when no Blossom server is configured', async () => {
    mockConstants.expoConfig.extra = {};
    delete process.env.EVENTINEL_BLOSSOM_SERVERS;

    const screen = render(<ReportIncidentScreen {...buildReportIncidentScreenProps()} />);
    fireEvent.press(screen.getByLabelText('Add report media'));

    expect(await screen.findByText('No Blossom upload server is configured for report media.')).toBeTruthy();
    expect(pickMediaFromLibrary).not.toHaveBeenCalled();
    expect(uploadToBlossom).not.toHaveBeenCalled();
  });

  it('shows upload validation errors without changing the draft', async () => {
    jest.mocked(pickMediaFromLibrary).mockResolvedValue({
      uri: 'file:///picked/report.mp4',
      mimeType: 'video/mp4',
      fileSize: 12345,
      type: 'video',
    });
    jest.mocked(uploadToBlossom).mockResolvedValue({
      ok: false,
      error: {
        type: 'validation',
        reason: 'video-disabled',
        message: 'Video upload is disabled until Blossom server capabilities allow it.',
        retryable: false,
      },
    } as any);

    const screen = render(<ReportIncidentScreen {...buildReportIncidentScreenProps()} />);
    fireEvent.press(screen.getByLabelText('Add report media'));

    expect(
      await screen.findByText('Video upload is disabled until Blossom server capabilities allow it.')
    ).toBeTruthy();
    expect(mockUpdateDraft).not.toHaveBeenCalled();
  });

  it('removes existing report media attachments from draft state', () => {
    mockDraft = buildReportDraft({
      mediaAttachments: [
        {
          id: 'attached-image',
          url: 'https://cdn.example.com/attached-image.jpg',
          sha256: 'b'.repeat(64),
          mimeType: 'image/jpeg',
          size: 12345,
          width: 640,
          height: 480,
          mediaKind: 'image',
        },
      ],
    });

    const screen = render(<ReportIncidentScreen {...buildReportIncidentScreenProps()} />);
    fireEvent.press(screen.getByLabelText('Remove image attachment'));

    expect(mockUpdateDraft).toHaveBeenCalledWith({
      mediaAttachments: [],
    });
  });
});
