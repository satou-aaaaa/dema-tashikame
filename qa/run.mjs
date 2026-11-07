// デマたしかめの検査。問題（18の手口×2000問：答えが手がかりの印と合う・決め手・文の長さ）・今日の5問と上級（3年分）・
// 通しで遊ぶ・まちがい・ヒント・決め手・続きから・上級・練習・とことん（何百回）・たしかめ帳・実績・カレンダー・あとから・
// 古いタブ・スマホ幅・外へ通信しない・PWA・引き継ぎコード・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { checkTransfer } from "./transfer-check.mjs";
import { checkSwStall } from "./sw-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const G = createRequire(import.meta.url)(path.join(root, "gen.js"));

// ---- 1. 問題の作り方（ブラウザを使わない）----
{
  // 答えをゲームとは別の書き方で決め直す：あやしい印→広めない／出どころ・日付・公式がたしかで写真が分からなくない→広める／ほか→待つ
  const judge2 = (t) => (Object.values(t).some((x) => x.f === "red") ? "dema" : ["src", "date", "off"].every((k) => t[k].f === "ok") && t.img.f !== "unk" ? "true" : "wait");
  const bad = [], kinds = {}, ansCount = { true: 0, dema: 0, wait: 0 }, N = 2000;
  for (const k of G.KINDS) {
    const seen = new Set();
    for (let s = 0; s < N; s++) {
      const P = G.make(`${k.id}|qa${s}`), why = [];
      if (!P.acct || !P.acct.name || !P.text || !P.time) why.push("投稿が空");
      if (Object.keys(P.tools).sort().join() !== "date,img,off,src") why.push("道具が4つでない");
      if (Object.values(P.tools).some((t) => !["red", "ok", "unk", "none"].includes(t.f) || !t.t || [...t.t].length > 60)) why.push("手がかりの印・文（60字以内）");
      if (!P.photo !== (P.tools.img.f === "none")) why.push("写真が無いのに写真の手がかり・あるのに「写真なし」");
      if (P.ans !== judge2(P.tools)) why.push("答えが印と合わない");
      if (!P.keys.length || !P.keys.includes(G.LOOKTOOL[k.id])) why.push("決め手が無い・ヒントの道具が決め手でない");
      if ([...P.text].length > 70) why.push("投稿の文が70字を超える");
      if (/undefined|NaN/.test(JSON.stringify(P)) || /null/.test(JSON.stringify({ ...P, photo: 0 }))) why.push("中身に undefined");
      if (why.length) bad.push(`${k.id}|qa${s}:${why.join("・")}`);
      seen.add(G.keyText(P)); ansCount[P.ans]++;
    }
    kinds[k.id] = seen.size;
  }
  check("18の手口×2000問：答えは手がかりの印だけで決まり（別の書き方で決め直して同じ）、決め手とヒントの道具が合う", bad.length === 0, bad.slice(0, 4).join(" / "));
  check("手口は18で、やさしい5・ふつう6・むずかしい7", G.KINDS.length === 18 && [0, 1, 2].map((l) => G.kindsOf(l).length).join() === "5,6,7");
  check("どの手口にも「ほんとうに確かめるなら」（60字以内・スマホでできるやり方）がある", G.KINDS.every((k) => k.how && [...k.how].length <= 60 && G.make(`${k.id}|how`).how === k.how));
  // 足した手口は from の日から。前の日の今日の5問・上級は変えない（2026-11-08 に手口を6つ足す前の並び）
  check("手口を足しても前の日の問題は変わらない（11/7 の今日の5問・上級）", G.dailyTags("2026-11-07").join() === "official|2026-11-07:d0,photo|2026-11-07:d1,fakeacct|2026-11-07:d2,wait|2026-11-07:d3,abroad|2026-11-07:d4" && G.KINDS.filter((k) => k.from).every((k) => k.from === "2026-11-08") && [...G.dailyTags("2026-11-07"), ...G.hardTags("2026-11-07")].every((t) => !G.BY[t.split("|")[0]].from));
  const total = Object.values(kinds).reduce((a, b) => a + b, 0);
  check("ちがう投稿が300以上（好きなだけ遊べるように。shared-workflows game-dev.md F6）", total >= 300, `${total}・${JSON.stringify(kinds)}`);
  check("3つの答えがどれも出る（広める・広めない・待つ）", Object.values(ansCount).every((n) => n > N), JSON.stringify(ansCount));
  const KANJI = /株式会社|有限会社|Twitter|ツイッター|Instagram|Facebook|LINEヤフー|TikTok|NHK|毎日新聞|朝日新聞|読売新聞/;
  check("実在の会社・SNS・報道の名前を投稿に使わない", !G.KINDS.some((k) => { for (let s = 0; s < 200; s++) { const P = G.make(`${k.id}|n${s}`); if (KANJI.test(JSON.stringify(P))) return true; } return false; }));
}
{
  const bad = [], cover = new Set(); let sameAsPrev = 0, prev = "";
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(Date.parse("2026-11-07") + i * 864e5).toISOString().slice(0, 10);
    const t = G.dailyTags(d), h = G.hardTags(d), k = t.map((x) => x.split("|")[0]), hk = h.map((x) => x.split("|")[0]);
    const lv = k.map((x) => G.BY[x].lv).join("");
    if (t.length !== 5 || new Set(k).size !== 5 || lv !== "00112" || h.length !== 3 || new Set(hk).size !== 3 || hk.some((x) => G.BY[x].lv !== 2 || x === k[4])) bad.push(d);
    if (i < 60) k.concat(hk).forEach((x) => cover.add(x));
    if (k.join() === prev) sameAsPrev++; prev = k.join();
    if (JSON.stringify(G.dailyTags(d)) !== JSON.stringify(t)) bad.push(d + "同じ日で変わる");
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、手口は重ねない）と上級（むずかしい3・今日のむずかしいと別）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  check("2か月のうちに18の手口が全部出る・前の日と同じ組の日が少ない", cover.size === 18 && sameAsPrev < 40, `${cover.size}・${sameAsPrev}`);
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "gen.js"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$|^https:\/\/www\.soumu\.go\.jp\//.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの種と回の名札だけ（今日の5問・上級は日付の乱数。gen.js には無い）", (html.match(/Math\.random/g) || []).length === 2 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04）", !/;\s*\/\/[^\n]*;\s*\w/.test((gen + html).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n").replace(/https?:\/\/[^\s"'<)]+/g, "")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）|ｗｗ/.test(html + gen));
check("好きなだけ遊べる：チケット・回数制限・🔒で開くモードが無い", !/🎫|🔒|すると開く|のあとで開く|チケット|のこり回数/.test(html));
check("「このゲームについて」に総務省の出典と、本当の災害では公式を見る一言", (html.match(/www\.soumu\.go\.jp/g) || []).length >= 3 && /公式の発表を見てください/.test(html) && /作り話/.test(html));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキーだけで読む", /<script src="transfer\.js" data-game="dema-tashikame" data-keys="dema-v1"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="gen.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/dema-tashikame/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(path.join(root, "README.md"), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部、取り直して保存し（cache: reload）、外へ何も送らない", ["./index.html", "./gen.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && /cache: "reload"/.test(sw) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "デマたしかめ" && mf.icons.length >= 2 && mf.start_url === "./");
  const st = await checkSwStall(sw);
  check("PWA：通信が本文の途中で止まっても、4秒で保存した画面を返す（shared-workflows template/qa/sw-check.mjs）", st.ok, JSON.stringify(st));
  check("PWA：返したら60秒の見張りを止める", /clearTimeout\(deadline\)/.test(sw)); }
{ // とことんの並びを何百回作って、1回の中で同じ投稿が出ない・つぎ足しても重ならない（index.html の関数をそのまま動かす）
  const src = html.match(/const ERAMP[\s\S]*?\nconst starsOf/)[0].replace(/\nconst starsOf$/, "");
  const ctx = { G, Math, Date, Set, String };
  vm.runInNewContext(src + "\nthis.endlessList = endlessList;", ctx);
  let dup = 0, short = 0, lvBad = 0;
  for (let i = 0; i < 300; i++) {
    let l = ctx.endlessList(); if (l.length !== 100) short++;
    if (l.slice(0, 5).some((t) => G.make(t).lv !== 0) || l.slice(5, 15).some((t) => G.make(t).lv !== 1)) lvBad++;
    if (i < 40) l = l.concat(ctx.endlessList(l));
    const k = l.map((t) => G.keyText(G.make(t)));
    if (new Set(k).size !== k.length) dup++;
  }
  check("とことん：300回作って、1回の中で同じ投稿なし・100問ずつ・やさしい5→ふつう10の順（つぎ足しても重ならない）", dup === 0 && short === 0 && lvBad === 0, `重なり${dup}・短い${short}・順${lvBad}`);
}

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if (!f.startsWith(root + path.sep) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [], outside = [];
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  p.on("request", (r) => { const u = r.url(); if (!u.startsWith(url) && !/^data:|fonts\.(googleapis|gstatic)\.com/.test(u)) outside.push(u); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { if (await p.locator("#howto[open]").count()) await p.click("#howto-ok"); };
const curP = (p) => p.evaluate(() => { const c = __dm.cur(); return { ans: c.P.ans, keys: c.P.keys, look: __dm.G.LOOKTOOL[c.P.kind], wrong: c.wrong }; });
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("dema-v1") || "{}"));
// 決め手を調べてから正しく答える（wrong 回まちがえてから）。look=false なら何も調べずに答える
async function solve(p, { wrong = 0, look = true } = {}) {
  const c = await curP(p);
  if (look) await p.click(`.tl[data-t="${c.keys[0]}"]`);
  const wr = ["true", "dema", "wait"].filter((a) => a !== c.ans);
  for (let i = 0; i < wrong; i++) await p.click(`.ch[data-a="${wr[i]}"]`);
  await p.click(`.ch[data-a="${c.ans}"]`);
  await p.waitForSelector(".verdict");
}
const stars = (p) => p.getAttribute(".verdict .stars", "aria-label");

try {
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#howto[open]").count() === 1);
  await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  await p.reload(); await p.waitForTimeout(200);
  check("遊び方を Esc で閉じたら、開き直しても出ない（shared-workflows #186）", await p.locator("#howto[open]").count() === 0);
  await p.click("#f-how"); await p.click("#howto-ok"); await p.reload(); await p.waitForTimeout(200);
  check("「わかった」を押した直後に開き直しても遊び方が出ない", await p.locator("#howto[open]").count() === 0);
  check("ホームに今日の確かめ方が出る・上級・とことん・練習は最初から押せる", (await p.textContent("#tip")).includes("今日の確かめ方") && await p.locator("#go-h:not([disabled])").count() === 1 && await p.locator("#go-e:not([disabled])").count() === 1 && await p.locator("#go-p").count() === 1);

  await p.click("#go-d");
  const tags = await p.evaluate(() => __dm.load().runs.d.list);
  check("今日の5問は日付から決まる（gen.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面：投稿・4つの道具・3つの答え（高さ44px以上）", await p.locator("#post .tx").count() === 1 && await p.locator(".tl").count() === 4 && await p.locator(".ch").count() === 3 && (await p.$$eval(".tl, .ch", (b) => b.map((x) => x.getBoundingClientRect().height))).every((h) => h >= 44));
  // 1問目：道具を開く→まちがえる→閉じて開き直す
  let c = await curP(p);
  await p.click(`.tl[data-t="${c.keys[0]}"]`);
  const fd = await p.locator(`.fd[data-t="${c.keys[0]}"]`).textContent();
  check("道具を押すと、手がかりが印の文字（🚩/✓/？/－）つきで出る（色だけで分けない）・知らせは aria-live", /🚩 あやしい|✓ たしか|？ まだ分からない|－ 写真なし/.test(fd) && await p.getAttribute("#finds", "aria-live") === "polite");
  const wr = ["true", "dema", "wait"].find((a) => a !== c.ans);
  await p.click(`.ch[data-a="${wr}"]`);
  check("まちがえると ✕ の印と「ちがう」の文字・知らせは role=status", await p.locator(".ch.ng").count() === 1 && (await p.evaluate(() => getComputedStyle(document.querySelector(".ch.ng"), "::after").content)).includes("ちがう") && /✕ (広めるのは|どこかに|この投稿に|「🚩)/.test(await p.textContent("#msg")) && await p.getAttribute("#msg", "role") === "status");
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("途中で閉じても続きから（同じ問題・調べた道具とまちがいの印のまま）", await p.locator(".ch.ng").count() === 1 && await p.locator(".fd").count() === 1 && await p.evaluate(() => __dm.cur().i) === 0);
  await solve(p);
  check("正解すると判子・✓ 正解・手口の説明・全部の手がかり・★2（まちがい1回）", await p.locator(".stamp").count() === 1 && await p.locator(".ch.ok").count() === 1 && (await p.textContent(".verdict")).includes("手口：") && await p.locator(".fd").count() === 4 && (await stars(p)) === "星2つ");
  check("答えたあと「ほんとうに確かめるなら」とどう広がるかの一言が出る", (await p.textContent("#how")).includes(G.BY[c.kind || (await p.evaluate(() => __dm.cur().P.kind))].how) && (await p.textContent("#spread")).length > 10);
  await p.click("#next");
  // 2問目：ヒント2回
  await p.click("#hint");
  c = await curP(p);
  check("ヒント1は見る道具を光らせる（答えは言わない）", (await p.textContent("#hintbox")).includes("💡") && await p.locator(`.tl.key[data-t="${c.look}"]`).count() === 1 && await p.locator(".ch.ng").count() === 0);
  await p.click("#hint");
  check("ヒント2はちがう答えを1つ消す・ヒントは2回まで", await p.locator(".ch.ng").count() === 1 && await p.locator("#hint:disabled").count() === 1);
  // しぼったあとに残ったまちがいを選んでも、消した答えは戻らない（正解だけが残る。shared-workflows incidents/2026-11-07-hint-cut-comes-back.md）
  const left = await p.$$eval(".ch:not(.ng)", (b) => b.map((x) => x.dataset.a));
  await p.click(`.ch[data-a="${left.find((a) => a !== c.ans)}"]`);
  check("ヒント2のあとに残ったまちがいを選ぶと、正解だけが残る（消した答えが戻らない）", left.length === 2 && JSON.stringify(await p.$$eval(".ch:not(.ng)", (b) => b.map((x) => x.dataset.a))) === JSON.stringify([c.ans]));
  await solve(p);
  check("ヒント2回は★1", (await stars(p)) === "星1つ");
  await p.click("#next");
  check("次の問題でフォーカスが問題（投稿）に移る（body に戻らない）", await p.evaluate(() => document.activeElement && document.activeElement.id) === "post");
  // 3問目：何も調べずに答える
  await solve(p, { look: false });
  check("決め手を調べずに答えると★が1つへり、そう知らせる", (await stars(p)) === "星2つ" && (await p.textContent(".verdict")).includes("決め手を調べずに"));
  await p.click("#next");
  for (let i = 3; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に1問ごとの数（1・3・1・0・0。2問目はヒント2回＋しぼったあとのまちがい1回）", JSON.stringify(s1.days[TODAY]?.m) === "[1,3,1,0,0]", JSON.stringify(s1.days[TODAY]));
  const share = await p.textContent(".share");
  const places = G.PLACES.some((x) => share.includes(x));
  check("シェアの文に投稿の中身・町の名前・答えを出さない（印だけ）", /第\d+回/.test(share) && /🟢/.test(share) && !places && !/広めない|広めずに|デマ」|手口/.test(share), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「覚えたこと」・あと少しの実績・続けて遊ぶ・上級のボタン", await p.locator(".rlist div").count() === 5 && await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1);
  check("たしかめ帳に手口が載る", Object.keys(s1.dex).length === 5);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」", (await p.textContent("#go-d")).includes("結果"));
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __dm.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="2"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  check("練習は今日の記録を増やさない（たしかめ帳の数はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && Object.values(after.dex).reduce((a, b) => a + b) === Object.values(before.dex).reduce((a, b) => a + b) + 5);
  await p.click("#back");
  check("ホームにこれまでの答え（🚫 止めた・⏳ 待った・📣 伝えた）が出て、合計が確かめた数と合う", await p.locator("#anss").count() === 1 && (await p.$$eval("#anss b", (b) => b.map((x) => +x.textContent))).reduce((a, b) => a + b) === Object.values(after.dex).reduce((a, b) => a + b));
  await p.click("#go-dex");
  check("たしかめ帳に手口ごとの確かめ方（📱）が出る", (await p.textContent(".book button")).includes("📱"));
  const firstKind = await p.getAttribute(".book button", "data-k");
  await p.click(".book button");
  check("たしかめ帳の手口を押すと、その手口だけで練習", (await p.evaluate(() => __dm.load().runs.p.list)).every((t) => t.startsWith(firstKind + "|")));
  // とことん：まちがえても終わらず、「ここで降りる」で終わる。自己ベストは一度で見抜いた数
  await p.click("#back"); await p.click("#go-e");
  check("とことんは100問の並びで始まり、🎫・🌸のような数の縛りが無い", (await p.evaluate(() => __dm.load().runs.e.list.length)) === 100 && !/🎫|🌸|のこり/.test(await p.textContent("#app")));
  await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
  await solve(p, { wrong: 2 }); await p.click("#next");
  await solve(p, { wrong: 1 });
  check("とことんはまちがえても続く（4問目のあとも次へ進める）", await p.locator("#next").count() === 1 && (await p.evaluate(() => __dm.load().runs.e.miss)) === 3);
  await p.click("#next");
  await p.reload(); await p.waitForTimeout(200);
  check("とことんは閉じても続きから", (await p.textContent("#go-e")).includes("続きから（5問目）"));
  await p.click("#go-e"); await p.click("#quit"); await p.waitForTimeout(150);
  check("「ここで降りる」で終わり、一度で見抜いた数（2）が自己ベストに残る", (await mem(p)).ebest === 2 && (await p.textContent("#eres")).includes("4投稿") && (await p.textContent("#eclean")).includes("一度で見抜いた投稿 2"));
  {
    // とことんを使い切りそうになったら並びを足して続ける
    await p.click("#go-e");
    await p.evaluate(() => __dm.save((s) => { const r = s.runs.e; r.res = r.list.slice(0, 98).map(() => ({ m: 0 })); }));
    await p.evaluate(() => __dm.play("e")); await p.waitForTimeout(100);
    const L = await p.evaluate(() => __dm.load().runs.e.list), k = L.map((t) => G.keyText(G.make(t)));
    check("とことんは並びを使い切る前に100問を足して続く（足しても同じ投稿なし）", L.length === 200 && new Set(k).size === 200 && await p.locator(".ch").count() === 3);
    await p.click("#quit");
  }
  {
    // 保存に失敗しているとき（容量がいっぱい）に「ここで降りる」を押しても、とことんの途中経過が戻らない
    const q = await newPage(); await closeHow(q);
    await q.click("#go-e"); await solve(q); await q.click("#next");
    await q.evaluate(() => { Storage.prototype._set = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); }; });
    await q.click("#quit"); await q.waitForTimeout(100);
    const back = await q.evaluate(() => __dm.load().runs.e);
    check("保存できないときは「保存できませんでした」を1回だけ知らせる（黙っていない）", await q.locator(".toast", { hasText: "保存できませんでした" }).count() === 1);
    await q.evaluate(() => { Storage.prototype.setItem = Storage.prototype._set; __dm.home(); });
    check("保存に失敗しているときに降りても、とことんの回が戻らない（続きからが出ない）", back === null && !(await q.textContent("#go-e")).includes("続きから"), JSON.stringify(back && back.id));
    await q.close();
  }
  {
    const q = await newPage(); await closeHow(q);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("dema-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.dex = { photo: '"><b id="xss2">' }; s.ans = { wait: "<i id=xss4>" }; s.runs = { e: { mode: "e", id: "x", date: "2026-11-07", list: ["photo|1"], res: [], clean: '"><i id="xss3">' }, h: { list: "bad", res: [] }, p: { mode: "p", id: "y", date: "2026-11-07", list: ["constructor|1"], res: [] }, d: { mode: "d", id: "z", date: "x", list: ["photo|1"], res: [] }, a3: { mode: "a", id: "a3", date: "2026-11-02", list: ["photo|1", "old|2"], res: [{ m: 0 }], cur: { i: 1, tag: "old|2", wrong: ["<b>"], hints: 0 } } }; s.days = { "2026-11-05": { m: "x" }, bad: { m: [0] }, "2026-02-30": { m: [0] } }; localStorage.setItem("dema-v1", JSON.stringify(s)); });
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __dm.load());
    check("記録の形を直す：数の所の文字は0に・形のちがう途中経過と日ごとの記録は捨てる", st.ebest === 0 && st.dex.photo === 0 && st.ans.wait === 0 && st.runs.e.clean === 0 && !("h" in st.runs) && !("p" in st.runs) && !("d" in st.runs) && st.runs.a3 && st.runs.a3.cur === null && Object.keys(st.days).length === 0);
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150);
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3, #xss4").count() === 0);
    await q.context().close();
  }
  await p.click("#back").catch(() => {}); await p.goto(url); await p.waitForTimeout(150); await p.click("#go-ach");
  check("実績は13個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 13 && await p.locator(".agrp").count() === 3 && await p.locator(".ach.got").count() >= 2);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  check("このゲームについて：確かめ方と出典", (await p.textContent("#about")).includes("発信元") && await p.locator("#about a").count() >= 3);
  await p.context().close();

  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部★3で初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("全部見きわめ"));
    await q.click("#back"); await q.click("#go-d");
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  {
    const q = await newPage();
    await q.evaluate(([d2, d3]) => { localStorage.setItem("dema-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0], k: [] }, [d3]: { m: [1, 0, 0, 2, 0], k: [] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0, ans: {} })); }, [dayBefore(2), dayBefore(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __dm.lateDays(__dm.load()));
    const exp = [1, 4, 5, 6, 7].map(dayBefore).filter((d) => d >= "2026-11-07");
    check("カレンダー：取りこぼした過去7日（第1回より後）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    if (lateList.length) {
      const d = lateList[0];
      await q.click(`.cal .miss[data-k="${d}"]`).catch(async () => { await q.click("#prev"); await q.click(`.cal .miss[data-k="${d}"]`); });
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __dm.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日・シェア・Ko-fi に数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
    } else check("あとから：第1回の日（2026-11-07）より前は遊べない", lateList.length === 0 && TODAY <= "2026-11-08");
    await q.context().close();
  }

  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d");
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await solve(a);
    const cb = await curP(b); await b.click(`.ch[data-a="${cb.ans}"]`);
    await b.waitForTimeout(200);
    const s = await mem(a);
    check("古いタブで同じ問題に答えても二重に数えない", s.runs.d.res.length === 1 && Object.values(s.dex).reduce((x, y) => x + y) === 1);
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await a.click("#hint"); await a.click("#hint"); await a.click('.tl[data-t="date"]');
    await b.click("#hint");
    const cc = (await mem(a)).runs.d.cur;
    check("別のタブで使ったヒント・調べた道具を減らさない", cc.hints === 2 && cc.open.includes("date"));
    await ctx.close();
  }

  {
    const bad = [], small = [];
    for (const w of [320, 390]) {
      const q = await newPage(w); await closeHow(q);
      for (const go of [null, "#go-d", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e", "#f-about"]) {
        if (go === "solve") { await solve(q); }
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => b.getBoundingClientRect().height < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}/${go}:${x}`));
      }
      if (w === 320) { await q.goto(url); await q.waitForTimeout(100); await q.click("#go-d"); await q.click(".tl >> nth=0"); await q.screenshot({ path: path.join(root, "qa-report", "play-320.png"), fullPage: true }).catch(() => {}); }
      await q.context().close();
    }
    check("幅320pxでも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ44px以上", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }
  {
    const q = await newPage(); await closeHow(q);
    const names = await q.evaluate(() => Object.keys({ flood: 1, crack: 1, fire: 1, wave: 1, shelf: 1, rock: 1, truck: 1, rain: 1, smoke: 1, dark: 1, line: 1, cloud: 1, tornado: 1, talk: 1, river: 1, tree: 1, rubble: 1, "animal:🦁": 1 }).filter((k) => !/写真：.+/.test(__dm.photoSvg(k)) || /写真：写真/.test(__dm.photoSvg(k))));
    check("どの写真の絵にも読み上げ用の名前がある", names.length === 0, names.join(","));
    const used = new Set(); for (const k of G.KINDS) for (let s = 0; s < 300; s++) { const P = G.make(`${k.id}|ph${s}`); if (P.photo) used.add(P.photo.startsWith("animal:") ? "animal:🦁" : P.photo); }
    const miss = await q.evaluate((u) => u.filter((k) => /写真：写真/.test(__dm.photoSvg(k))), [...used]);
    check("問題で使う写真の場面は、全部絵がある", miss.length === 0, miss.join(","));
    await q.focus("#go-d"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const c2 = await curP(q);
    await q.focus(`.tl[data-t="${c2.keys[0]}"]`); await q.keyboard.press("Enter");
    await q.focus(`.ch[data-a="${c2.ans}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    check("キーボードだけで調べて答えられる", await q.locator(".verdict").count() === 1 && (await stars(q)) === "星3つ");
    await q.context().close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await ctx.close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

try {
  const sample = { "dema-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-07": { m: [0, 1, 0, 0, 2], k: ["photo", "old", "rumor", "wait", "ai"] } }, hdays: {}, adays: {}, dex: { photo: 1, old: 1, rumor: 1, wait: 1, ai: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, ans: { dema: 4, wait: 1 }, t: 1 }) };
  await checkTransfer({ browser, url, game: "dema-tashikame", sample, check, open: async (pg) => { if (await pg.locator("#howto[open]").count()) await pg.click("#howto-ok"); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));
check("外へ通信しない（文字のほかに自分のサイト以外へ取りに行かない）", outside.length === 0, outside.slice(0, 3).join(","));

{
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# デマたしかめ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
