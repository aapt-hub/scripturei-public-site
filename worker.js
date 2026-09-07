const READER_PATHS = new Set([
  "/v1/reader/editions",
  "/v1/reader/books",
  "/v1/reader/chapters",
  "/v1/reader/passage",
]);


const unavailable = (message) =>
  new Response(message, {
    status: 503,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });

const proxyRequest = (request, hostname, extraHeaders = {}) => {
  const upstream = new URL(request.url);
  upstream.protocol = "https:";
  upstream.hostname = hostname;
  upstream.port = "";

  const headers = new Headers(request.headers);
  headers.delete("host");

  for (const [name, value] of Object.entries(extraHeaders)) {
    headers.set(name, value);
  }

  const init = {
    method: request.method,
    headers,
    redirect: request.redirect,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  return fetch(new Request(upstream.toString(), init));
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (READER_PATHS.has(url.pathname)) {
      const secret =
        typeof env.READER_API_SHARED_SECRET === "string"
          ? env.READER_API_SHARED_SECRET.trim()
          : "";

      if (!secret) return unavailable("Reader temporarily unavailable");

      return proxyRequest(request, "reader-api.scripturei.org", {
        Authorization: `Bearer ${secret}`,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
