(function(){
  const API_BASE = 'http://localhost:5000';
  window.KSPL_API_BASE = API_BASE;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function(input, init){
    let url = typeof input === 'string' ? input : (input && input.url) || '';
    let isApi = false;
    if (typeof url === 'string') {
      if (url.startsWith('/api/')) { url = API_BASE + url; isApi = true; }
      else if (url.startsWith('http://localhost:5000/api/')) { url = API_BASE + url.slice('http://localhost:5000'.length); isApi = true; }
      else if (url.startsWith('http://127.0.0.1:5000/api/')) { url = API_BASE + url.slice('http://127.0.0.1:5000'.length); isApi = true; }
    }
    if (!isApi) return nativeFetch(input, init);
    const next = Object.assign({}, init || {}, { credentials: 'include' });
    const headers = new Headers(next.headers || {});
    const token = localStorage.getItem('kspl_auth_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    next.headers = headers;
    return nativeFetch(url, next);
  };
})();
