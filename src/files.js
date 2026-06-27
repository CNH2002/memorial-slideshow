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

// Parse EXIF orientation tag from a JPEG ArrayBuffer. Returns 1–8 (1 = upright/no-op).
// Needed because createImageBitmap({ imageOrientation:'from-image' }) is ignored in Safari.
function readExifOrientation(buf) {
  const view = new DataView(buf);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return 1;
  let off = 2;
  while (off + 4 <= view.byteLength) {
    const marker = view.getUint16(off); off += 2;
    const segLen = view.getUint16(off);
    if (segLen < 2 || off + segLen > view.byteLength) break; // guard malformed segments
    if (marker === 0xFFE1 && view.getUint32(off + 2) === 0x45786966) { // "Exif"
      const t  = off + 8; // TIFF header starts after len(2) + "Exif"(4) + null(2)
      if (t + 8 > view.byteLength) break;
      const le  = view.getUint16(t) === 0x4949;
      const ifd = t + view.getUint32(t + 4, le);
      if (ifd + 2 > view.byteLength) break;
      const n   = view.getUint16(ifd, le);
      const max = Math.min(n, ((view.byteLength - (ifd + 2)) / 12) | 0);
      for (let i = 0; i < max; i++) {
        const e = ifd + 2 + i * 12;
        if (view.getUint16(e, le) === 0x0112) // Orientation tag
          return view.getUint16(e + 8, le);
      }
      break;
    }
    off += segLen;
  }
  return 1;
}

// Bake EXIF orientation into pixels via canvas transform. Works cross-browser (Safari ignores
// the imageOrientation option on createImageBitmap). Also strips EXIF from the output blob.
async function orientNormalize(blob) {
  const buf         = await blob.arrayBuffer();
  const orientation = readExifOrientation(buf);
  const bitmap      = await createImageBitmap(blob); // no imageOrientation — we apply it manually
  const W = bitmap.width, H = bitmap.height;
  const swap = orientation >= 5;
  const canvas = document.createElement('canvas');
  canvas.width  = swap ? H : W;
  canvas.height = swap ? W : H;
  const ctx = canvas.getContext('2d');
  try {
    // ctx.transform(a,b,c,d,e,f): x'=a·px+c·py+e  y'=b·px+d·py+f
    switch (orientation) {
      case 2: ctx.transform(-1,  0,  0,  1,  W, 0); break;
      case 3: ctx.transform(-1,  0,  0, -1,  W, H); break;
      case 4: ctx.transform( 1,  0,  0, -1,  0, H); break;
      case 5: ctx.transform( 0,  1,  1,  0,  0, 0); break;
      case 6: ctx.transform( 0,  1, -1,  0,  H, 0); break;
      case 7: ctx.transform( 0, -1, -1,  0,  H, W); break;
      case 8: ctx.transform( 0, -1,  1,  0,  0, W); break;
      default: break;
    }
    ctx.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas.toBlob failed')), 'image/jpeg', 0.92)
  );
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

    try {
      let blob = file;
      if (mediaType === 'photo') {
        if (HEIC_EXTS.has(fileExt(file.name))) {
          const r = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
          blob = Array.isArray(r) ? r[0] : r;
        }
      }
      results[i] = {
        id: crypto.randomUUID(), name: file.name, type: mediaType,
        blob, url: URL.createObjectURL(blob), rotation: 0, contentHash: hash,
      };
    } catch (err) {
      console.warn(`[import] skipped ${file.name}:`, err);
    }
    onProgress?.(++completed, total);
  }

  // 4 concurrent workers drain a shared index counter
  let idx = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (idx < total) await processOne(idx++);
  }));

  return results.filter(Boolean);
}
