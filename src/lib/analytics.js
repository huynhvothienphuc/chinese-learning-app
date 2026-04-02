const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

function hasAnalytics() {
  return typeof window !== 'undefined' && Boolean(GA_ID);
}

export function initGoogleAnalytics() {
  if (!hasAnalytics() || document.getElementById('ga4-script')) return;

  const script = document.createElement('script');
  script.async = true;
  script.id = 'ga4-script';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    send_page_view: true,
  });
}

export function trackEvent(name, params = {}) {
  if (typeof window !== 'undefined' && window.gtag && GA_ID) {
    window.gtag('event', name, params);
  }
}
