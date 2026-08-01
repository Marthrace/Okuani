import * as ImagePicker from 'expo-image-picker';

// Mirrors the backend's MAX_PHOTO_BYTES (backend/utils/imageUpload.js) so
// oversized images are rejected at pick-time instead of waiting for a much
// later sync attempt to fail.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function estimateBase64Bytes(dataUri) {
  const commaIndex = dataUri.indexOf(',');
  const base64 = commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri;
  return Math.ceil(base64.length * 0.75);
}

// Shared Take Photo / Upload Photo flow used by the ID photo screen and the
// seller product form. Returns { dataUri, mime } or null on cancel/denied.
export async function pickImageAsync({ source, aspect, quality = 0.6 } = {}) {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return { error: 'permission-denied' };
  }

  const options = {
    mediaTypes: ['images'],
    base64: true,
    quality,
    allowsEditing: !!aspect,
    aspect,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled) return null;

  const asset = result.assets[0];
  const mime = asset.mimeType || 'image/jpeg';
  const dataUri = `data:${mime};base64,${asset.base64}`;

  if (estimateBase64Bytes(dataUri) > MAX_PHOTO_BYTES) {
    return { error: 'too-large' };
  }

  return { dataUri, mime };
}
