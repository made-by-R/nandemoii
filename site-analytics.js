(() => {
  if (!['11gor.com', 'www.11gor.com'].includes(location.hostname)) return;
  if (typeof window.gtag === 'function') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-8835RRD4G5');
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-8835RRD4G5';
  document.head.appendChild(script);
})();
