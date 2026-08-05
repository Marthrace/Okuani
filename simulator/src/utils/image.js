// Mirrors mobile/src/utils/imagePicker.js's size guard, adapted for a plain
// File from a browser <input type="file"> instead of expo-image-picker's asset.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB, matches backend/utils/imageUpload.js

export function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function estimateBase64Bytes(dataUri) {
  const commaIndex = dataUri.indexOf(',');
  const base64 = commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri;
  return Math.ceil(base64.length * 0.75);
}
