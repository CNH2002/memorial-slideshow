let toastEl = null;
let dismissTimer = null;
let currentUndo = null;

function getToast() {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'undo-toast';
    toastEl.className = [
      'fixed bottom-6 left-1/2 -translate-x-1/2',
      'flex items-center gap-4',
      'bg-surface border border-white/[0.08]',
      'rounded px-5 py-3',
      'font-body text-sm text-muted whitespace-nowrap',
      'z-[200] opacity-0 pointer-events-none',
      'transition-opacity duration-[300ms] ease-in-out',
    ].join(' ');
    document.body.appendChild(toastEl);
  }
  return toastEl;
}

function dismiss() {
  clearTimeout(dismissTimer);
  dismissTimer = null;
  currentUndo = null;
  const toast = getToast();
  toast.classList.remove('opacity-100', 'pointer-events-auto');
  toast.classList.add('opacity-0', 'pointer-events-none');
}

export function showUndoToast(message, onUndo, duration = 8000) {
  const toast = getToast();
  clearTimeout(dismissTimer);
  currentUndo = onUndo;

  toast.innerHTML = `
    <span class="text-muted">${message} —</span>
    <button class="toast-undo font-body text-xs text-sage uppercase tracking-[0.15em]
                   hover:opacity-70 transition-opacity duration-[200ms] ease-in-out">
      Undo
    </button>
  `;

  toast.querySelector('.toast-undo').addEventListener('click', () => {
    const fn = currentUndo;
    dismiss();
    if (fn) fn();
  });

  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100', 'pointer-events-auto');
  dismissTimer = setTimeout(dismiss, duration);
}

export function dismissToast() {
  dismiss();
}
