(() => {
  if (!['11gor.com', 'www.11gor.com'].includes(location.hostname)) return;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-8835RRD4G5');
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-8835RRD4G5';
    document.head.appendChild(script);
  }

  if (window.__affiliateClickTrackingInstalled) return;
  window.__affiliateClickTrackingInstalled = true;

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const link = target && target.closest('a[href]');
    if (!link) return;

    let destination;
    try {
      destination = new URL(link.href, location.href);
    } catch {
      return;
    }

    const hostname = destination.hostname.toLowerCase();
    const rel = new Set((link.getAttribute('rel') || '').toLowerCase().split(/\s+/).filter(Boolean));
    let network = '';
    if (hostname === 'amzn.to' || hostname === 'amazon.co.jp' || hostname.endsWith('.amazon.co.jp')) {
      network = 'amazon';
    } else if (hostname === 'a8.net' || hostname.endsWith('.a8.net')) {
      network = 'a8';
    } else if (rel.has('sponsored')) {
      network = 'affiliate';
    }
    if (!network) return;

    window.gtag('event', 'affiliate_click', {
      affiliate_network: network,
      link_domain: hostname,
      link_text: (link.getAttribute('aria-label') || link.textContent || '').trim().slice(0, 80),
      transport_type: 'beacon'
    });
  }, { capture: true });
})();
