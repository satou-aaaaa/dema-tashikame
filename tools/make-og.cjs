// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、道具と3つの答えだけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const tool = (t) => `<div style="padding:16px 26px;border-radius:20px;background:#fff;border:4px solid #1f4f8a;font-size:40px;font-weight:800">${t}</div>`;
  const st = (t, c) => `<div style="padding:6px 22px;border:6px solid ${c};color:${c};border-radius:12px;font-size:44px;font-weight:900;transform:rotate(-8deg);background:#fffd">${t}</div>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:60px 80px;background:#eef0f3;background-image:radial-gradient(#1d243318 2px,transparent 2px);background-size:28px 28px;color:#1d2433">
    <div style="font-size:34px;color:#7f2617">災害のときのデマに強くなる・1日5問</div>
    <div style="font-size:110px;font-weight:900;margin-top:6px">デマ<span style="color:#b23a26">たしかめ</span></div>
    <div style="font-size:42px;margin-top:2px">広める前に、たしかめる。</div>
    <div style="display:flex;gap:20px;margin-top:40px">${["👤 出どころ", "📅 日付", "🖼 写真", "🏛 公式"].map(tool).join("")}</div>
    <div style="display:flex;gap:30px;margin-top:34px;margin-left:10px">${st("広めない", "#b23a26")}${st("確認済み", "#1f4f8a")}${st("保留", "#8a5a00")}</div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
