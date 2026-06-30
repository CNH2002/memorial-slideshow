export function mountPrivacy(container, { onBack }) {
  container.innerHTML = `
    <div id="privacy-screen"
         class="h-full overflow-y-auto overflow-x-hidden bg-bg
                opacity-0 transition-opacity ease-in-out"
         style="transition-duration: 400ms">

      <nav class="sticky top-0 z-50 bg-bg/95 backdrop-blur-sm
                  flex items-center px-6 md:px-10 py-4 border-b border-white/[0.06]">
        <button id="privacy-back"
                class="font-body text-[11px] uppercase tracking-[0.22em] text-muted/60
                       hover:text-linen/70 transition-colors duration-[200ms]
                       flex items-center gap-2">
          <span aria-hidden="true">←</span> Back
        </button>
      </nav>

      <div class="px-6 md:px-10 py-16 md:py-24 max-w-2xl mx-auto">

        <p class="font-body text-[10px] uppercase tracking-[0.28em] text-muted mb-4">Legal</p>
        <h1 class="font-display font-light text-linen text-4xl md:text-5xl mb-2"
            style="letter-spacing: 0.01em">Privacy Policy</h1>
        <p class="font-body text-xs text-muted/40 mb-16">Last updated: June 2025</p>

        <div class="flex flex-col gap-12 font-body text-sm text-muted leading-relaxed">

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">What we collect</h2>
            <p>Nothing.</p>
            <p class="mt-3">Slideshow has no server, no account system, and no database. Your photos are processed entirely within your browser — no image, file name, or metadata is ever transmitted to any server operated by Slideshow.</p>
          </section>

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">Your photos</h2>
            <p>All photo processing happens locally using the Web File API. Files are temporarily held in browser memory and optionally cached in your device's IndexedDB for session restore. No photo data is ever sent over the network.</p>
          </section>

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">Analytics</h2>
            <p>This site uses Vercel Web Analytics to collect anonymous, aggregate page-view data — page URL, referrer, country, and device type. No personal identifiers, no cookies, and no cross-site tracking. Vercel Analytics is GDPR-compliant by design.</p>
          </section>

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">Cookies &amp; local storage</h2>
            <p>Slideshow stores a single entry in localStorage (<code class="text-sage text-xs bg-surface px-1.5 py-0.5 rounded">cookie-consent</code>) to remember your acknowledgement of this notice. No third-party cookies are set.</p>
          </section>

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">Contact</h2>
            <p>Questions about this policy: <a href="mailto:carl.hornseth@gmail.com"
               class="text-sage hover:opacity-70 transition-opacity duration-[200ms]">carl.hornseth@gmail.com</a></p>
          </section>

        </div>
      </div>
    </div>
  `;

  const el = container.querySelector('#privacy-screen');
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    })
  );
  el.querySelector('#privacy-back').addEventListener('click', onBack);
}
