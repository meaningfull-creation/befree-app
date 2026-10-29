import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { createZip, crc32, dosDateTime } from "../lib/zip.js";

// CRC-32の既知の値。ここがずれると、展開時に「壊れている」と判定される。
test("CRC-32が既知の値と一致する", () => {
  assert.equal(crc32(Buffer.from("")), 0);
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  assert.equal(crc32(Buffer.from("The quick brown fox jumps over the lazy dog")), 0x414fa339);
});

test("MS-DOS形式の日時に変換できる(2秒刻み・1980年起点)", () => {
  const { time, day } = dosDateTime(new Date(2026, 9, 29, 13, 45, 31));
  assert.equal((day >> 9) + 1980, 2026);
  assert.equal((day >> 5) & 0x0f, 10); // 10月
  assert.equal(day & 0x1f, 29);
  assert.equal(time >> 11, 13);
  assert.equal((time >> 5) & 0x3f, 45);
  assert.equal((time & 0x1f) * 2, 30); // 31秒 → 2秒刻みで30
  // 1980年より前は表現できないので切り上げる
  assert.equal((dosDateTime(new Date(1970, 0, 1)).day >> 9) + 1980, 1980);
});

test("ZIPの構造が仕様どおりに並ぶ", () => {
  const zip = createZip([{ name: "a.txt", content: "hello" }]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50, "ローカルファイルヘッダの署名が違う");
  // 末尾22バイトがセントラルディレクトリ終端
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50, "終端レコードの署名が違う");
  assert.equal(zip.readUInt16LE(end + 8), 1, "エントリ数が違う");
  // ファイル名がUTF-8であることを示すフラグ
  assert.equal(zip.readUInt16LE(6) & 0x0800, 0x0800);
});

test("中身をdeflateで復元できる(日本語・BOM付きCSVを含む)", () => {
  const body = "﻿氏名,メール\r\n山田太郎,a@example.com\r\n";
  const zip = createZip([{ name: "talents.csv", content: body }]);
  const nameLen = zip.readUInt16LE(26);
  const extraLen = zip.readUInt16LE(28);
  const compressedLen = zip.readUInt32LE(18);
  const start = 30 + nameLen + extraLen;
  const restored = inflateRawSync(zip.subarray(start, start + compressedLen)).toString("utf8");
  assert.equal(restored, body);
  assert.equal(zip.subarray(30, 30 + nameLen).toString("utf8"), "talents.csv");
  assert.equal(zip.readUInt32LE(22), Buffer.byteLength(body, "utf8"), "展開後サイズが違う");
});

test("実際のunzipコマンドで展開できる", () => {
  const dir = mkdtempSync(join(tmpdir(), "zip-test-"));
  const path = join(dir, "out.zip");
  writeFileSync(
    path,
    createZip([
      { name: "talents.csv", content: "﻿氏名\r\n山田太郎\r\n" },
      { name: "companies.csv", content: "﻿会社名\r\nテスト商事\r\n" },
    ])
  );
  // -t は各エントリのCRCを検証する。壊れていればここで落ちる。
  execFileSync("unzip", ["-t", path]);
  execFileSync("unzip", ["-o", "-q", path, "-d", dir]);
  assert.match(readFileSync(join(dir, "talents.csv"), "utf8"), /山田太郎/);
  assert.match(readFileSync(join(dir, "companies.csv"), "utf8"), /テスト商事/);
});

test("空のZIPも作れる", () => {
  const zip = createZip([]);
  assert.equal(zip.length, 22);
  assert.equal(zip.readUInt32LE(0), 0x06054b50);
});
