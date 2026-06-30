export function mountLanding(container, { onEnter }) {
  container.innerHTML = `
    <div id="landing"
         class="h-full overflow-y-auto overflow-x-hidden bg-bg
                opacity-0 transition-opacity ease-in-out"
         style="transition-duration: 500ms">

      <!-- Nav -->
      <nav id="land-nav"
           class="sticky top-0 z-50 bg-bg/95 backdrop-blur-sm
                  flex items-center justify-between px-6 md:px-10 py-4">
        <span class="font-display font-light text-linen text-2xl tracking-wide select-none">
          Slideshow
        </span>
        <button class="land-cta font-body font-medium text-[11px] uppercase tracking-[0.22em]
                       px-6 py-3 bg-sage text-bg
                       transition-opacity duration-[200ms] ease-in-out
                       hover:opacity-80 active:opacity-65">
          Open App
        </button>
      </nav>

      <!-- Hero -->
      <section class="min-h-dvh flex flex-col items-center justify-center
                      px-6 md:px-10 text-center relative">

        <p class="font-body text-[10px] uppercase tracking-[0.3em] text-muted mb-8 select-none">
          Weddings&nbsp;·&nbsp;Galas&nbsp;·&nbsp;Memorials&nbsp;·&nbsp;Milestones
        </p>

        <h1 class="font-display font-light text-linen leading-none tracking-wide select-none"
            style="font-size: clamp(3rem, 12vw, 8rem)">
          Every Moment,<br>Perfectly Shown
        </h1>

        <p class="font-body text-muted text-sm md:text-base text-center leading-relaxed
                  max-w-sm md:max-w-md mt-8 mb-12 select-none">
          A venue-ready slideshow that runs entirely offline.<br>
          No uploads. No accounts. Just your photos, beautifully presented.
        </p>

        <button class="land-cta font-body font-medium text-[11px] uppercase tracking-[0.22em]
                       px-12 py-4 bg-sage text-bg mb-20
                       transition-opacity duration-[200ms] ease-in-out
                       hover:opacity-80 active:opacity-65">
          Open the App
        </button>

        <div class="land-scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2
                    flex flex-col items-center" aria-hidden="true">
          <span class="block w-px h-8 bg-linen/20 mb-2"></span>
          <span class="font-body text-[9px] text-muted/40 uppercase tracking-[0.25em]">scroll</span>
        </div>
      </section>

      <!-- Feature Showcase -->
      <section class="px-6 md:px-10 py-20 md:py-28 max-w-6xl mx-auto w-full">

        <p class="land-reveal font-body text-[10px] uppercase tracking-[0.28em] text-muted mb-12 text-center">
          Built for live events
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04] mb-20">

          <div class="land-reveal bg-bg p-8 md:p-10">
            <div class="w-9 h-9 mb-6 text-sage" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2 4 6v6c0 5.25 3.5 10.15 8 11.5 4.5-1.35 8-6.25 8-11.5V6Z"/>
              </svg>
            </div>
            <h3 class="font-display text-2xl md:text-3xl text-linen mb-3">RAM Protection Shield</h3>
            <p class="font-body text-sm text-muted leading-relaxed">
              Process thousands of photos without crashing. Files stream on demand —
              your device stays responsive even with 2,000+ images.
            </p>
          </div>

          <div class="land-reveal land-reveal-d1 bg-bg p-8 md:p-10">
            <div class="w-9 h-9 mb-6 text-sage" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <circle cx="9"  cy="12" r="6"/>
                <circle cx="15" cy="12" r="6"/>
              </svg>
            </div>
            <h3 class="font-display text-2xl md:text-3xl text-linen mb-3">Smart Duplicate Curation</h3>
            <p class="font-body text-sm text-muted leading-relaxed">
              Perceptual hashing surfaces near-identical shots automatically.
              Keep your best take; cut the rest in one tap.
            </p>
          </div>

          <div class="land-reveal land-reveal-d2 bg-bg p-8 md:p-10">
            <div class="w-9 h-9 mb-6 text-sage" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5"  width="14" height="10" rx="1"/>
                <rect x="8" y="9"  width="14" height="10" rx="1"/>
              </svg>
            </div>
            <h3 class="font-display text-2xl md:text-3xl text-linen mb-3">Zero-Flash Transitions</h3>
            <p class="font-body text-sm text-muted leading-relaxed">
              Double-buffered cross-fades hold both images in memory during every transition.
              No black flash — even on a venue projector.
            </p>
          </div>
        </div>

        <p class="land-reveal font-body text-[10px] uppercase tracking-[0.28em] text-muted mb-6">
          Made for every occasion
        </p>
        <div class="land-reveal land-reveal-d1 flex gap-3 overflow-x-auto pb-2
                    land-tiles-scroll -mx-6 px-6 md:mx-0 md:px-0">
          <div class="flex-shrink-0 w-36 h-44 rounded relative overflow-hidden"
               style="background: radial-gradient(ellipse 80% 70% at 40% 35%, rgba(244,235,220,0.25) 0%, transparent 100%), #1e1c1a;">
            <span class="absolute bottom-4 left-4 font-body text-[11px] uppercase tracking-[0.2em] text-linen/70">Wedding</span>
          </div>
          <div class="flex-shrink-0 w-36 h-44 rounded relative overflow-hidden"
               style="background: radial-gradient(ellipse 70% 70% at 55% 40%, rgba(118,132,121,0.3) 0%, transparent 100%), #191b1d;">
            <span class="absolute bottom-4 left-4 font-body text-[11px] uppercase tracking-[0.2em] text-linen/70">Memorial</span>
          </div>
          <div class="flex-shrink-0 w-36 h-44 rounded relative overflow-hidden"
               style="background: radial-gradient(ellipse 75% 65% at 60% 45%, rgba(195,162,95,0.25) 0%, transparent 100%), #1b1a17;">
            <span class="absolute bottom-4 left-4 font-body text-[11px] uppercase tracking-[0.2em] text-linen/70">Gala</span>
          </div>
          <div class="flex-shrink-0 w-36 h-44 rounded relative overflow-hidden"
               style="background: radial-gradient(ellipse 65% 75% at 35% 55%, rgba(200,170,200,0.18) 0%, transparent 100%), #1d1a1d;">
            <span class="absolute bottom-4 left-4 font-body text-[11px] uppercase tracking-[0.2em] text-linen/70">Birthday</span>
          </div>
          <div class="flex-shrink-0 w-36 h-44 rounded relative overflow-hidden"
               style="background: radial-gradient(ellipse 70% 60% at 50% 40%, rgba(150,160,175,0.2) 0%, transparent 100%), #191b1e;">
            <span class="absolute bottom-4 left-4 font-body text-[11px] uppercase tracking-[0.2em] text-linen/70">Corporate</span>
          </div>
        </div>
      </section>

      <!-- Interactive Demo -->
      <section class="py-20 md:py-28 bg-surface">
        <div class="px-6 md:px-10 max-w-6xl mx-auto">

          <p class="land-reveal font-body text-[10px] uppercase tracking-[0.28em] text-muted mb-3">
            See it in action
          </p>
          <h2 class="land-reveal land-reveal-d1 font-display font-light text-linen
                     text-4xl md:text-5xl mb-12" style="letter-spacing: 0.01em">
            Every event type,<br>one platform
          </h2>

          <div id="land-demo-tabs"
               class="land-reveal land-reveal-d2 flex border-b border-white/[0.08]">
            <button class="land-tab land-tab--active
                           font-body text-[11px] uppercase tracking-[0.2em] text-muted/70
                           px-5 pb-4 pt-3 mr-1 hover:text-linen/60"
                    data-tab="wedding">Wedding</button>
            <button class="land-tab
                           font-body text-[11px] uppercase tracking-[0.2em] text-muted/70
                           px-5 pb-4 pt-3 mr-1 hover:text-linen/60"
                    data-tab="memorial">Memorial</button>
            <button class="land-tab
                           font-body text-[11px] uppercase tracking-[0.2em] text-muted/70
                           px-5 pb-4 pt-3 hover:text-linen/60"
                    data-tab="gala">Gala</button>
          </div>

          <div class="land-demo-stage relative overflow-hidden
                      rounded-b border-x border-b border-white/[0.06]">

            <div class="land-panel land-panel--active" data-panel="wedding">
              <div class="land-panel-bg land-panel-bg--animated w-full h-full"
                   style="background:
                     radial-gradient(ellipse 70% 60% at 30% 35%, rgba(244,242,237,0.18) 0%, transparent 100%),
                     radial-gradient(ellipse 50% 50% at 75% 65%, rgba(215,185,160,0.12) 0%, transparent 100%),
                     #1e2022;">
                <div class="absolute bottom-8 left-8 right-8">
                  <p class="font-body text-linen/40 text-[9px] uppercase tracking-[0.3em] mb-2">Now showing</p>
                  <p class="font-display font-light text-linen text-3xl md:text-4xl">Sarah &amp; Michael</p>
                  <p class="font-body text-muted/60 text-sm mt-1">June 14th, 2025 · Slide 12 of 48</p>
                </div>
              </div>
            </div>

            <div class="land-panel" data-panel="memorial">
              <div class="land-panel-bg land-panel-bg--animated w-full h-full"
                   style="background:
                     radial-gradient(ellipse 60% 70% at 50% 45%, rgba(118,132,121,0.18) 0%, transparent 100%),
                     radial-gradient(ellipse 40% 50% at 20% 75%, rgba(107,101,96,0.15) 0%, transparent 100%),
                     linear-gradient(160deg, #18191b 0%, #1c1e20 100%);">
                <div class="absolute bottom-8 left-8 right-8">
                  <p class="font-body text-linen/40 text-[9px] uppercase tracking-[0.3em] mb-2">In memoriam</p>
                  <p class="font-display font-light text-linen text-3xl md:text-4xl">Eleanor Grace Holt</p>
                  <p class="font-body text-muted/60 text-sm mt-1">1942 – 2024 · Slide 7 of 32</p>
                </div>
              </div>
            </div>

            <div class="land-panel" data-panel="gala">
              <div class="land-panel-bg land-panel-bg--animated w-full h-full"
                   style="background:
                     radial-gradient(ellipse 55% 55% at 65% 35%, rgba(195,165,100,0.22) 0%, transparent 100%),
                     radial-gradient(ellipse 45% 45% at 25% 65%, rgba(160,130,75,0.12) 0%, transparent 100%),
                     #1b1a17;">
                <div class="absolute bottom-8 left-8 right-8">
                  <p class="font-body text-linen/40 text-[9px] uppercase tracking-[0.3em] mb-2">This evening</p>
                  <p class="font-display font-light text-linen text-3xl md:text-4xl">The Hartwell Foundation</p>
                  <p class="font-body text-muted/60 text-sm mt-1">25th Annual Gala · Slide 4 of 60</p>
                </div>
              </div>
            </div>
          </div>

          <div class="land-reveal flex flex-wrap gap-3 mt-6">
            <span class="font-body text-[10px] uppercase tracking-[0.2em] text-muted/50
                         border border-white/[0.06] rounded px-3 py-1.5">Offline first</span>
            <span class="font-body text-[10px] uppercase tracking-[0.2em] text-muted/50
                         border border-white/[0.06] rounded px-3 py-1.5">No uploads</span>
            <span class="font-body text-[10px] uppercase tracking-[0.2em] text-muted/50
                         border border-white/[0.06] rounded px-3 py-1.5">Any projector</span>
            <span class="font-body text-[10px] uppercase tracking-[0.2em] text-muted/50
                         border border-white/[0.06] rounded px-3 py-1.5">Zero flash</span>
          </div>
        </div>
      </section>

      <!-- Editorial Articles -->
      <section class="px-6 md:px-10 py-20 md:py-28 max-w-6xl mx-auto w-full">

        <p class="land-reveal font-body text-[10px] uppercase tracking-[0.28em] text-muted mb-3">
          Event prep guides
        </p>
        <h2 class="land-reveal land-reveal-d1 font-display font-light text-linen
                   text-4xl md:text-5xl mb-12" style="letter-spacing: 0.01em">
          Make the most<br>of your event
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

          <article class="land-reveal land-article-card
                          border border-white/[0.06] rounded p-7
                          flex flex-col gap-4 group cursor-default">
            <span class="font-body text-[9px] uppercase tracking-[0.25em] text-sage">Venue setup</span>
            <h3 class="font-display text-xl md:text-2xl text-linen font-light leading-snug">
              How to connect any venue projector
            </h3>
            <p class="font-body text-xs text-muted leading-relaxed flex-1">
              HDMI adapters, aspect ratios, and the 4:3 safe zone guide —
              everything confirmed before guests arrive.
            </p>
            <span class="land-article-arrow font-body text-muted/40
                         group-hover:text-muted/80 text-lg
                         transition-colors duration-[200ms]">→</span>
          </article>

          <article class="land-reveal land-reveal-d1 land-article-card
                          border border-white/[0.06] rounded p-7
                          flex flex-col gap-4 group cursor-default">
            <span class="font-body text-[9px] uppercase tracking-[0.25em] text-sage">Media prep</span>
            <h3 class="font-display text-xl md:text-2xl text-linen font-light leading-snug">
              Preparing your photo library for a live event
            </h3>
            <p class="font-body text-xs text-muted leading-relaxed flex-1">
              Culling duplicates, sorting chronologically, and choosing formats
              that balance speed and quality for real-time display.
            </p>
            <span class="land-article-arrow font-body text-muted/40
                         group-hover:text-muted/80 text-lg
                         transition-colors duration-[200ms]">→</span>
          </article>

          <article class="land-reveal land-reveal-d2 land-article-card
                          border border-white/[0.06] rounded p-7
                          flex flex-col gap-4 group cursor-default">
            <span class="font-body text-[9px] uppercase tracking-[0.25em] text-sage">Presentation</span>
            <h3 class="font-display text-xl md:text-2xl text-linen font-light leading-snug">
              Timing and pacing your event slideshow
            </h3>
            <p class="font-body text-xs text-muted leading-relaxed flex-1">
              Slide duration, reading the room, and professional pacing
              strategies for audiences from 20 to 2,000.
            </p>
            <span class="land-article-arrow font-body text-muted/40
                         group-hover:text-muted/80 text-lg
                         transition-colors duration-[200ms]">→</span>
          </article>
        </div>
      </section>

      <!-- Footer -->
      <footer class="border-t border-white/[0.06] px-6 md:px-10 py-16 md:py-20">
        <div class="max-w-6xl mx-auto flex flex-col md:flex-row
                    items-center md:items-start justify-between gap-8">
          <div class="flex flex-col items-center md:items-start gap-3">
            <span class="font-display font-light text-linen text-2xl tracking-wide select-none">
              Slideshow
            </span>
            <p class="font-body text-xs text-muted/50 text-center md:text-left max-w-xs leading-relaxed">
              No uploads. No accounts. No internet required.
            </p>
          </div>
          <button class="land-cta font-body font-medium text-[11px] uppercase tracking-[0.22em]
                         px-10 py-4 bg-sage text-bg
                         transition-opacity duration-[200ms] ease-in-out
                         hover:opacity-80 active:opacity-65">
            Open the App
          </button>
        </div>
      </footer>

    </div>
  `;

  const el = container.querySelector('#landing');

  // Fade in — double rAF ensures opacity:0 is painted before transition fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
  });

  // Single closure shared by all CTAs
  function triggerEnter() {
    el.style.transitionDuration = '250ms';
    el.style.opacity = '0';
    setTimeout(onEnter, 260);
  }
  el.querySelectorAll('.land-cta').forEach((btn) => btn.addEventListener('click', triggerEnter));

  // Nav scroll shadow — listener on scroll container, not window
  el.addEventListener(
    'scroll',
    () => {
      el.querySelector('#land-nav').classList.toggle('land-nav--scrolled', el.scrollTop > 8);
    },
    { passive: true }
  );

  // Demo tab switcher — event delegation
  el.querySelector('#land-demo-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    const key = tab.dataset.tab;
    el.querySelectorAll('[data-tab]').forEach((t) =>
      t.classList.toggle('land-tab--active', t === tab)
    );
    el.querySelectorAll('[data-panel]').forEach((p) =>
      p.classList.toggle('land-panel--active', p.dataset.panel === key)
    );
  });

  // Scroll-reveal — root: el (the scroll container)
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('land-revealed');
          io.unobserve(entry.target);
        }
      }),
    { root: el, threshold: 0.12 }
  );
  el.querySelectorAll('.land-reveal').forEach((node) => io.observe(node));
}
