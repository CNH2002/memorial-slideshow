export function createSlideshow(container, files, settings) {
  let currentIdx = 0;
  let timerId    = null;
  let generation = 0;

  function clearCurrent() {
    generation++;
    if (timerId !== null) { clearTimeout(timerId); timerId = null; }
    const el = container.firstChild;
    if (el) {
      if (el.tagName === 'VIDEO') { el.pause(); el.src = ''; }
      container.removeChild(el);
    }
  }

  function showItem(idx) {
    clearCurrent();
    if (!files.length) return;
    const file = files[idx];
    const gen  = generation;

    if (file.type === 'photo') {
      const img = document.createElement('img');
      img.src = file.url;
      img.alt = file.name;
      container.appendChild(img);
      timerId = setTimeout(() => {
        if (gen !== generation) return;
        currentIdx = (currentIdx + 1) % files.length;
        showItem(currentIdx);
      }, settings.photoDuration * 1000);
    } else {
      const video = document.createElement('video');
      video.src        = file.url;
      video.muted      = true;
      video.autoplay   = true;
      video.playsInline = true;
      const advance = () => {
        if (gen !== generation) return;
        currentIdx = (currentIdx + 1) % files.length;
        showItem(currentIdx);
      };
      video.addEventListener('ended', advance, { once: true });
      video.addEventListener('error', advance, { once: true });
      container.appendChild(video);
    }
  }

  return {
    start() { currentIdx = 0; showItem(0); },
    stop()  { clearCurrent(); },
    next()  { currentIdx = (currentIdx + 1) % files.length; showItem(currentIdx); },
    prev()  { currentIdx = (currentIdx - 1 + files.length) % files.length; showItem(currentIdx); },
  };
}
