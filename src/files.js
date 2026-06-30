import heic2any from 'heic2any';
import { state } from './state.js';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
const VIDEO_EXTS = new Set(['mp4', 'mov']);
const HEIC_EXTS = new Set(['heic', 'heif']);

// 4K bounding box — prevents browser OOM on 48MP HEIC/RAW imports
const MAX_DIM = 3840;

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
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let off = 2;
  while (off + 4 <= view.byteLength) {
    const marker = view.getUint16(off);
    off += 2;
    const segLen = view.getUint16(off);
    if (segLen < 2 || off + segLen > view.byteLength) break; // guard malformed segments
    if (marker === 0xffe1 && view.getUint32(off + 2) === 0x45786966) {
      // "Exif"
      const t = off + 8; // TIFF header starts after len(2) + "Exif"(4) + null(2)
      if (t + 8 > view.byteLength) break;
      const le = view.getUint16(t) === 0x4949;
      const ifd = t + view.getUint32(t + 4, le);
      if (ifd + 2 > view.byteLength) break;
      const n = view.getUint16(ifd, le);
      const max = Math.min(n, ((view.byteLength - (ifd + 2)) / 12) | 0);
      for (let i = 0; i < max; i++) {
        const e = ifd + 2 + i * 12;
        if (view.getUint16(e, le) === 0x0112)
          // Orientation tag
          return view.getUint16(e + 8, le);
      }
      break;
    }
    off += segLen;
  }
  return 1;
}

// Bake EXIF orientation into pixels and downscale to MAX_DIM bounding box.
// Returns { blob: JPEG Blob, width: number, height: number } — the final output dimensions.
// Using canvas strips EXIF and works cross-browser (Safari ignores imageOrientation on createImageBitmap).
async function _orientNormalize(blob) {
  const buf = await blob.arrayBuffer();
  const orientation = readExifOrientation(buf);
  const bitmap = await createImageBitmap(blob); // no imageOrientation — we apply it manually
  const W = bitmap.width,
    H = bitmap.height;

  // Scale down to 4K bounding box; never upscale
  const maxDim = Math.max(W, H);
  const scale = maxDim > MAX_DIM ? MAX_DIM / maxDim : 1;
  const dW = Math.round(W * scale);
  const dH = Math.round(H * scale);

  // Fast path: already upright and within 4K — CSS image-orientation handles EXIF display,
  // so no canvas re-encode needed. Saves 200–600 ms per image on typical phone photos.
  if (orientation === 1 && scale === 1) {
    bitmap.close();
    return { blob, width: W, height: H };
  }

  const swap = orientation >= 5;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? dH : dW;
  canvas.height = swap ? dW : dH;
  const ctx = canvas.getContext('2d');
  try {
    // ctx.transform(a,b,c,d,e,f): x'=a·px+c·py+e  y'=b·px+d·py+f
    // Offsets use dW/dH (scaled) instead of W/H to match the scaled drawImage below.
    switch (orientation) {
      case 2:
        ctx.transform(-1, 0, 0, 1, dW, 0);
        break;
      case 3:
        ctx.transform(-1, 0, 0, -1, dW, dH);
        break;
      case 4:
        ctx.transform(1, 0, 0, -1, 0, dH);
        break;
      case 5:
        ctx.transform(0, 1, 1, 0, 0, 0);
        break;
      case 6:
        ctx.transform(0, 1, -1, 0, dH, 0);
        break;
      case 7:
        ctx.transform(0, -1, -1, 0, dH, dW);
        break;
      case 8:
        ctx.transform(0, -1, 1, 0, 0, dW);
        break;
      default:
        break;
    }
    ctx.drawImage(bitmap, 0, 0, dW, dH);
  } finally {
    bitmap.close();
  }

  const finalW = canvas.width;
  const finalH = canvas.height;

  const resultBlob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))),
      'image/jpeg',
      0.92
    )
  );
  return { blob: resultBlob, width: finalW, height: finalH };
}

