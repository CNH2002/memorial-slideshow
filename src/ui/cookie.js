export function mountCookieBanner() {
  if (localStorage.getItem('cookie-consent')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  Object.assign(banner.style, {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    zIndex: '9999',
    background: '#1e2123',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '0.875rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
    fontFamily: "'DM Sans', sans-serif",
  });

  banner.innerHTML = `
    <p style="font-size:0.75rem;color:rgba(107,101,96,0.75);line-height:1.6;margin:0;flex:1;min-width:0;">
      This site uses anonymous analytics to measure performance.
      No personal data is collected and no photos leave your device.
      <a id="cookie-privacy-link" href="#"
         style="color:#768479;text-decoration:underline;text-underline-offset:3px;cursor:pointer;">
        Privacy Policy
      </a>
    </p>
    <button id="cookie-accept"
            style="flex-shrink:0;font-family:'DM Sans',sans-serif;font-size:0.6875rem;
                   font-weight:500;text-transform:uppercase;letter-spacing:0.22em;
                   padding:0.625rem 1.25rem;background:#768479;color:#191b1d;
                   border:none;cursor:pointer;transition:opacity 200ms ease;white-space:nowrap;">
      Got it
    </button>
  `;

  document.body.appendChild(banner);
  document.body.classList.add('has-cookie-banner');

  function dismiss() {
    localStorage.setItem('cookie-consent', 'accepted');
    document.body.classList.remove('has-cookie-banner');
    banner.remove();
  }

  const acceptBtn = banner.querySelector('#cookie-accept');
  acceptBtn.addEventListener('click', dismiss);
  acceptBtn.addEventListener('mouseenter', () => {
    acceptBtn.style.opacity = '0.8';
  });
  acceptBtn.addEventListener('mouseleave', () => {
    acceptBtn.style.opacity = '1';
  });

  banner.querySelector('#cookie-privacy-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('slideshow:show-privacy'));
  });
}
