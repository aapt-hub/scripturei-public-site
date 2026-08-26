export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/v1/reader/")) {
      const upstream = new URL(request.url);
      upstream.protocol = "https:";
      upstream.hostname = "reader-api.scripturei.org";
      upstream.port = "";

      const upstreamRequest = new Request(upstream.toString(), request);

      return fetch(upstreamRequest);
    }

    return env.ASSETS.fetch(request);
  },
};
