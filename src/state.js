export const state = {
  files: [],       // { id, name, type:'photo'|'video', blob, url }
  dupGroups: [],
  settings: { photoDuration: 7 },
};

export function addFiles(records) {
  state.files.push(...records);
}

export function clearFiles() {
  state.files.forEach(f => URL.revokeObjectURL(f.url));
  state.files = [];
  state.dupGroups = [];
}

export function removeFile(id) {
  const idx = state.files.findIndex(f => f.id === id);
  if (idx === -1) return;
  URL.revokeObjectURL(state.files[idx].url);
  state.files.splice(idx, 1);
}

// Restore files removed by the most recent action.
// snapshots: Array<{ file, idx }> — revives each file's object URL and reinserts
// at its original position. Insert lowest-index first to keep positions stable.
export function restoreFiles(snapshots) {
  const sorted = [...snapshots].sort((a, b) => a.idx - b.idx);
  for (const { file, idx } of sorted) {
    file.url = URL.createObjectURL(file.blob);
    state.files.splice(Math.min(idx, state.files.length), 0, file);
  }
}

export function reorderFile(fromIdx, toIdx) {
  const [item] = state.files.splice(fromIdx, 1);
  state.files.splice(toIdx, 0, item);
}

// Rotate 90° clockwise. Photos: bake into blob (blob becomes ground truth).
// Videos: track angle in state only; player applies CSS transform.
async function bakeRotation(blob) {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width  = bmp.height;
  canvas.height = bmp.width;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  bmp.close();
  return new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('bakeRotation: toBlob returned null')), 'image/jpeg', 0.92)
  );
}

export async function rotateFile(id) {
  const file = state.files.find(f => f.id === id);
  if (!file) return;
  if (file.type === 'photo') {
    const newBlob = await bakeRotation(file.blob);
    URL.revokeObjectURL(file.url);
    file.blob = newBlob;
    file.url  = URL.createObjectURL(newBlob);
    // rotation stays 0 — baked into the blob
  } else {
    file.rotation = (file.rotation + 90) % 360;
  }
}
