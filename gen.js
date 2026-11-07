// デマたしかめ：問題（架空のSNSの投稿）を種から作る。同じ tag ならいつも同じ投稿になる。
// 投稿・アカウント・町・川はすべて架空。実在の人・投稿は使わない。
// 確かめ方は総務省「上手にネットと付き合おう！」偽・誤情報（発信元・時期・一次情報・ほかの情報と比べる）と、
// 総務省検討会の資料（災害時は善意の拡散が多い・別の場所の画像や動画・AIで作った画像）に合わせる。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  // 道具：出どころ・日付・写真・公式（4つ）
  const TOOLS = [
    { id: "src", icon: "👤", name: "出どころ", ask: "だれが言った？ 元の情報は？" },
    { id: "date", icon: "📅", name: "日付", ask: "いつの話？" },
    { id: "img", icon: "🖼", name: "写真", ask: "同じ写真が前にも？" },
    { id: "off", icon: "🏛", name: "公式・報道", ask: "市や気象台・ニュースは？" },
  ];
  // 選ぶ答え：広める（出どころごと）・広めない（デマ）・広めずに待つ（まだ分からない）
  const ANS = { true: "広める", dema: "広めない", wait: "広めずに待つ" };
  const ANS_LONG = { true: "広める（出どころごと）", dema: "広めない（デマ・誤り）", wait: "広めずに待つ（まだ分からない）" };
  // 手がかりの印：red＝あやしい・ok＝たしか・unk＝まだ分からない・none＝写真なし
  // 答えはこの印だけで決まる（QA が全部の問題で確かめる）：あやしい印が1つでも→広めない。出どころ・日付・公式がたしか→広める。ほか→待つ
  function judge(tools) {
    const f = (id) => tools[id].f;
    if (TOOLS.some((t) => f(t.id) === "red")) return "dema";
    if (f("src") === "ok" && f("date") === "ok" && f("off") === "ok" && f("img") !== "unk") return "true";
    return "wait";
  }

  const PLACES = ["みなと市", "さくら町", "かわべ市", "ひばり台市", "あおば町", "しらかわ市", "もみじ市", "つばさ町", "ほしの市", "みずほ町", "ゆうひ市", "こがね町"];
  const RIVERS = ["みどり川", "しらさぎ川", "あさひ川", "ひかり川", "すずかけ川", "やなぎ川"];
  const ANIMALS = [["ライオン", "🦁"], ["トラ", "🐯"], ["クマ", "🐻"], ["ワニ", "🐊"], ["ゾウ", "🐘"], ["ヒョウ", "🐆"]];
  const PEOPLE = [["まちの声", "😊"], ["通りすがり", "🙂"], ["きょうの空", "☁️"], ["ねこ好き", "🐱"], ["朝の散歩", "🌱"], ["週末キャンプ", "⛺"], ["駅前ベーカリー", "🥐"], ["りんご農家", "🍎"], ["ランニング日記", "👟"], ["鉄道好き", "🚃"]];
  const SPREAD = [["防災まとめ速報", "📢"], ["拡散ニュース", "📣"], ["最新情報まとめ", "⚡"], ["みんなに知らせて", "🔔"]];

  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
  const pickN = (R, arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const handle = (R, p) => "@" + p + "_" + String(ri(R, 100, 9999));
  const now = (R) => `きょう ${ri(R, 6, 21)}:${String(ri(R, 0, 59)).padStart(2, "0")}`;
  const ago = (R) => `${ri(R, 3, 50)}分前`;
  const rts = (R, a, b) => ri(R, a, b) * 100;
  const T = (f, t) => ({ f, t });
  const NOIMG = T("none", "この投稿に写真はありません。");
  const person = (R) => { const [n, i] = pick(R, PEOPLE); return { name: n, id: handle(R, "user"), icon: i, mark: "" }; };
  const spreader = (R) => { const [n, i] = pick(R, SPREAD); return { name: n, id: handle(R, "news"), icon: i, mark: "" }; };
  const offAcct = (R, place, who) => ({ name: `${place}${who || ""}（公式）`, id: handle(R, "official"), icon: "🏛", mark: "✓" });

  // 手口（たしかめ帳の種類）。make は 投稿 { acct, time, text, photo, rt, tools, scene } を返す
  const KINDS = [
    // ---- やさしい ----
    { id: "photo", lv: 0, name: "写真の使い回し", look: "🖼 写真を調べてみましょう。同じ写真が前にも出ていませんか？",
      why: "前の災害や別の場所の写真が、今のことのように回ることがあります。",
      make(R) {
        const P = pick(R, PLACES), y = ri(R, 2012, 2021), [an, ae] = pick(R, ANIMALS), rv = pick(R, RIVERS);
        const sc = pick(R, [
          { text: `地震で${P}の動物園から${an}がにげた！ 外に出ないで！ 拡散して！`, photo: "animal:" + ae, img: `同じ写真が${y}年に、外国の町の記事に出ていました。`, off: `${P}の動物園は「動物はにげていません」と発表。` },
          { text: `いま${P}の駅前がこんなことに… ${rv}があふれた！`, photo: "flood", img: `同じ写真が${y}年の、別の県の大雨の記事にあります。`, off: `${P}は「${rv}の水はあふれていません」と発表。` },
          { text: `${P}の大通りが地震でまっぷたつ！ 近づかないで！`, photo: "crack", img: `同じ写真が${y}年の、外国の地震の記事にありました。`, off: `${P}は「大通りに大きな被害はない」と発表。` },
          { text: `${P}の工場が燃えてる！ 有害なガスが出るから窓をしめて！`, photo: "fire", img: `同じ写真が${y}年の、別の国の火事の記事にありました。`, off: `消防は「${P}で工場の火事はない」と発表。` },
          { text: `${P}の海岸にものすごい大波！ 早くにげて！`, photo: "wave", img: `同じ写真が${y}年に、外国の台風の記事に出ていました。`, off: `気象台は「${P}の海に、いま津波の警報・注意報はない」と発表。` },
        ]);
        return { acct: spreader(R), time: ago(R), text: sc.text, photo: sc.photo, rt: rts(R, 30, 200),
          tools: { src: T("unk", "まとめのアカウント。どこで写したかは書いていません。"), date: T("ok", "投稿は少し前。今の話として書いています。"), img: T("red", sc.img), off: T("red", sc.off) } };
      } },
    { id: "old", lv: 0, name: "古い話の使い回し", look: "📅 日付を調べてみましょう。いつの話でしょう？",
      why: "助けを求める投稿や品切れの話は、終わったあとも長く回り続けます。",
      make(R) {
        const P = pick(R, PLACES), y = ri(R, 2016, 2023), m = ri(R, 1, 12);
        const sc = pick(R, [
          { text: `【拡散希望】${P}の家に、おばあさんが取り残されています。だれか助けて！`, photo: null, date: `元の投稿は${y}年${m}月。その日のうちに助け出されたと、本人が書いています。` },
          { text: `${P}の店から水とパンが全部なくなった！ 今すぐ買いに行って！`, photo: "shelf", date: `元の投稿は${y}年${m}月。前の大雪のときの話です。` },
          { text: `${P}の給水所はこちら。水をもらえるよ！ みんなに回して！`, photo: null, date: `元の投稿は${y}年${m}月。前の災害のときの給水所で、今は開いていません。` },
          { text: `${P}の山道でがけくずれ。この道は通れません！`, photo: "rock", date: `元の投稿は${y}年${m}月。道はもう直って、通れます。` },
        ]);
        return { acct: person(R), time: `${ri(R, 2, 9)}時間前に共有`, text: sc.text, photo: sc.photo, rt: rts(R, 50, 400),
          tools: { src: T("ok", "近くに住む人の投稿。本人が書いたものです。"), date: T("red", sc.date), img: sc.photo ? T("ok", "本人が写した写真です（ただし、同じ日のもの）。") : NOIMG, off: T("unk", `${P}は、いまこの話について何も出していません。`) } };
      } },
    { id: "official", lv: 0, name: "公式の発表", look: "🏛 公式・報道を調べてみましょう。市や気象台は何と言っていますか？",
      why: "市・気象台などの本物の公式は、確かめた情報の元です。広めるときは出どころごと伝えます。",
      make(R) {
        const P = pick(R, PLACES), rv = pick(R, RIVERS), h = ri(R, 13, 18);
        const sc = pick(R, [
          { who: "", text: `${P}は、小学校と公民館に避難所を開きました。食べ物と毛布があります。`, photo: null },
          { who: "", text: `給水車が来ています。${P}役所の前で、${h}時まで水を配ります。入れ物を持ってきてください。`, photo: "truck" },
          { who: "", text: `${rv}の近くの道は、${h}時から通行止めです。ほかの道を通ってください。`, photo: null },
          { who: "防災", text: `大雨で土砂災害の危険が高まっています。山のそばに住む人は、早めに安全な所へ。`, photo: "rain" },
          { who: "", text: `${P}の停電は、${h}時ごろに直る見こみです。冷蔵庫の物は早めに食べてください。`, photo: null },
        ]);
        return { acct: offAcct(R, P, sc.who), time: now(R), text: sc.text, photo: sc.photo, rt: rts(R, 10, 90),
          tools: { src: T("ok", `${P}のホームページから案内されている、本物の公式アカウントです。`), date: T("ok", "きょうの投稿です。"), img: sc.photo ? T("ok", "市が写した写真。前に出た写真は見つかりません。") : NOIMG, off: T("ok", `${P}のホームページにも同じ知らせ。ニュースも伝えています。`) } };
      } },
    // ---- ふつう ----
    { id: "rumor", lv: 1, name: "出どころが無いうわさ", look: "👤 出どころを調べてみましょう。元の情報はどこにありますか？",
      why: "「知り合いが言っていた」は元の情報がたどれません。広めず、公式の発表を見ます。",
      make(R) {
        const P = pick(R, PLACES), d = ri(R, 2, 6);
        const sc = pick(R, [
          { text: `知り合いの消防の人によると、今夜もっと大きな地震が来るらしい。みんなに知らせて！`, off: "気象庁は「日時と場所を決めた地震の予知は、今はできない」としています。" },
          { text: `友だちのお父さんが役所の人で、${P}の水道の水は飲むなって。家族に回して！`, off: `${P}は「水道の水は安全です」と発表しています。` },
          { text: `病院で働く人から聞いた話。${d}日後に${P}の全部の店がしまるんだって。`, off: `${P}は「店をしめる決まりはありません」と発表しています。` },
          { text: `ある専門家が「${P}のダムがもうすぐこわれる」と言っていたらしい。すぐにげて！`, off: `ダムを管理する県は「ダムに異常はない」と発表しています。` },
        ]);
        return { acct: person(R), time: ago(R), text: sc.text, photo: null, rt: rts(R, 40, 300),
          tools: { src: T("red", "「〜らしい」「聞いた話」だけで、元の発表や記事は見つかりません。"), date: T("ok", "投稿は少し前です。"), img: NOIMG, off: T("red", sc.off) } };
      } },
    { id: "fakeacct", lv: 1, name: "なりすまし", look: "👤 出どころを調べてみましょう。本当にその人・役所のアカウントですか？",
      why: "公式によく似た名前のアカウントもあります。役所のホームページから本物を確かめます。",
      make(R) {
        const P = pick(R, PLACES), rv = pick(R, RIVERS);
        const sc = pick(R, [
          { text: `【至急】${rv}の堤防がこわれました。${P}の全員、今すぐ東の山へにげてください。`, off: `${P}の本物の公式には、この知らせはありません。` },
          { text: `${P}の小学校の避難所は、もういっぱいです。来ないでください。`, off: `${P}の本物の公式は「避難所には、まだ入れます」と発表。` },
          { text: `${P}の水道は、あすから1週間止めます。水をためておいてください。`, off: `${P}の本物の公式には、水道を止める知らせはありません。` },
        ]);
        return { acct: { name: `${P}役所（公式）`, id: handle(R, "offlclal"), icon: "🏛", mark: "" }, time: ago(R), text: sc.text, photo: null, rt: rts(R, 20, 250),
          tools: { src: T("red", "名前は公式に似ていますが、きのう作られたアカウント。市のホームページに案内はありません。"), date: T("ok", "投稿は少し前です。"), img: NOIMG, off: T("red", sc.off) } };
      } },
    { id: "wait", lv: 1, name: "まだ確かめられない話", look: "🏛 公式・報道を調べてみましょう。もう発表は出ていますか？",
      why: "本当かもしれなくても、確かめられないうちは広めず、公式の発表を待ちます。",
      make(R) {
        const P = pick(R, PLACES), rv = pick(R, RIVERS);
        const sc = pick(R, [
          { text: `${P}の駅のあたりで大きな音がして、けむりが見える。何があったの？`, photo: "smoke" },
          { text: `${P}の${rv}にかかる橋が、通れなくなっているみたい。だれか知ってる？`, photo: null },
          { text: `${P}の北の方だけ、急に停電した。いつ直るんだろう。`, photo: "dark" },
          { text: `${P}のスーパーの前に長い行列。何か配っているのかな？`, photo: "line" },
        ]);
        return { acct: person(R), time: ago(R), text: sc.text, photo: sc.photo, rt: rts(R, 1, 30),
          tools: { src: T("unk", "近くにいる人の投稿。見たことを書いていますが、くわしいことは分かりません。"), date: T("ok", "数分前の、きょうの投稿です。"), img: sc.photo ? T("ok", "新しい写真。前に出た同じ写真は見つかりません。") : NOIMG, off: T("unk", `${P}・消防・ニュースは、まだ何も伝えていません。`) } };
      } },
    { id: "chain", lv: 1, name: "「回して」の呼びかけ", look: "🏛 公式・報道を調べてみましょう。専門の役所はどう言っていますか？",
      why: "「みんなに回して」は、確かめないまま広がる合図です。まず専門の役所の説明を見ます。",
      make(R) {
        const sc = pick(R, [
          { text: "大きな地震の前には、空にへびのような「地震雲」が出る！ 見たらにげて！ みんなに回して！", photo: "cloud", off: "気象庁は「日時と場所を決めた地震の予知は、今はできない」としています。" },
          { text: "あす午前3時に大地震が来ると、海外の研究所が予言！ 家族と友だちに回して！", photo: null, off: "気象庁は「日時と場所を決めた地震の予知は、今はできない」としています。" },
          { text: "大雨のときは、車で川のようすを見に行くと安全だよ。いっしょに回して！", photo: null, off: "気象庁・市は「大雨のときは川や用水路に近づかない」と呼びかけています。" },
        ]);
        return { acct: spreader(R), time: ago(R), text: sc.text, photo: sc.photo, rt: rts(R, 100, 900),
          tools: { src: T("unk", "まとめのアカウント。元の発表は書いていません。"), date: T("ok", "きょうの投稿です。"), img: sc.photo ? T("unk", "ただの雲の写真。地震との関係は写真からは分かりません。") : NOIMG, off: T("red", sc.off) } };
      } },
    // ---- むずかしい ----
    { id: "ai", lv: 2, name: "作られた画像", look: "🖼 写真をよく見てみましょう。細かい所がおかしくありませんか？",
      why: "画像を作るAIで、本物そっくりの災害の絵が作られることがあります。細かい所と公式を確かめます。",
      make(R) {
        const P = pick(R, PLACES), rv = pick(R, RIVERS);
        const sc = pick(R, [
          { text: `${rv}があふれて、${P}が水の中…。ボートで子どもを助ける人。`, photo: "flood", img: "看板の字がくずれて読めず、人の指の数がおかしい。AIで作った絵のようです。" },
          { text: `${P}の山がくずれて、家がのみこまれた…。`, photo: "rock", img: "家の窓が溶けたようにゆがみ、影の向きがばらばら。AIで作った絵のようです。" },
          { text: `${P}の空に、見たことのない大きなたつまき！`, photo: "tornado", img: "電柱が空中でとぎれ、車の形がくずれています。AIで作った絵のようです。" },
        ]);
        return { acct: person(R), time: ago(R), text: sc.text, photo: sc.photo, rt: rts(R, 50, 500),
          tools: { src: T("unk", "ふだんは景色の写真を投稿している人。どこで写したかは書いていません。"), date: T("ok", "きょうの投稿です。"), img: T("red", sc.img), off: T("unk", `${P}は、いまのところ大きな被害の知らせを出していません。`) } };
      } },
    { id: "cut", lv: 2, name: "言葉の切り取り", look: "👤 出どころを調べてみましょう。元の発言を、はじめから終わりまで見ましたか？",
      why: "発言の一部だけを切りとると、意味が逆になることがあります。元の動画や記事を確かめます。",
      make(R) {
        const P = pick(R, PLACES);
        const sc = pick(R, [
          { text: `${P}の市長が「避難しなくていい」と言った！ ひどい！`, src: `元の会見では「3階より上の安全な所にいる人は、むりに外へ出なくていい」と話していました。` },
          { text: `気象台の人が「大雨はもう心配ない」と言っていた。安心だね。`, src: "元の会見では「雨はやんでも、川の水はこれから上がる。心配ないとは言えない」と話していました。" },
          { text: `${P}の担当の人が「水はいらない」と言った。だれも水を持ってこないで！`, src: "元の会見では「水はもう足りたので、いまは毛布がほしい」と話していました。" },
        ]);
        return { acct: spreader(R), time: ago(R), text: sc.text, photo: "talk", rt: rts(R, 80, 600),
          tools: { src: T("red", sc.src), date: T("ok", "きょうの会見の話です。"), img: T("ok", "きょうの会見の画面です。"), off: T("unk", "ニュースは会見のようすを伝えていますが、この投稿の言い方とはちがいます。") } };
      } },
    { id: "urgent", lv: 2, name: "あわてた言葉の公式", look: "👤 出どころを調べてみましょう。言葉はあわてていても、本物の公式なら？",
      why: "言葉が強くても、本物の公式が今出した知らせなら、出どころごと伝えて役に立てます。",
      make(R) {
        const P = pick(R, PLACES), rv = pick(R, RIVERS);
        const sc = pick(R, [
          { text: `【至急】${rv}の水が、あふれそうです。${rv}の近くの人は、すぐに高い所へ避難してください！`, photo: "river" },
          { text: `【大至急】${P}の南の地区に避難の指示を出しました。今すぐ避難所へ！`, photo: null },
          { text: `【緊急】がけくずれの危険！ ${P}の山のふもとの道を、すぐに通行止めにします。`, photo: null },
        ]);
        return { acct: offAcct(R, P, ""), time: now(R), text: sc.text, photo: sc.photo, rt: rts(R, 100, 800),
          tools: { src: T("ok", `${P}のホームページから案内されている、本物の公式アカウントです。`), date: T("ok", "数分前の、きょうの投稿です。"), img: sc.photo ? T("ok", "市のカメラの写真。前に出た写真は見つかりません。") : NOIMG, off: T("ok", "気象台の情報・ニュースとも合っています。") } };
      } },
    { id: "waitpic", lv: 2, name: "場所の分からない写真", look: "🖼 写真を調べてみましょう。どこの写真か分かりますか？",
      why: "写真が新しくても、場所が分からなければ確かめられません。広めずに公式を待ちます。",
      make(R) {
        const P = pick(R, PLACES);
        const sc = pick(R, [
          { text: `${P}の道が水につかってる。車は通れないよ！`, photo: "flood" },
          { text: `${P}で木がたおれて、道をふさいでる！`, photo: "tree" },
          { text: `${P}の駅のホーム、人でいっぱい。電車が止まってるみたい。`, photo: "line" },
        ]);
        return { acct: person(R), time: ago(R), text: sc.text, photo: sc.photo, rt: rts(R, 5, 60),
          tools: { src: T("unk", "ふだんは料理の写真をのせている人。その場にいたかは分かりません。"), date: T("ok", "きょうの投稿です。"), img: T("unk", "前に出た同じ写真は見つかりません。でも、どこの場所かは写真から分かりません。"), off: T("unk", `${P}・ニュースは、まだこの話を伝えていません。`) } };
      } },
    { id: "abroad", lv: 2, name: "別の場所の動画", look: "👤 出どころを調べてみましょう。どんな人が、いつも何を投稿していますか？",
      why: "目立つために、別の場所の動画で助けを求めるふりをする投稿もありました。",
      make(R) {
        const P = pick(R, PLACES);
        const sc = pick(R, [
          { text: `${P}でがれきの下に人がいる！ 早く助けに行って！（動画）`, photo: "rubble" },
          { text: `${P}の川で車が流されてる！ だれか通報して！（動画）`, photo: "flood" },
        ]);
        return { acct: { name: "Help_now", id: handle(R, "help"), icon: "🆘", mark: "" }, time: ago(R), text: sc.text, photo: sc.photo, rt: rts(R, 100, 700),
          tools: { src: T("red", "毎日ちがう国の災害の動画を投稿しているアカウント。この町の人ではありません。"), date: T("ok", "きょうの投稿です。"), img: T("unk", "前に出た同じ動画は、まだ見つかりません。"), off: T("unk", `${P}・消防は、まだこの話を伝えていません。`) } };
      } },
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // 1問を作る。tag は「手口|種」（例 "photo|2026-11-07:d0"）
  function make(tag) {
    const [kind] = String(tag).split("|"), k = BY[kind];
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)));
    const ans = judge(p.tools), keys = keyOf(p.tools, ans);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, why: k.why, ans, keys, ...p };
  }
  // 決め手の道具（どれか1つを開けば決め手を見たことになる）：広めない→あやしい印の道具、広める→出どころと公式、待つ→まだ分からない写真・公式
  function keyOf(tools, ans) {
    if (ans === "dema") return ["src", "date", "img", "off"].filter((id) => tools[id].f === "red");
    if (ans === "true") return ["src", "off"];
    return ["img", "off"].filter((id) => tools[id].f === "unk");
  }
  // 決め手は手口の look に書いた道具と同じにする（QA が見る）
  const LOOKTOOL = { photo: "img", old: "date", official: "off", rumor: "src", fakeacct: "src", wait: "off", chain: "off", ai: "img", cut: "src", urgent: "src", waitpic: "img", abroad: "src" };

  // 今日の5問（やさしい2・ふつう2・むずかしい1）。手口は重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  // 上級の3問（むずかしいだけ・今日の5問のむずかしいとは別の手口）
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }
  // 同じ問題かを見分ける印（場面の文と写真と手がかり）
  const keyText = (P) => P.kind + "|" + P.text + "|" + P.acct.name;

  const DEMA = { KINDS, BY, LV, TOOLS, ANS, ANS_LONG, LOOKTOOL, PLACES, kindsOf, seedOf, rng, make, judge, dailyTags, hardTags, pickN, keyText };
  if (typeof module !== "undefined" && module.exports) module.exports = DEMA; else root.DEMA = DEMA;
})(typeof self !== "undefined" ? self : this);
