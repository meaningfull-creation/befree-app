// 振込先口座のバリデーションと表示用マスク。DB接続なしの純粋ロジック(テスト可能)。
// 口座情報は報酬支払いに使う機微情報のため、保存前にここで形式を揃える。

export const ACCOUNT_TYPES = ["普通", "当座"];

// 全角英数・全角カナを半角に寄せる(金融機関の届出は半角カナが基本のため)。
const FULLWIDTH_ALNUM = /[Ａ-Ｚａ-ｚ０-９]/g;
export function toHalfWidth(s) {
  return String(s ?? "").replace(FULLWIDTH_ALNUM, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

// 口座名義は半角カナ・スペース・長音・濁点/半濁点・括弧のみ許容する。
// 全角カナで入力されることが多いため、まず半角カナへ変換する。
const KANA_FULL_TO_HALF = {
  ガ: "ｶﾞ", ギ: "ｷﾞ", グ: "ｸﾞ", ゲ: "ｹﾞ", ゴ: "ｺﾞ", ザ: "ｻﾞ", ジ: "ｼﾞ", ズ: "ｽﾞ", ゼ: "ｾﾞ", ゾ: "ｿﾞ",
  ダ: "ﾀﾞ", ヂ: "ﾁﾞ", ヅ: "ﾂﾞ", デ: "ﾃﾞ", ド: "ﾄﾞ", バ: "ﾊﾞ", ビ: "ﾋﾞ", ブ: "ﾌﾞ", ベ: "ﾍﾞ", ボ: "ﾎﾞ",
  パ: "ﾊﾟ", ピ: "ﾋﾟ", プ: "ﾌﾟ", ペ: "ﾍﾟ", ポ: "ﾎﾟ", ヴ: "ｳﾞ",
  ア: "ｱ", イ: "ｲ", ウ: "ｳ", エ: "ｴ", オ: "ｵ", カ: "ｶ", キ: "ｷ", ク: "ｸ", ケ: "ｹ", コ: "ｺ",
  サ: "ｻ", シ: "ｼ", ス: "ｽ", セ: "ｾ", ソ: "ｿ", タ: "ﾀ", チ: "ﾁ", ツ: "ﾂ", テ: "ﾃ", ト: "ﾄ",
  ナ: "ﾅ", ニ: "ﾆ", ヌ: "ﾇ", ネ: "ﾈ", ノ: "ﾉ", ハ: "ﾊ", ヒ: "ﾋ", フ: "ﾌ", ヘ: "ﾍ", ホ: "ﾎ",
  マ: "ﾏ", ミ: "ﾐ", ム: "ﾑ", メ: "ﾒ", モ: "ﾓ", ヤ: "ﾔ", ユ: "ﾕ", ヨ: "ﾖ",
  ラ: "ﾗ", リ: "ﾘ", ル: "ﾙ", レ: "ﾚ", ロ: "ﾛ", ワ: "ﾜ", ヲ: "ｦ", ン: "ﾝ",
  ァ: "ｧ", ィ: "ｨ", ゥ: "ｩ", ェ: "ｪ", ォ: "ｫ", ッ: "ｯ", ャ: "ｬ", ュ: "ｭ", ョ: "ｮ",
  "ー": "ｰ", "　": " ", "（": "(", "）": ")", "．": ".",
};
export function toHalfWidthKana(s) {
  return toHalfWidth(s)
    .split("")
    .map((c) => KANA_FULL_TO_HALF[c] ?? c)
    .join("");
}

const HOLDER_ALLOWED = /^[ｦ-ﾟA-Za-z0-9 .()\-/]+$/;

// 入力を正規化し、問題があればエラーメッセージを返す。
// 返り値: { ok: true, value: {...} } または { ok: false, error: "..." }
export function normalizeBankAccount(input) {
  const raw = input || {};
  const bankName = String(raw.bankName ?? "").trim().slice(0, 60);
  const branchName = String(raw.branchName ?? "").trim().slice(0, 60);
  const accountType = String(raw.accountType ?? "").trim();
  const accountNumber = toHalfWidth(raw.accountNumber).replace(/[\s-]/g, "");
  const accountHolder = toHalfWidthKana(raw.accountHolder).trim().toUpperCase().slice(0, 60);

  if (!bankName) return { ok: false, error: "金融機関名を入力してください" };
  if (!branchName) return { ok: false, error: "支店名を入力してください" };
  if (!ACCOUNT_TYPES.includes(accountType)) return { ok: false, error: "預金種別は「普通」か「当座」を選んでください" };
  if (!/^[0-9]{7}$/.test(accountNumber)) return { ok: false, error: "口座番号は数字7桁で入力してください" };
  if (!accountHolder) return { ok: false, error: "口座名義(カナ)を入力してください" };
  if (!HOLDER_ALLOWED.test(accountHolder)) {
    return { ok: false, error: "口座名義は半角カナ・英数字で入力してください(漢字・ひらがなは使えません)" };
  }

  return { ok: true, value: { bankName, branchName, accountType, accountNumber, accountHolder } };
}

// 画面に返す際のマスク。末尾3桁だけ残す(誤登録の確認はできるが、漏洩時の被害は抑える)。
export function maskAccountNumber(accountNumber) {
  const s = String(accountNumber ?? "");
  if (s.length <= 3) return "*".repeat(s.length);
  return "*".repeat(s.length - 3) + s.slice(-3);
}
