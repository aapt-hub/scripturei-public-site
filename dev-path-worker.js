import siteWorker from "./worker.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/dev") {
      url.pathname = "/dev/";
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname.startsWith("/dev/v1/reader/")) {
      url.pathname = url.pathname.slice(4);
      return siteWorker.fetch(
        new Request(url.toString(), request),
        env,
        ctx
      );
    }

    if (url.pathname === "/dev/") {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname.startsWith("/dev/")) {
      return env.ASSETS.fetch(request);
    }

    return siteWorker.fetch(request, env, ctx);
  }
};
