(function(){
  const API_BASE = '';
  const LOCATIONS_SOURCE = '/api/locations';
  window.KSPL_API_BASE = API_BASE;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function(input, init){
    let url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url === '/locations.csv' || url.endsWith('/locations.csv')) url = LOCATIONS_SOURCE;
    if (url.startsWith('/api/')) {
      const next = Object.assign({}, init || {}, { credentials: 'include' });
      const headers = new Headers(next.headers || {});
      const token = localStorage.getItem('kspl_auth_token');
      if (token) headers.set('Authorization', 'Bearer '+token);
      next.headers = headers;
      return nativeFetch(url, next);
    }
    return nativeFetch(url, init);
  };
})();