function bufHash(buf) {
  return crypto.subtle.digest('SHA-256', buf).then((d) =>
    Array.from(new Uint8Array(d))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

// Recursively collect File objects from a DataTransferEntry (file or directory).
export async function collectFromEntry(entry) {
  if (entry.isFile) {
    return [await new Promise((res, rej) => entry.file(res, rej))];
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const files = [];
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

// Process an array of raw File objects into normalized file records.
// onProgress(completed, total) — called after each file finishes.
// onChunk(batch) — optional; called with contiguous in-order batches as they complete,
//   allowing the caller to display results before all files are done.
export async function processFiles(rawFiles, onProgress, onChunk) {
  const total = rawFiles.length;
  let completed = 0;
  // Shared across workers — safe because JS is single-threaded: the sync
  // has()/add() pair between awaits cannot interleave with another worker.
  const seenHashes = new Set(state.files.map((f) => f.contentHash).filter(Boolean));

  // null = not yet processed; false = skipped; FileRecord = success
  const results = new Array(total).fill(null);
  const flushed = [];
  let committed = 0;

  // Flush the longest contiguous run of completed results from the front.
  // Nulls out flushed slots so GC can reclaim blobs that are now in `flushed`.
  function tryFlushContiguous() {
    const batch = [];
    while (committed < total && results[committed] !== null) {
      const r = results[committed];
      if (r) {
        batch.push(r);
        flushed.push(r);
      }
      results[committed] = undefined; // release blob reference
      committed++;
    }
    if (batch.length > 0) onChunk?.(batch);
  }

  async function processOne(i) {
    const file = rawFiles[i];
    const mediaType = detectType(file);
    if (!mediaType) {
      results[i] = false;
      onProgress?.(++completed, total);
      tryFlushContiguous();
      return;
    }

    if (mediaType === 'video') {
      // Videos can be gigabytes — never buffer the whole file.
      // size+lastModified+name is a collision-resistant fingerprint for a family collection,
      // and the File object stays alive in rawFiles[] so its object URL is stable.
      const hash = `${file.size}:${file.lastModified}:${file.name}`;
      if (seenHashes.has(hash)) {
        console.log(`[import] skip duplicate: ${file.name}`);
        results[i] = false;
        onProgress?.(++completed, total);
        tryFlushContiguous();
        return;
      }
      seenHashes.add(hash);
      results[i] = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'video',
        blob: file,
        url: URL.createObjectURL(file),
        rotation: 0,
        contentHash: hash,
        lowRes: false,
      };
      onProgress?.(++completed, total);
      tryFlushContiguous();
      return;
    }

    // Photos: read into memory immediately — iOS Safari File objects can expire after
    // async gaps, and we need the buffer for HEIC conversion anyway.
    let buf;
    try {
      buf = await file.arrayBuffer();
    } catch {
      results[i] = false;
      onProgress?.(++completed, total);
      tryFlushContiguous();
      return;
    }

    const hash = await bufHash(buf);
    if (seenHashes.has(hash)) {
      console.log(`[import] skip duplicate: ${file.name}`);
      results[i] = false;
      onProgress?.(++completed, total);
      tryFlushContiguous();
      return;
    }
    seenHashes.add(hash);

    try {
      let blob = new Blob([buf], { type: file.type || 'application/octet-stream' });
      if (HEIC_EXTS.has(fileExt(file.name))) {
        const r = await heic2any({ blob, toType: 'image/jpeg', quality: 0.92 });
        blob = Array.isArray(r) ? r[0] : r;
      }
      // Downscale to 4K, correct EXIF orientation, strip EXIF metadata
      const { blob: normalizedBlob, width, height } = await _orientNormalize(blob);
      results[i] = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'photo',
        blob: normalizedBlob,
        url: URL.createObjectURL(normalizedBlob),
        rotation: 0,
        contentHash: hash,
        lowRes: width < 1000 || height < 1000,
      };
    } catch (err) {
      console.warn(`[import] skipped ${file.name}:`, err);
      results[i] = false;
    }
    onProgress?.(++completed, total);
    tryFlushContiguous();
  }

  // 4 concurrent workers drain a shared index counter
  let idx = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (idx < total) await processOne(idx++);
    })
  );

  // Flush any tail that wasn't flushed mid-run (e.g. final out-of-order completions)
  tryFlushContiguous();

  return flushed;
}
