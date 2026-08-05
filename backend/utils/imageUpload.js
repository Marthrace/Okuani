const fs = require('fs');
const path = require('path');

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// Decodes a `data:image/xxx;base64,...` URI, validating MIME type and size.
// Throws with a message safe to surface to the client/sync logs.
function decodeDataUri(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') {
    throw new Error('imageBase64 is required');
  }
  const match = dataUri.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match || !MIME_EXT[match[1]]) {
    throw new Error('Unsupported image format');
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new Error('Image is too large (max 5MB)');
  }
  return { buffer, ext: MIME_EXT[match[1]] };
}

// Decodes + writes a data URI to uploadsDir, returning the public `/uploads/...` path.
function saveImageFile(uploadsDir, filenamePrefix, dataUri) {
  const { buffer, ext } = decodeDataUri(dataUri);
  // filenamePrefix is built from caller-controlled ids (e.g. a synced
  // listing's id) — strip anything but safe filename characters so a
  // crafted id like "/../../etc" can't escape uploadsDir via path.join.
  const safePrefix = String(filenamePrefix).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safePrefix}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

function deleteImageFile(uploadsDir, publicPath) {
  if (!publicPath) return;
  fs.unlink(path.join(uploadsDir, path.basename(publicPath)), () => {});
}

module.exports = { MAX_PHOTO_BYTES, MIME_EXT, decodeDataUri, saveImageFile, deleteImageFile };
