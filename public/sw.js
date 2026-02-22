if (!self.define) {
  let e,
    s = {};
  const a = (a, n) => (
    (a = new URL(a + ".js", n).href),
    s[a] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          ((e.src = a), (e.onload = s), document.head.appendChild(e));
        } else ((e = a), importScripts(a), s());
      }).then(() => {
        let e = s[a];
        if (!e) throw new Error(`Module ${a} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, t) => {
    const c =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[c]) return;
    let i = {};
    const r = (e) => a(e, c),
      o = { module: { uri: c }, exports: i, require: r };
    s[c] = Promise.all(n.map((e) => o[e] || r(e))).then((e) => (t(...e), i));
  };
}
define(["./workbox-f1770938"], function (e) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/static/5UYQ_hxedF_qJ39bOgIK5/_buildManifest.js",
          revision: "bd422381b088ff750893ec5a86e001c8",
        },
        {
          url: "/_next/static/5UYQ_hxedF_qJ39bOgIK5/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/155.ad0fee426f72b8e2.js",
          revision: "ad0fee426f72b8e2",
        },
        {
          url: "/_next/static/chunks/237-177c351eadd27501.js",
          revision: "177c351eadd27501",
        },
        {
          url: "/_next/static/chunks/381-a66a1b61873847fd.js",
          revision: "a66a1b61873847fd",
        },
        {
          url: "/_next/static/chunks/4bd1b696-096d35a2bd1da3af.js",
          revision: "096d35a2bd1da3af",
        },
        {
          url: "/_next/static/chunks/505-c465d568c5e00577.js",
          revision: "c465d568c5e00577",
        },
        {
          url: "/_next/static/chunks/634.9126d812ed265e9e.js",
          revision: "9126d812ed265e9e",
        },
        {
          url: "/_next/static/chunks/712.ec5678aba6ca6b5f.js",
          revision: "ec5678aba6ca6b5f",
        },
        {
          url: "/_next/static/chunks/80.0d13551d6e88ded2.js",
          revision: "0d13551d6e88ded2",
        },
        {
          url: "/_next/static/chunks/app/%5Blocale%5D/layout-8af9f3e6ab6da741.js",
          revision: "8af9f3e6ab6da741",
        },
        {
          url: "/_next/static/chunks/app/%5Blocale%5D/page-e92d88739b59b796.js",
          revision: "e92d88739b59b796",
        },
        {
          url: "/_next/static/chunks/app/_global-error/page-5011c76bb988cf64.js",
          revision: "5011c76bb988cf64",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-88cd0ffb41982bbc.js",
          revision: "88cd0ffb41982bbc",
        },
        {
          url: "/_next/static/chunks/app/layout-3c910c3db0db0a86.js",
          revision: "3c910c3db0db0a86",
        },
        {
          url: "/_next/static/chunks/app/manifest.webmanifest/route-5011c76bb988cf64.js",
          revision: "5011c76bb988cf64",
        },
        {
          url: "/_next/static/chunks/app/page-5011c76bb988cf64.js",
          revision: "5011c76bb988cf64",
        },
        {
          url: "/_next/static/chunks/ed9f2dc4-b9e1549029731e73.js",
          revision: "b9e1549029731e73",
        },
        {
          url: "/_next/static/chunks/framework-75892d61b920805f.js",
          revision: "75892d61b920805f",
        },
        {
          url: "/_next/static/chunks/main-app-88a834e4c4e67f25.js",
          revision: "88a834e4c4e67f25",
        },
        {
          url: "/_next/static/chunks/main-c9d05eefa1b20261.js",
          revision: "c9d05eefa1b20261",
        },
        {
          url: "/_next/static/chunks/next/dist/client/components/builtin/app-error-5011c76bb988cf64.js",
          revision: "5011c76bb988cf64",
        },
        {
          url: "/_next/static/chunks/next/dist/client/components/builtin/forbidden-5011c76bb988cf64.js",
          revision: "5011c76bb988cf64",
        },
        {
          url: "/_next/static/chunks/next/dist/client/components/builtin/global-error-8b8229cb9b17bc10.js",
          revision: "8b8229cb9b17bc10",
        },
        {
          url: "/_next/static/chunks/next/dist/client/components/builtin/not-found-5011c76bb988cf64.js",
          revision: "5011c76bb988cf64",
        },
        {
          url: "/_next/static/chunks/next/dist/client/components/builtin/unauthorized-5011c76bb988cf64.js",
          revision: "5011c76bb988cf64",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-f16e185ea8ef6564.js",
          revision: "f16e185ea8ef6564",
        },
        {
          url: "/_next/static/css/9fdad70daa2545a1.css",
          revision: "9fdad70daa2545a1",
        },
        {
          url: "/_next/static/media/4cf2300e9c8272f7-s.p.woff2",
          revision: "18bae71b1e1b2bb25321090a3b563103",
        },
        {
          url: "/_next/static/media/747892c23ea88013-s.woff2",
          revision: "a0761690ccf4441ace5cec893b82d4ab",
        },
        {
          url: "/_next/static/media/8d697b304b401681-s.woff2",
          revision: "cc728f6c0adb04da0dfcb0fc436a8ae5",
        },
        {
          url: "/_next/static/media/93f479601ee12b01-s.p.woff2",
          revision: "da83d5f06d825c5ae65b7cca706cb312",
        },
        {
          url: "/_next/static/media/9610d9e46709d722-s.woff2",
          revision: "7b7c0ef93df188a852344fc272fc096b",
        },
        {
          url: "/_next/static/media/ba015fad6dcf6784-s.woff2",
          revision: "8ea4f719af3312a055caf09f34c89a77",
        },
        { url: "/file.svg", revision: "d09f95206c3fa0bb9bd9fefabfd0ea71" },
        { url: "/globe.svg", revision: "2aaafa6a49b6563925fe440891e32717" },
        { url: "/next.svg", revision: "8e061864f388b47f33a1c3780831193e" },
        { url: "/vercel.svg", revision: "c0af2f507b369b085b35ef4bbe3bcf1e" },
        { url: "/window.svg", revision: "a2760511c65806022ad20adf74370ff3" },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({ response: e }) =>
              e && "opaqueredirect" === e.type
                ? new Response(e.body, {
                    status: 200,
                    statusText: "OK",
                    headers: e.headers,
                  })
                : e,
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: "next-static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ sameOrigin: e, url: { pathname: s } }) =>
        !(!e || s.startsWith("/api/auth/callback") || !s.startsWith("/api/")),
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: a }) =>
        "1" === e.headers.get("RSC") &&
        "1" === e.headers.get("Next-Router-Prefetch") &&
        a &&
        !s.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc-prefetch",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: a }) =>
        "1" === e.headers.get("RSC") && a && !s.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ url: { pathname: e }, sameOrigin: s }) => s && !e.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ sameOrigin: e }) => !e,
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET"
    ));
});
