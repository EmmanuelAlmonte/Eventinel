import { validatePickedMediaForUpload } from '@lib/media/validatePickedMedia';

describe('validatePickedMediaForUpload', () => {
  it('accepts images that can be decoded by React Native Image', async () => {
    const getImageSize = jest.fn((_uri, onSuccess) => {
      onSuccess(640, 480);
    });

    await expect(
      validatePickedMediaForUpload(
        {
          uri: 'file:///picked/report.png',
          mimeType: 'image/png',
          type: 'image',
        },
        getImageSize as any
      )
    ).resolves.toEqual({ ok: true });
    expect(getImageSize).toHaveBeenCalledWith('file:///picked/report.png', expect.any(Function), expect.any(Function));
  });

  it('rejects corrupt image files before upload', async () => {
    const getImageSize = jest.fn((_uri, _onSuccess, onFailure) => {
      onFailure(new Error('PNG CRC error'));
    });

    await expect(
      validatePickedMediaForUpload(
        {
          uri: 'file:///picked/corrupt.png',
          mimeType: 'image/png',
          fileSize: 70,
          type: 'image',
        },
        getImageSize as any
      )
    ).resolves.toEqual({
      ok: false,
      error: {
        type: 'invalid-image',
        message: 'Selected image could not be opened. Choose a different image file.',
      },
    });
  });

  it('does not image-decode videos', async () => {
    const getImageSize = jest.fn();

    await expect(
      validatePickedMediaForUpload(
        {
          uri: 'file:///picked/report.mp4',
          mimeType: 'video/mp4',
          type: 'video',
        },
        getImageSize as any
      )
    ).resolves.toEqual({ ok: true });
    expect(getImageSize).not.toHaveBeenCalled();
  });
});
