// 保存済みの入力内容をフォームに戻すときの下ごしらえ(v6.14)。
//
// 途中離脱した方のレコードは項目が歯抜けになりうるし、管理画面で書き換えられていることもある。
// そのまま<select>のvalueに渡すと、どの選択肢にも一致せず未選択の空のプルダウンになってしまう。
// 画面(app/app/page.jsx)から使うが、単体テストできるようここに切り出している。

export const OTHER_OPTION = "その他(自由入力)";

// null/undefinedの項目は既定値のままにして、入っている項目だけ上書きする。
// 名前が空のレコード(アカウント作成だけで離脱)は、復元しても意味がないので既定値を返す。
export function mergeRestoredForm(defaults, initialForm) {
  if (!initialForm?.name) return defaults;
  const filled = Object.fromEntries(Object.entries(initialForm).filter(([, v]) => v !== null && v !== undefined));
  return { ...defaults, ...filled };
}

// 選択肢に無い値だったら既定値に寄せる(プルダウンが空欄になるのを防ぐ)
export function pickOption(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

// 選択肢に無い値を「その他(自由入力)」+自由入力欄に振り分ける
export function splitOtherValue(value, options) {
  if (!value || options.includes(value)) return { value: value || options[0], other: "" };
  return { value: OTHER_OPTION, other: value };
}
