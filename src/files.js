import heic2any from 'heic2any';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
const VIDEO_EXTS = new Set(['mp4', 'mov']);
const HEIC_EXTS  = new Set(['heic', 'heif']);

function fileExt(name) {
  return name.split('.').pop().toLowerCase();
}

export function detectType(file) {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'photo';
  const e = fileExt(file.name);
  if (VIDEO_EXTS.has(e)) return 'video';
  if (IMAGE_EXTS.has(e)) return 'photo';
  return null;
}

async function orientNormalize(blob) {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  canvas.width  = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}

// Recursively collect File objects from a DataTransferEntry (file or directory).
export async function collectFromEntry(entry) {
  if (entry.isFile) {
    return [await new Promise((res, rej) => entry.file(res, rej))];
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const files  = [];
    let batch;
    do {
      batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      const nested = await Promise.all(batch.map(collectFromEntry));
      files.push(...nested.flat());
    } while (batch.length > 0);
    return files;
  }
  return [];
}

export async function processFiles(rawFiles, onProgress) {
  const records = [];
  const total   = rawFiles.length;

  for (let i = 0; i < total; i++) {
    const file = rawFiles[i];
    const mediaType = detectType(file);
    if (!mediaType) continue;

    let blob = file;

    if (mediaType === 'photo') {
      if (HEIC_EXTS.has(fileExt(file.name))) {
        const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        blob = Array.isArray(result) ? result[0] : result;
      }
      blob = await orientNormalize(blob);
    }

    records.push({
      id:   crypto.randomUUID(),
      name: file.name,
      type: mediaType,
      blob,
      url:  URL.createObjectURL(blob),
    });

    onProgress?.(i + 1, total);
  }

  return records;
}
