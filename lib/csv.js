// CSV出力の共通処理。管理画面の各エクスポートから使う。
// 外部ライブラリを足さず、Node組み込みだけで完結させる方針に合わせている。

// Excelで開いたときに文字化けしないよう、先頭に付けるUTF-8 BOM
export const CSV_BOM = "﻿";

export function csvEscape(value) {
  const s = value == null ? "" : String(value);
  // Excelが素直に読めるよう、改行・カンマ・引用符を含む値だけ引用符で囲む
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsvRow(values) {
  return values.map(csvEscape).join(",") + "\r\n";
}

// ヘッダ行 + データ行からCSV全体を組み立てる(BOM付き)
export function buildCsv(headers, rows) {
  return CSV_BOM + toCsvRow(headers) + rows.map(toCsvRow).join("");
}

// ダウンロードとして返すためのResponse
export function csvResponse(csv, filename) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
