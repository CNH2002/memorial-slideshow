const HAMMING_EXACT    = 10; // bits different → near-exact duplicate
const HAMMING_SIMILAR  = 25; // structural ceiling for burst/angle-shift tier
const COSINE_SIMILAR   = 0.92; // color histogram floor — AND with hamming, not OR

async function dhash(blob) {
  const bmp = await createImageBitmap(blob, {
    resizeWidth: 9, resizeHeight: 8, resizeQuality: 'pixelated',
  });
  const canvas = document.createElement('canvas');
  canvas.width = 9; canvas.height = 8;
  canvas.getContext('2d').drawImage(bmp, 0, 0, 9, 8);
  bmp.close();

  const { data } = canvas.getContext('2d').getImageData(0, 0, 9, 8);
  const hash = new Uint8Array(8);
  for (let row = 0; row < 8; row++) {
    let byte = 0;
    for (let col = 0; col < 8; col++) {
      const i = (row * 9 + col) * 4;
      const j = (row * 9 + col + 1) * 4;
      const gL = 0.299 * data[i]   + 0.587 * data[i+1] + 0.114 * data[i+2];
      const gR = 0.299 * data[j]   + 0.587 * data[j+1] + 0.114 * data[j+2];
      if (gL > gR) byte |= (1 << (7 - col));
    }
    hash[row] = byte;
  }
  return hash;
}

function hammingDistance(a, b) {
  let dist = 0;
  for (let i = 0; i < 8; i++) {
    let xor = a[i] ^ b[i];
    while (xor) { dist += xor & 1; xor >>>= 1; }
  }
  return dist;
}

// 64-bin RGB color histogram — shift-invariant, catches burst shots with camera motion
async function colorHistogram(blob) {
  const SIZE = 64;
  const bmp  = await createImageBitmap(blob, { resizeWidth: SIZE, resizeHeight: SIZE, resizeQuality: 'pixelated' });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  canvas.getContext('2d').drawImage(bmp, 0, 0, SIZE, SIZE);
  bmp.close();

  const { data } = canvas.getContext('2d').getImageData(0, 0, SIZE, SIZE);
  const BINS = 64;
  const hist = new Float32Array(BINS * 3);
  const step = 256 / BINS;

  for (let i = 0; i < data.length; i += 4) {
    hist[Math.floor(data[i]   / step)]          += 1;
    hist[Math.floor(data[i+1] / step) + BINS]   += 1;
    hist[Math.floor(data[i+2] / step) + BINS*2] += 1;
  }

  let mag = 0;
  for (let k = 0; k < hist.length; k++) mag += hist[k] ** 2;
  mag = Math.sqrt(mag) || 1;
  for (let k = 0; k < hist.length; k++) hist[k] /= mag;
  return hist;
}

function cosineSim(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // pre-normalized
}

// Groups shape: Array<{ files: fileRecord[], reason: 'exact' | 'similar' }>
export async function detectDuplicates(files, onProgress) {
  const photos = files.filter(f => f.type === 'photo');
  if (photos.length < 2) return [];

  const hashes = [], hists = [];
  for (let i = 0; i < photos.length; i++) {
    try {
      hashes.push(await dhash(photos[i].blob));
      hists.push(await colorHistogram(photos[i].blob));
    } catch (err) {
      console.warn('[duplicates] skipped', photos[i].name, err);
      hashes.push(null);
      hists.push(null);
    }
    onProgress?.(i + 1, photos.length);
  }

  const parent = photos.map((_, i) => i);
  function find(i) { return parent[i] === i ? i : (parent[i] = find(parent[i])); }
  function union(i, j) { parent[find(i)] = find(j); }

  const pairReason = new Map();
  for (let i = 0; i < photos.length; i++) {
    if (!hashes[i] || !hists[i]) continue;
    for (let j = i + 1; j < photos.length; j++) {
      if (!hashes[j] || !hists[j]) continue;
      const hamming = hammingDistance(hashes[i], hashes[j]);
      if (hamming <= HAMMING_EXACT) {
        union(i, j);
        pairReason.set(`${i}-${j}`, 'exact');
      } else if (hamming <= HAMMING_SIMILAR && cosineSim(hists[i], hists[j]) >= COSINE_SIMILAR) {
        // Require BOTH structural closeness AND near-identical color distribution.
        // OR-only on cosine collapses all same-room photos into one group via union-find.
        union(i, j);
        pairReason.set(`${i}-${j}`, 'similar');
      }
    }
  }

  const groups = new Map();
  for (let i = 0; i < photos.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, { files: [], reason: 'exact' });
    groups.get(root).files.push(photos[i]);
  }
  // Any 'similar' edge in a group downgrades the whole group's reason
  pairReason.forEach((reason, key) => {
    if (reason === 'similar') {
      const root = find(parseInt(key)); // parseInt("i-j") === i
      if (groups.has(root)) groups.get(root).reason = 'similar';
    }
  });

  return [...groups.values()]
    .filter(g => g.files.length > 1)
    .map(g => ({ files: g.files, reason: g.reason }));
}

export async function autoResolveDuplicates(files) {
  const groups = await detectDuplicates(files);
  const toRemove = [];
  for (const { files: group } of groups) {
    const winner = group.reduce((best, f) => f.blob.size > best.blob.size ? f : best);
    for (const f of group) {
      if (f.id !== winner.id) toRemove.push(f.id);
    }
  }
  return toRemove;
}
