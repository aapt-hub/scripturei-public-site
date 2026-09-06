const READER_PATHS = new Set([
  "/v1/reader/editions",
  "/v1/reader/books",
  "/v1/reader/chapters",
  "/v1/reader/passage",
]);

const readerUnavailable = () =>
  new Response("Reader temporarily unavailable", {
    status: 503,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (READER_PATHS.has(url.pathname)) {
      const secret =
        typeof env.READER_API_SHARED_SECRET === "string"
          ? env.READER_API_SHARED_SECRET.trim()
          : "";

      if (!secret) return readerUnavailable();

      const upstream = new URL(url.toString());
      upstream.protocol = "https:";
      upstream.hostname = "reader-api.scripturei.org";
      upstream.port = "";

      const headers = new Headers(request.headers);
      headers.delete("host");
      headers.set("Authorization", `Bearer ${secret}`);

      const init = {
        method: request.method,
        headers,
        redirect: request.redirect,
      };

      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = request.body;
      }

      return fetch(new Request(upstream.toString(), init));
    }

    return env.ASSETS.fetch(request);
  },
};
