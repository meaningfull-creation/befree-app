// 最小限のZIP書き出し。管理画面の「まとめてダウンロード」で使う。
//
// このプロジェクトは外部パッケージを増やさない方針なので、ZIPの仕様
// (APPNOTE.TXT の Local file header / Central directory / End of central directory)
// に沿って自前で組み立てている。圧縮はNode組み込みのzlibのdeflateRawを使う。
//
// 対応しているのは「ファイルだけ・UTF-8のファイル名・ZIP64なし」の範囲。
// CSVを数本まとめる用途には十分で、4GBを超えるような使い方は想定していない。

import { deflateRawSync } from "node:zlib";

// CRC-32(IEEE 802.3)。ZIPの各エントリに必要。
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// JSのDateを、ZIPが使うMS-DOSの日付・時刻形式に変換する。
// DOS時刻は2秒刻み・1980年起点。1980年より前は表現できないので切り上げる。
export function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) & 0x1f);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

// files: [{ name, content }] — content は文字列かBuffer
export function createZip(files, now = new Date()) {
  const { time, day } = dosDateTime(now);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, "utf8");
    const compressed = deflateRawSync(data);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // ローカルファイルヘッダの署名
    local.writeUInt16LE(20, 4); // 展開に必要なバージョン(2.0)
    local.writeUInt16LE(0x0800, 6); // ファイル名がUTF-8であることを示すフラグ
    local.writeUInt16LE(8, 8); // 圧縮方式: deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // 拡張フィールドなし
    localParts.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // セントラルディレクトリの署名
    central.writeUInt16LE(20, 4); // 作成したバージョン
    central.writeUInt16LE(20, 6); // 展開に必要なバージョン
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // 拡張フィールドなし
    central.writeUInt16LE(0, 32); // コメントなし
    central.writeUInt16LE(0, 34); // ディスク番号
    central.writeUInt16LE(0, 36); // 内部属性
    central.writeUInt32LE(0, 38); // 外部属性
    central.writeUInt32LE(offset, 42); // このエントリのローカルヘッダ位置
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // セントラルディレクトリ終端の署名
  end.writeUInt16LE(0, 4); // ディスク番号
  end.writeUInt16LE(0, 6); // セントラルディレクトリの開始ディスク
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // コメントなし

  return Buffer.concat([...localParts, centralDir, end]);
}

export function zipResponse(buffer, filename) {
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
