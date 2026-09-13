(function(){
  const API_BASE = 'https://koutilya-citizen-api.onrender.com';
  const LOCATIONS_SOURCE = 'https://raw.githubusercontent.com/mchittineni/india-village-finder/main/andhra_pradesh/data/andhra_pradesh_villages.csv';
  window.KSPL_API_BASE = API_BASE;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function(input, init){
    let url = typeof input === 'string' ? input : (input && input.url) || '';
    let isApi = false;
    if (typeof url === 'string') {
      if (url === '/locations.csv' || url.endsWith('/locations.csv')) {
        url = LOCATIONS_SOURCE;
      } else if (url.startsWith('/api/')) { url = API_BASE + url; isApi = true; }
      else if (url.startsWith('http://localhost:5000/api/')) { url = API_BASE + url.slice('http://localhost:5000'.length); isApi = true; }
      else if (url.startsWith('http://127.0.0.1:5000/api/')) { url = API_BASE + url.slice('http://127.0.0.1:5000'.length); isApi = true; }
    }
    if (!isApi) return nativeFetch(url, init);
    const next = Object.assign({}, init || {}, { credentials: 'include' });
    const headers = new Headers(next.headers || {});
    const token = localStorage.getItem('kspl_auth_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    next.headers = headers;
    return nativeFetch(url, next);
  };
})();
// Location data source refresh: use the LGD-derived Andhra Pradesh village dataset.
// Deployment refresh marker.
