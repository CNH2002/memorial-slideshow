export function mountLanding(container, { onEnter }) {
  container.innerHTML = `
    <div id="landing"
         class="fixed inset-0 bg-bg flex flex-col items-center justify-center px-8
                opacity-0 transition-opacity ease-in-out"
         style="transition-duration: 500ms">

      <p class="font-body text-muted text-[10px] uppercase tracking-[0.28em] mb-8 select-none">
        A Memorial Slideshow
      </p>

      <h1 class="font-display font-light text-linen text-center leading-none tracking-wide select-none"
          style="font-size: clamp(3.5rem, 14vw, 9rem)">
        In Loving<br>Memory
      </h1>

      <p class="font-body text-muted text-sm md:text-base text-center leading-relaxed
                max-w-xs mt-6 mb-16 select-none">
        Gather your photographs.<br>Share a life well lived.
      </p>

      <button id="landing-cta"
              class="font-body font-medium text-[11px] uppercase tracking-[0.22em]
                     px-10 py-4 bg-sage text-bg
                     transition-opacity duration-[200ms] ease-in-out
                     hover:opacity-80 active:opacity-65">
        Begin
      </button>
    </div>
  `;

  const el = container.querySelector('#landing');

  // Double rAF: ensures opacity:0 is painted before the transition fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
  });

  container.querySelector('#landing-cta').addEventListener('click', () => {
    el.style.transitionDuration = '250ms';
    el.style.opacity = '0';
    setTimeout(onEnter, 260);
  });
}
