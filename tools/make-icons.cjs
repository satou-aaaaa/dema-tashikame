// アプリのアイコン（icon-192.png・icon-512.png）を作る。白い投稿のカードに、虫めがねと朱の判子。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#eef0f3"/>
      <rect x="14" y="18" width="62" height="56" rx="8" fill="#fff" stroke="#1d2433" stroke-width="2.5"/>
      <circle cx="26" cy="30" r="6" fill="#dfe5ee"/><rect x="36" y="27" width="30" height="5" rx="2" fill="#1d2433"/>
      <rect x="22" y="42" width="46" height="4" rx="2" fill="#4b5466"/><rect x="22" y="51" width="38" height="4" rx="2" fill="#4b5466"/>
      <circle cx="66" cy="66" r="14" fill="#ffffffcc" stroke="#1f4f8a" stroke-width="5"/><line x1="76" y1="76" x2="88" y2="88" stroke="#1f4f8a" stroke-width="7" stroke-linecap="round"/>
      <g transform="rotate(-14 34 80)"><rect x="16" y="72" width="38" height="16" rx="3" fill="none" stroke="#b23a26" stroke-width="3"/><text x="35" y="85" font-size="11" text-anchor="middle" fill="#b23a26" font-family="'Noto Sans CJK JP',sans-serif" font-weight="900">たしか</text></g>
      </svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
