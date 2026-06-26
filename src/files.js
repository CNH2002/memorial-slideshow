import heic2any from 'heic2any';
import { state } from './state.js';

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

async function fileHash(file) {
  const buf    = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
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
  const total      = rawFiles.length;
  let   completed  = 0;
  // Shared across workers — safe because JS is single-threaded: the sync
  // has()/add() pair between awaits cannot interleave with another worker.
  const seenHashes = new Set(state.files.map(f => f.contentHash).filter(Boolean));
  const results    = new Array(total).fill(null); // preserves drop order

  async function processOne(i) {
    const file = rawFiles[i];
    const mediaType = detectType(file);
    if (!mediaType) { onProgress?.(++completed, total); return; }

    const hash = await fileHash(file);
    if (seenHashes.has(hash)) {
      console.log(`[import] skip duplicate: ${file.name}`);
      onProgress?.(++completed, total);
      return;
    }
    seenHashes.add(hash);

    let blob = file;
    if (mediaType === 'photo') {
      if (HEIC_EXTS.has(fileExt(file.name))) {
        const r = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        blob = Array.isArray(r) ? r[0] : r;
      }
      blob = await orientNormalize(blob);
    }

    results[i] = {
      id: crypto.randomUUID(), name: file.name, type: mediaType,
      blob, url: URL.createObjectURL(blob), rotation: 0, contentHash: hash,
    };
    onProgress?.(++completed, total);
  }

  // 4 concurrent workers drain a shared index counter
  let idx = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (idx < total) await processOne(idx++);
  }));

  return results.filter(Boolean);
}
