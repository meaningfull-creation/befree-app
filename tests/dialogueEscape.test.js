import { test } from "node:test";
import assert from "node:assert/strict";
import { NO_MATCHING_OPTION_ANSWER, NO_MATCHING_OPTION_NOTE } from "../lib/dialogueAnswers.js";
import {
  buildDialogNextQuestionPrompt,
  buildDialogScorePrompt,
  buildAxisDeepDivePrompt,
  buildAxisDeepDiveSummaryPrompt,
} from "../lib/dialoguePrompts.js";
import {
  buildTalentDialogNextQuestionPrompt,
  buildTalentDialogScorePrompt,
  buildTalentAxisDeepDivePrompt,
  buildTalentAxisDeepDiveSummaryPrompt,
} from "../lib/talentDialoguePrompts.js";

const companyForm = {
  name: "テスト商事",
  industry: "飲食・フードサービス",
  headcount: "10〜30名",
  phase: "成長期",
  revenue: "1〜5億円",
};

// 経験2年目のユーザー(「3年未満」を選ぶ)からのフィードバックが起点なので、
// デフォルトはその条件にしておく。
const talentForm = {
  name: "山田太郎",
  title: "店長",
  industry: "飲食・フードサービス",
  years: "3年未満",
  functionAreas: [],
  workStyles: [],
  values: [],
};

const escapeHistory = [{ q: "得意な領域は何ですか?", a: NO_MATCHING_OPTION_ANSWER }];
const normalHistory = [{ q: "得意な領域は何ですか?", a: "店舗運営" }];

// --- 採点プロンプト: 逃げ道の回答で減点させない -------------------------------

test("採点プロンプトには「当てはまるものがない」の扱いが必ず入る", () => {
  for (const prompt of [
    buildDialogScorePrompt(companyForm, escapeHistory),
    buildTalentDialogScorePrompt(talentForm, escapeHistory),
    buildAxisDeepDiveSummaryPrompt(companyForm, "組織・人材", 50, "メモ", escapeHistory),
    buildTalentAxisDeepDiveSummaryPrompt(talentForm, "組織・人材", 30, "メモ", escapeHistory),
  ]) {
    assert.ok(prompt.includes(NO_MATCHING_OPTION_NOTE), "採点時の注意書きが欠けている");
  }
});

// --- 次の質問プロンプト: 同じことを聞き直さない -------------------------------

test("逃げ道が選ばれた次の質問では、聞き直しを禁止する指示が入る", () => {
  for (const prompt of [
    buildDialogNextQuestionPrompt(companyForm, escapeHistory),
    buildTalentDialogNextQuestionPrompt(talentForm, escapeHistory),
    buildAxisDeepDivePrompt(companyForm, "組織・人材", "メモ", escapeHistory),
    buildTalentAxisDeepDivePrompt(talentForm, "組織・人材", "メモ", escapeHistory),
  ]) {
    assert.match(prompt, /聞き直/, "聞き直しを禁止する指示が欠けている");
  }
});

test("通常の回答では、聞き直し禁止ではなく通常のreflection指示になる", () => {
  for (const prompt of [
    buildDialogNextQuestionPrompt(companyForm, normalHistory),
    buildTalentDialogNextQuestionPrompt(talentForm, normalHistory),
  ]) {
    assert.ok(!prompt.includes("聞き直"), "通常回答なのに聞き直し禁止の分岐が出ている");
    assert.ok(prompt.includes("店舗運営"), "直前の回答が渡っていない");
  }
});

test("選択肢を出す質問では、逃げ道を選択肢に重複させないよう指示する", () => {
  for (const prompt of [
    buildDialogNextQuestionPrompt(companyForm, []),
    buildTalentDialogNextQuestionPrompt(talentForm, []),
    buildAxisDeepDivePrompt(companyForm, "組織・人材", "メモ", []),
    buildTalentAxisDeepDivePrompt(talentForm, "組織・人材", "メモ", []),
  ]) {
    assert.ok(prompt.includes(NO_MATCHING_OPTION_ANSWER), "逃げ道ボタンの存在が伝わっていない");
  }
});

// --- 経験年数による質問の難易度調整 -------------------------------------------

test("経験が浅い人には、自己評価を求める聞き方を禁止する", () => {
  for (const years of ["3年未満", "3〜5年"]) {
    const prompt = buildTalentDialogNextQuestionPrompt({ ...talentForm, years }, []);
    assert.match(prompt, /得意な領域/, "禁止する悪い例が示されていない");
    assert.match(prompt, /絶対にしないで/, "禁止の指示が弱い");
  }
});

test("経験が長い人には、浅い人向けの制約を付けない", () => {
  for (const years of ["5〜10年", "10〜15年", "15〜20年", "20年以上"]) {
    const prompt = buildTalentDialogNextQuestionPrompt({ ...talentForm, years }, []);
    assert.ok(!prompt.includes("絶対にしないで"), `${years} に浅い人向けの制約が付いている`);
    assert.ok(prompt.includes(years), `${years} が文面に反映されていない`);
  }
});

test("経験年数が未指定でも、プロンプトに undefined が混ざらない", () => {
  for (const years of [undefined, null, ""]) {
    const prompt = buildTalentDialogNextQuestionPrompt({ ...talentForm, years }, []);
    assert.ok(!prompt.includes("undefined"), "undefined が混ざっている");
    assert.ok(!prompt.includes("null"), "null が混ざっている");
  }
});
