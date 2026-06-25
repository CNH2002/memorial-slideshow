const THRESHOLD = 10; // max Hamming distance to consider "same" image

async function dhash(blob) {
  const bmp = await createImageBitmap(blob, {
    resizeWidth: 9,
    resizeHeight: 8,
    resizeQuality: 'pixelated',
  });
  const canvas = document.createElement('canvas');
  canvas.width  = 9;
  canvas.height = 8;
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

export async function detectDuplicates(files, onProgress) {
  const photos = files.filter(f => f.type === 'photo');
  if (photos.length < 2) return [];

  const hashes = [];
  for (let i = 0; i < photos.length; i++) {
    hashes.push(await dhash(photos[i].blob));
    onProgress?.(i + 1, photos.length);
  }

  // Union-find
  const parent = photos.map((_, i) => i);
  function find(i) { return parent[i] === i ? i : (parent[i] = find(parent[i])); }
  function union(i, j) { parent[find(i)] = find(j); }

  for (let i = 0; i < photos.length; i++) {
    for (let j = i + 1; j < photos.length; j++) {
      if (hammingDistance(hashes[i], hashes[j]) <= THRESHOLD) union(i, j);
    }
  }

  const groups = new Map();
  for (let i = 0; i < photos.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(photos[i]);
  }

  return [...groups.values()].filter(g => g.length > 1);
}

// For each duplicate group, keep the file with the largest blob (best quality proxy)
// and return the IDs of the rest so the caller can remove them.
export async function autoResolveDuplicates(files) {
  const groups = await detectDuplicates(files);
  const toRemove = [];
  for (const group of groups) {
    const winner = group.reduce((best, f) => f.blob.size > best.blob.size ? f : best);
    for (const f of group) {
      if (f.id !== winner.id) toRemove.push(f.id);
    }
  }
  return toRemove;
}
