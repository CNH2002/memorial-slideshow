export const state = {
  files: [], // { id, name, type:'photo'|'video', blob, url }
  dupGroups: [],
  settings: { photoDuration: 7 },
};

export function addFiles(records) {
  state.files.push(...records);
}

export function clearFiles() {
  state.files.forEach((f) => URL.revokeObjectURL(f.url));
  state.files = [];
  state.dupGroups = [];
}

export function removeFile(id) {
  const idx = state.files.findIndex((f) => f.id === id);
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

// Bake a rotation (90/180/270°) into a blob via canvas. Exported so callers can
// persist the result to IDB without blocking the UI rotation response.
export async function bakeRotation(blob, deg = 90) {
  const bmp = await createImageBitmap(blob);
  const swap = deg === 90 || deg === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? bmp.height : bmp.width;
  canvas.height = swap ? bmp.width : bmp.height;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  bmp.close();
  return new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error('bakeRotation: toBlob returned null'))),
      'image/jpeg',
      0.92
    )
  );
}

export function rotateFile(id) {
  const file = state.files.find((f) => f.id === id);
  if (!file) return;
  file.rotation = ((file.rotation ?? 0) + 90) % 360;
}
