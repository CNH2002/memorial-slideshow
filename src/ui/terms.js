export function mountTerms(container, { onBack }) {
  container.innerHTML = `
    <div id="terms-screen"
         class="h-full overflow-y-auto overflow-x-hidden bg-bg
                opacity-0 transition-opacity ease-in-out"
         style="transition-duration: 400ms">

      <nav class="sticky top-0 z-50 bg-bg/95 backdrop-blur-sm
                  flex items-center px-6 md:px-10 py-4 border-b border-white/[0.06]">
        <button id="terms-back"
                class="font-body text-[11px] uppercase tracking-[0.22em] text-muted/60
                       hover:text-linen/70 transition-colors duration-[200ms]
                       flex items-center gap-2">
          <span aria-hidden="true">←</span> Back
        </button>
      </nav>

      <div class="px-6 md:px-10 py-16 md:py-24 max-w-2xl mx-auto">

        <p class="font-body text-[10px] uppercase tracking-[0.28em] text-muted mb-4">Legal</p>
        <h1 class="font-display font-light text-linen text-4xl md:text-5xl mb-2"
            style="letter-spacing: 0.01em">Terms of Service</h1>
        <p class="font-body text-xs text-muted/40 mb-16">Last updated: June 2025</p>

        <div class="flex flex-col gap-12 font-body text-sm text-muted leading-relaxed">

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">Use of the service</h2>
            <p>Slideshow is a free, browser-based tool for displaying photo slideshows at live events. By using it, you agree to use it only for lawful purposes and only with photos you have the right to display.</p>
          </section>

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">No warranty</h2>
            <p>Slideshow is provided as-is, without warranty of any kind. We make no guarantee of uninterrupted operation, compatibility with any specific device or projector, or fitness for any particular event. You are responsible for testing the software in your venue before the event begins.</p>
          </section>

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">Your content</h2>
            <p>All photos you load remain on your device. Slideshow does not receive, store, or process your content on any server. You retain all rights to your photos. We claim no license to any content you use with this tool.</p>
          </section>

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">Limitation of liability</h2>
            <p>To the fullest extent permitted by law, Slideshow and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the service — including but not limited to technical failure during a live event.</p>
          </section>

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">Changes to these terms</h2>
            <p>We may update these terms at any time. Continued use of Slideshow after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 class="font-display text-xl text-linen font-light mb-4">Contact</h2>
            <p>Questions: <a href="mailto:carl.hornseth@gmail.com"
               class="text-sage hover:opacity-70 transition-opacity duration-[200ms]">carl.hornseth@gmail.com</a></p>
          </section>

        </div>
      </div>
    </div>
  `;

  const el = container.querySelector('#terms-screen');
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    })
  );
  el.querySelector('#terms-back').addEventListener('click', onBack);
}
