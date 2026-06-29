// ?worker&inline tells Vite to bundle this worker into the single-file output
import DuplicatesWorker from './workers/duplicates.worker.js?worker&inline';

const HAMMING_EXACT = 10; // bits different → near-exact duplicate (auto-removed)
const HAMMING_SIMILAR = 18; // structural ceiling for similar tier (was 25 — 19-25 range caused same-room false positives)
const COSINE_SIMILAR = 0.97; // was 0.92 — global histograms reach 0.92 by accident (shared skin tones + dark clothing);
// genuine same-scene pairs score 0.97–1.0; false positives score 0.88–0.95

// In-memory cache: contentHash → { dHash: Uint8Array, hist: Float32Array | null }
// Survives setup/player/review navigation; resets only on page reload.
const hashCache = new Map();

function runWorker(photos, mode, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new DuplicatesWorker();

    // Build item list: send cached hashes where available, blobs for the rest
    const items = photos.map((f) => {
      const cached = hashCache.get(f.contentHash);
      if (cached && (mode === 'exact' || cached.hist)) {
        return { dHash: cached.dHash, hist: cached.hist ?? undefined };
      }
      if (cached?.dHash && mode === 'full' && !cached.hist) {
        // Have dHash but need hist — send blob so worker can compute hist only
        return { blob: f.blob, dHash: cached.dHash };
      }
      return { blob: f.blob };
    });

    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        onProgress?.(data.done, data.total);
      } else if (data.type === 'result') {
        worker.terminate();
        // Cache newly computed hashes for the lifetime of this session
        for (const { idx, dHash, hist } of data.newlyComputed) {
          hashCache.set(photos[idx].contentHash, { dHash, hist });
        }
        // Map indices back to file records; caller decides on shape
        resolve({ groups: data.groups, photos });
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    worker.postMessage({
      mode,
      thresholds: { HAMMING_EXACT, HAMMING_SIMILAR, COSINE_SIMILAR },
      items,
    });
  });
}

// Fast exact-only pass (dHash only, no histogram). Used for silent auto-removal during import.
// Returns Array<fileRecord[]> — each inner array is a group of near-identical photos.
export async function detectExactGroups(files, onProgress) {
  const photos = files.filter((f) => f.type === 'photo');
  if (photos.length < 2) return [];
  const { groups } = await runWorker(photos, 'exact', onProgress);
  return groups.map((g) => g.indices.map((i) => photos[i]));
}

// Groups shape: Array<{ files: fileRecord[], reason: 'exact' | 'similar' }>
export async function detectDuplicates(files, onProgress) {
  const photos = files.filter((f) => f.type === 'photo');
  if (photos.length < 2) return [];
  const { groups } = await runWorker(photos, 'full', onProgress);
  return groups.map((g) => ({
    files: g.indices.map((i) => photos[i]),
    reason: g.reason,
  }));
}

export async function autoResolveDuplicates(files) {
  const groups = await detectExactGroups(files);
  const toRemove = [];
  for (const group of groups) {
    const winner = group.reduce((best, f) => (f.blob.size > best.blob.size ? f : best));
    for (const f of group) {
      if (f.id !== winner.id) toRemove.push(f.id);
    }
  }
  return toRemove;
}
