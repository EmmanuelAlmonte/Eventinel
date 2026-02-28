import * as ImagePicker from 'expo-image-picker';

export type PickedMedia = {
  uri: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  type?: 'image' | 'video' | 'livePhoto' | 'pairedVideo';
};

export async function pickMediaFromLibrary(): Promise<PickedMedia | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Media library permission denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsMultipleSelection: false,
    quality: 1,
    exif: false,
  });

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? undefined,
    fileName: asset.fileName ?? undefined,
    fileSize: asset.fileSize ?? undefined,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    duration: asset.duration ?? undefined,
    type: (asset.type as any) ?? undefined,
  };
}
