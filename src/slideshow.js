// Scale rotated video to fit the screen without clipping
function applyVideoRotation(el, deg) {
  if (deg === 90 || deg === 270) {
    const scale = Math.min(
      window.innerHeight / window.innerWidth,
      window.innerWidth / window.innerHeight
    );
    el.style.transform = `rotate(${deg}deg) scale(${scale})`;
  } else {
    el.style.transform = `rotate(${deg}deg)`;
  }
}

export function createSlideshow(container, files, settings) {
  let currentIdx = 0;
  let timerId = null;
  let stopped = false;
  // Bumped on every navigation or stop to invalidate stale async callbacks
  let gen = 0;

  // At most two elements live in the DOM: the visible current and a hidden pending preload
  let currentEl = null;
  let pendingEl = null;
  let pendingFileIdx = -1;

  function clearTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function removeEl(el) {
    if (!el) return;
    if (el.tagName === 'VIDEO') {
      el.pause();
      el.src = '';
    }
    if (el.parentNode === container) container.removeChild(el);
  }

  function removePending() {
    removeEl(pendingEl);
    pendingEl = null;
    pendingFileIdx = -1;
  }

  function removeCurrent() {
    removeEl(currentEl);
    currentEl = null;
  }

  function makeEl(file) {
    let el;
    if (file.type === 'photo') {
      el = document.createElement('img');
      el.alt = file.name;
      if (file.rotation) applyVideoRotation(el, file.rotation);
    } else {
      el = document.createElement('video');
      el.muted = true;
      el.playsInline = true;
      el.preload = 'auto';
      if (file.rotation) applyVideoRotation(el, file.rotation);
    }
    el.style.visibility = 'hidden';
    el.style.zIndex = '0';
    return el;
  }

  // Kick off a background preload for `idx` so it's ready before it's needed
  function startPreload(idx) {
    if (stopped || files.length <= 1) return;
    if (pendingFileIdx === idx) return;
    removePending();
    const file = files[idx];
    const el = makeEl(file);
    container.appendChild(el);
    pendingEl = el;
    pendingFileIdx = idx;
    if (file.type === 'photo') {
      el.src = file.url;
    } else {
      el.src = file.url;
      el.load();
    }
  }

  // Schedule the advance to the next slide once the current one is "done"
  function scheduleAdvance(el, file, myGen) {
    if (file.type === 'photo') {
      timerId = setTimeout(() => {
        if (gen !== myGen) return;
        currentIdx = (currentIdx + 1) % files.length;
        showItem(currentIdx);
      }, settings.photoDuration * 1000);
    } else {
      el.currentTime = 0;
      el.play().catch(() => {});
      const onEnd = () => {
        if (gen !== myGen) return;
        currentIdx = (currentIdx + 1) % files.length;
        showItem(currentIdx);
      };
      el.addEventListener('ended', onEnd, { once: true });
      el.addEventListener('error', onEnd, { once: true });
    }
  }

  // Make `el` the visible slide, schedule its advance, and preload the next item
  function activate(el, file, myGen) {
    if (stopped || gen !== myGen) return;
    el.style.visibility = 'visible';
    el.style.zIndex = '1';
    removeCurrent();
    currentEl = el;
    pendingEl = null;
    pendingFileIdx = -1;
    scheduleAdvance(el, file, myGen);
    startPreload((currentIdx + 1) % files.length);
  }

  function showItem(idx) {
    gen++;
    clearTimer();
    const myGen = gen;
    if (stopped || !files.length) return;
    const file = files[idx];

    // Fast path: pending slot already has this file loaded or loading
    if (pendingEl && pendingFileIdx === idx) {
      const el = pendingEl;
      if (file.type === 'photo') {
        if (el.complete && el.naturalWidth > 0) {
          activate(el, file, myGen);
        } else {
          el.addEventListener('load', () => activate(el, file, myGen), { once: true });
          el.addEventListener('error', () => activate(el, file, myGen), { once: true });
        }
      } else {
        if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          activate(el, file, myGen);
        } else {
          el.addEventListener('canplay', () => activate(el, file, myGen), { once: true });
          el.addEventListener('error', () => activate(el, file, myGen), { once: true });
        }
      }
      return;
    }

    // Slow path: create element fresh
    removePending();
    const el = makeEl(file);
    container.appendChild(el);
    pendingEl = el;
    pendingFileIdx = idx;

    if (file.type === 'photo') {
      el.addEventListener('load', () => activate(el, file, myGen), { once: true });
      el.addEventListener('error', () => activate(el, file, myGen), { once: true });
      el.src = file.url;
    } else {
      el.addEventListener('canplay', () => activate(el, file, myGen), { once: true });
      el.addEventListener('error', () => activate(el, file, myGen), { once: true });
      el.src = file.url;
      el.load();
    }
  }

  return {
    start() {
      stopped = false;
      currentIdx = 0;
      showItem(0);
    },
    stop() {
      stopped = true;
      gen++;
      clearTimer();
      removePending();
      removeCurrent();
    },
    next() {
      currentIdx = (currentIdx + 1) % files.length;
      showItem(currentIdx);
    },
    prev() {
      currentIdx = (currentIdx - 1 + files.length) % files.length;
      showItem(currentIdx);
    },
  };
}
