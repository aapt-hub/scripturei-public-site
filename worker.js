export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const readerRoutes = new Set([
      "/v1/reader/editions",
      "/v1/reader/books",
      "/v1/reader/chapters",
      "/v1/reader/passage",
    ]);

    if (readerRoutes.has(url.pathname)) {
      if (!env.READER_API_SHARED_SECRET) {
        return new Response("Reader upstream is not configured", { status: 503 });
      }

      const upstream = new URL(request.url);
      upstream.protocol = "https:";
      upstream.hostname = "reader-api.scripturei.org";
      upstream.port = "";

      const headers = new Headers(request.headers);
      headers.set("Authorization", `Bearer ${env.READER_API_SHARED_SECRET}`);
      const upstreamRequest = new Request(upstream.toString(), {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: request.redirect,
      });

      return fetch(upstreamRequest);
    }

    return env.ASSETS.fetch(request);
  },
};
