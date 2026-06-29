// Runs entirely off the main thread — uses OffscreenCanvas instead of DOM canvas.
// Receives items[] where each item is either {blob} (needs hashing) or {dHash, hist} (cached).

function dhash(pixels9x8) {
  const hash = new Uint8Array(8);
  for (let row = 0; row < 8; row++) {
    let byte = 0;
    for (let col = 0; col < 8; col++) {
      const i = (row * 9 + col) * 4;
      const j = i + 4;
      const gL = 0.299 * pixels9x8[i] + 0.587 * pixels9x8[i + 1] + 0.114 * pixels9x8[i + 2];
      const gR = 0.299 * pixels9x8[j] + 0.587 * pixels9x8[j + 1] + 0.114 * pixels9x8[j + 2];
      if (gL > gR) byte |= 1 << (7 - col);
    }
    hash[row] = byte;
  }
  return hash;
}

function colorHistogram(pixels64x64) {
  const BINS = 64;
  const hist = new Float32Array(BINS * 3);
  const step = 256 / BINS;
  for (let i = 0; i < pixels64x64.length; i += 4) {
    hist[Math.floor(pixels64x64[i] / step)] += 1;
    hist[Math.floor(pixels64x64[i + 1] / step) + BINS] += 1;
    hist[Math.floor(pixels64x64[i + 2] / step) + BINS * 2] += 1;
  }
  let mag = 0;
  for (let k = 0; k < hist.length; k++) mag += hist[k] ** 2;
  mag = Math.sqrt(mag) || 1;
  for (let k = 0; k < hist.length; k++) hist[k] /= mag;
  return hist;
}

function hammingDistance(a, b) {
  let dist = 0;
  for (let i = 0; i < 8; i++) {
    let xor = a[i] ^ b[i];
    while (xor) {
      dist += xor & 1;
      xor >>>= 1;
    }
  }
  return dist;
}

function cosineSim(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // pre-normalized
}

self.onmessage = async ({ data }) => {
  const { mode, thresholds, items } = data;
  const { HAMMING_EXACT, HAMMING_SIMILAR, COSINE_SIMILAR } = thresholds;
  const n = items.length;

  const allDHash = new Array(n).fill(null);
  const allHist = mode === 'full' ? new Array(n).fill(null) : null;
  const newlyComputed = [];

  // Identify which items need hashing
  const toHash = [];
  for (let i = 0; i < n; i++) {
    const item = items[i];
    if (item.dHash) {
      allDHash[i] = item.dHash;
      if (mode === 'full' && item.hist) allHist[i] = item.hist;
      if (mode === 'full' && !item.hist) toHash.push(i); // have dHash but need hist
    } else {
      toHash.push(i);
    }
  }

  const hashTotal = toHash.length;
  let hashDone = 0;

  for (const i of toHash) {
    try {
      const blob = items[i].blob;
      const alreadyHasDHash = !!allDHash[i];

      if (!alreadyHasDHash) {
        const bmp9 = await createImageBitmap(blob, {
          resizeWidth: 9,
          resizeHeight: 8,
          resizeQuality: 'pixelated',
        });
        const oc9 = new OffscreenCanvas(9, 8);
        oc9.getContext('2d').drawImage(bmp9, 0, 0, 9, 8);
        bmp9.close();
        allDHash[i] = dhash(oc9.getContext('2d').getImageData(0, 0, 9, 8).data);
      }

      if (mode === 'full') {
        const bmp64 = await createImageBitmap(blob, {
          resizeWidth: 64,
          resizeHeight: 64,
          resizeQuality: 'pixelated',
        });
        const oc64 = new OffscreenCanvas(64, 64);
        oc64.getContext('2d').drawImage(bmp64, 0, 0, 64, 64);
        bmp64.close();
        allHist[i] = colorHistogram(oc64.getContext('2d').getImageData(0, 0, 64, 64).data);
      }

      newlyComputed.push({ idx: i, dHash: allDHash[i], hist: allHist?.[i] ?? null });
    } catch {
      // allDHash[i] / allHist[i] stay null; this photo is skipped in comparison
    }
    self.postMessage({ type: 'progress', done: ++hashDone, total: hashTotal });
  }

  // O(n²) pairwise comparison — blocking but off the main thread
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(i) {
    return parent[i] === i ? i : (parent[i] = find(parent[i]));
  }
  function union(i, j) {
    parent[find(i)] = find(j);
  }

  const pairReason = new Map();
  for (let i = 0; i < n; i++) {
    if (!allDHash[i]) continue;
    for (let j = i + 1; j < n; j++) {
      if (!allDHash[j]) continue;
      const hamming = hammingDistance(allDHash[i], allDHash[j]);
      if (hamming <= HAMMING_EXACT) {
        union(i, j);
        pairReason.set(`${i}-${j}`, 'exact');
      } else if (
        mode === 'full' &&
        allHist[i] &&
        allHist[j] &&
        hamming <= HAMMING_SIMILAR &&
        cosineSim(allHist[i], allHist[j]) >= COSINE_SIMILAR
      ) {
        union(i, j);
        pairReason.set(`${i}-${j}`, 'similar');
      }
    }
  }

  const groupMap = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groupMap.has(root)) groupMap.set(root, { indices: [], reason: 'exact' });
    groupMap.get(root).indices.push(i);
  }
  pairReason.forEach((reason, key) => {
    if (reason === 'similar') {
      const root = find(parseInt(key));
      if (groupMap.has(root)) groupMap.get(root).reason = 'similar';
    }
  });

  const groups = [...groupMap.values()]
    .filter((g) => g.indices.length > 1)
    .map((g) => ({ indices: g.indices, reason: g.reason }));

  self.postMessage({ type: 'result', groups, newlyComputed });
};
