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

export function reorderFile(fromIdx, toIdx) {
  const [item] = state.files.splice(fromIdx, 1);
  state.files.splice(toIdx, 0, item);
}
