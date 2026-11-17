export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API requests directly to Render backend
    if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
      const targetUrl = 'https://student-management-api-us0t.onrender.com' + url.pathname + url.search;
      return fetch(new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow'
      }));
    }

    // Serve static frontend assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
