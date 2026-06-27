let toastEl = null;
let dismissTimer = null;
let currentUndo = null;

function getToast() {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'undo-toast';
    document.body.appendChild(toastEl);
  }
  return toastEl;
}

function dismiss() {
  clearTimeout(dismissTimer);
  dismissTimer = null;
  currentUndo = null;
  const toast = getToast();
  toast.classList.remove('toast-visible');
}

export function showUndoToast(message, onUndo, duration = 8000) {
  const toast = getToast();
  clearTimeout(dismissTimer);
  currentUndo = onUndo;

  toast.innerHTML = `<span class="toast-msg">${message} —</span><button class="toast-undo-btn">Undo</button>`;

  toast.querySelector('.toast-undo-btn').addEventListener('click', () => {
    const fn = currentUndo;
    dismiss();
    if (fn) fn();
  });

  toast.classList.add('toast-visible');
  dismissTimer = setTimeout(dismiss, duration);
}

export function dismissToast() {
  dismiss();
}
