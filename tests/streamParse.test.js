import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractPartialString } from "../lib/claude.js";

// 生成途中のJSONから表示用の文字列を取り出す処理。
// ストリーミング表示の心臓部なので、1文字ずつ流れてくる状況を再現して検証する。
describe("extractPartialString", () => {
  test("閉じている値は done:true で返す", () => {
    assert.deepEqual(extractPartialString('{"question":"売上は伸びていますか"}', "question"), {
      value: "売上は伸びていますか", done: true,
    });
  });

  test("途中までの値は done:false で、そこまでを返す", () => {
    assert.deepEqual(extractPartialString('{"question":"売上は伸びて', "question"), {
      value: "売上は伸びて", done: false,
    });
  });

  test("キーがまだ現れていなければ null", () => {
    assert.equal(extractPartialString('{"refl', "question"), null);
    assert.equal(extractPartialString('{"reflection":"なるほど"}', "question"), null);
  });

  test("キーだけ出て値がまだ始まっていなければ null", () => {
    assert.equal(extractPartialString('{"question"', "question"), null);
    assert.equal(extractPartialString('{"question":', "question"), null);
    assert.equal(extractPartialString('{"question": ', "question"), null);
  });

  test("null 値を扱える(reflectionは省略されうる)", () => {
    assert.deepEqual(extractPartialString('{"reflection":null,"question":"次は?"}', "reflection"), {
      value: null, done: true,
    });
  });

  test("エスケープを展開する(改行・引用符・バックスラッシュ)", () => {
    assert.deepEqual(extractPartialString('{"q":"1行目\\n2行目 \\"引用\\" \\\\ 終わり"}', "q"), {
      value: '1行目\n2行目 "引用" \\ 終わり', done: true,
    });
  });

  test("エスケープされた引用符を終端と誤認しない", () => {
    const r = extractPartialString('{"q":"彼は\\"はい\\"と答えた","next":1}', "q");
    assert.equal(r.done, true);
    assert.equal(r.value, '彼は"はい"と答えた');
  });

  test("エスケープの途中(\\\\ で切れた)でも壊れない", () => {
    assert.deepEqual(extractPartialString('{"q":"途中\\', "q"), { value: "途中", done: false });
  });

  test("\\u エスケープを展開し、途中で切れても壊れない", () => {
    assert.deepEqual(extractPartialString('{"q":"\\u3042\\u3044"}', "q"), { value: "あい", done: true });
    assert.deepEqual(extractPartialString('{"q":"\\u30', "q"), { value: "", done: false });
  });

  test("1文字ずつ流れてきても、最終的に完全な値になる", () => {
    const full = '{"reflection":"なるほど、\\"現場\\"が課題ですね","question":"では、採用はどうですか?","options":["A","B"]}';
    let buf = "";
    let lastQ = null;
    for (const ch of full) {
      buf += ch;
      const r = extractPartialString(buf, "question");
      if (r) lastQ = r;
      // 途中経過は常に最終値の前方一致でなければならない(表示が巻き戻らないこと)
      if (r && r.value !== null) {
        assert.ok("では、採用はどうですか?".startsWith(r.value), `巻き戻り: ${r.value}`);
      }
    }
    assert.deepEqual(lastQ, { value: "では、採用はどうですか?", done: true });
    assert.deepEqual(extractPartialString(full, "reflection"), {
      value: 'なるほど、"現場"が課題ですね', done: true,
    });
    // 流し終えたJSONはそのままパースできる
    assert.equal(JSON.parse(full).options.length, 2);
  });

  test("似た名前のキーを取り違えない", () => {
    const s = '{"questionType":"open","question":"本命"}';
    assert.deepEqual(extractPartialString(s, "question"), { value: "本命", done: true });
  });
});
