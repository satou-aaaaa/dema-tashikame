// デマたしかめを端末に保存して、電波が無くても遊べるようにする（PWA）。
// 画面は先にネットを見て、つながらないときだけ保存したものを使う（直した版がすぐ届く）。
// 記録（localStorage）には触らない。外へ何も送らない（よそのサイト＝文字の取り寄せは扱わない）。
const CACHE = "dema-v2";
const SHELL = ["./", "./index.html", "./gen.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dema-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const fromCache = () => caches.match(req, { ignoreSearch: true })
    .then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
    .catch(() => undefined); // 保存したものを読めなくても、必ず返事を返す（ネットの返事か Response.error()）
  const net = fetch(req);
  // 保存し直しはイベントの中で waitUntil に預ける（返したあとも保存できる。60秒で待つのをやめる）
  let saved = () => {};
  e.waitUntil(new Promise((r) => { saved = r; setTimeout(r, 60000); }));
  e.respondWith(new Promise((resolve) => {
    let sent = false;
    let deadline = 0;
    const send = (r) => { if (sent) return; sent = true; clearTimeout(slow); clearTimeout(deadline); resolve(r); };
    // 4秒たっても本文まで届かなければ保存したものを返す（見出しだけ届いて本文が止まる返事でも。shared-workflows incidents/2026-11-07-sw-body-stall.md）
    const slow = setTimeout(() => fromCache().then((hit) => hit && send(hit)), 4000);
    // 60秒たっても何も返せないときの最後の返事（返したら止める）
    deadline = setTimeout(() => fromCache().then((hit) => send(hit || Response.error())), 60000);
    net.then((res) => {
      if (!res.ok) saved();
      if (res.ok) {
        // 本文を読み終えてから返し、同じ中身を保存し直す（保存の失敗は無視する）
        return res.clone().arrayBuffer().then((buf) => {
          send(new Response(buf, { status: res.status, statusText: res.statusText, headers: res.headers }));
          caches.open(CACHE).then((c) => c.put(req, new Response(buf, { status: res.status, statusText: res.statusText, headers: res.headers }))).catch(() => {}).then(saved);
        }, () => fromCache().then((hit) => send(hit || Response.error())));
      }
      if (res.status >= 500) return fromCache().then((hit) => send(hit || res));
      send(res);
    }, () => { saved(); return fromCache().then((hit) => send(hit || Response.error())); });
  }));
});
