import { Image } from 'react-native';

import type { PickedMedia } from './pickMedia';

export type PickedMediaValidationError = {
  type: 'invalid-image';
  message: string;
};

export type PickedMediaValidationOutcome =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: PickedMediaValidationError;
    };

type GetImageSize = typeof Image.getSize;

export async function validatePickedMediaForUpload(
  media: PickedMedia,
  getImageSize: GetImageSize = Image.getSize
): Promise<PickedMediaValidationOutcome> {
  if (!isPickedImage(media)) return { ok: true };

  try {
    await decodeImageDimensions(media.uri, getImageSize);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: {
        type: 'invalid-image',
        message: 'Selected image could not be opened. Choose a different image file.',
      },
    };
  }
}

function isPickedImage(media: PickedMedia): boolean {
  if (media.type === 'image') return true;
  return typeof media.mimeType === 'string' && media.mimeType.trim().toLowerCase().startsWith('image/');
}

function decodeImageDimensions(uri: string, getImageSize: GetImageSize): Promise<void> {
  return new Promise((resolve, reject) => {
    getImageSize(
      uri,
      () => resolve(),
      (error) => reject(error)
    );
  });
}
