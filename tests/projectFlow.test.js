import test from "node:test";
import assert from "node:assert/strict";
import {
  PROJECT_FLOW_STEPS,
  projectFlowStepIndex,
  projectStatusMeta,
  completionActionFor,
} from "../lib/projectFlow.js";

test("projectFlowStepIndex", async (t) => {
  await t.test("契約直後は「実行中」", () => {
    assert.equal(projectFlowStepIndex({ status: "active" }), 1);
    assert.equal(PROJECT_FLOW_STEPS[1].key, "running");
  });

  await t.test("完了報告済みは「企業が確認」", () => {
    assert.equal(projectFlowStepIndex({ status: "active", completionRequestedAt: new Date() }), 3);
    assert.equal(PROJECT_FLOW_STEPS[3].key, "confirming");
  });

  await t.test("承認済みは「契約完了」", () => {
    assert.equal(projectFlowStepIndex({ status: "completed", completedAt: new Date() }), 4);
    assert.equal(projectFlowStepIndex({ status: "active", completedAt: new Date() }), 4);
    assert.equal(projectFlowStepIndex({ status: "completed" }), 4);
  });

  await t.test("差し戻し後は「実行中」に戻る", () => {
    const rejected = { status: "active", completionRequestedAt: null, completionRejectedAt: new Date() };
    assert.equal(projectFlowStepIndex(rejected), 1);
  });

  await t.test("nullでも落ちない", () => {
    assert.equal(projectFlowStepIndex(null), 0);
  });

  await t.test("どのindexもステップ定義の範囲内", () => {
    const cases = [null, {}, { status: "paused" }, { completionRequestedAt: new Date() }, { completedAt: new Date() }];
    for (const c of cases) {
      const i = projectFlowStepIndex(c);
      assert.ok(i >= 0 && i < PROJECT_FLOW_STEPS.length, `index ${i} が範囲外`);
    }
  });
});

test("projectStatusMeta", async (t) => {
  await t.test("完了確認待ちは完了より優先されない", () => {
    // 承認済み(completedAt有)なら、報告日時が残っていても「契約完了」
    const both = { status: "completed", completionRequestedAt: new Date(), completedAt: new Date() };
    assert.equal(projectStatusMeta(both).key, "completed");
  });

  await t.test("報告済み・未承認は完了確認待ち", () => {
    assert.equal(projectStatusMeta({ status: "active", completionRequestedAt: new Date() }).key, "confirming");
  });

  await t.test("一時停止・進行中", () => {
    assert.equal(projectStatusMeta({ status: "paused" }).key, "paused");
    assert.equal(projectStatusMeta({ status: "active" }).key, "running");
  });

  await t.test("3状態の色がそれぞれ異なる(見分けやすさの担保)", () => {
    const keys = ["running", "confirming", "completed", "paused"];
    const metas = [
      projectStatusMeta({ status: "active" }),
      projectStatusMeta({ completionRequestedAt: new Date() }),
      projectStatusMeta({ completedAt: new Date() }),
      projectStatusMeta({ status: "paused" }),
    ];
    assert.deepEqual(metas.map((m) => m.key), keys);
    const swatches = metas.map((m) => `${m.bg}/${m.fg}`);
    assert.equal(new Set(swatches).size, swatches.length, "同じ配色の状態がある");
  });
});

test("completionActionFor", async (t) => {
  await t.test("人材: 未報告なら報告できる / 報告済みなら待ち", () => {
    assert.equal(completionActionFor({ status: "active" }, "talent"), "request");
    assert.equal(completionActionFor({ status: "active", completionRequestedAt: new Date() }, "talent"), "await_confirmation");
  });

  await t.test("企業: 報告が来ていれば確認できる / 来ていなければ待ち", () => {
    assert.equal(completionActionFor({ status: "active" }, "company"), "await_report");
    assert.equal(completionActionFor({ status: "active", completionRequestedAt: new Date() }, "company"), "confirm");
  });

  await t.test("完了後は双方とも操作なし", () => {
    const done = { status: "completed", completedAt: new Date() };
    assert.equal(completionActionFor(done, "talent"), "none");
    assert.equal(completionActionFor(done, "company"), "none");
  });

  await t.test("管理者・不明ロールは操作なし", () => {
    assert.equal(completionActionFor({ status: "active" }, "admin"), "none");
    assert.equal(completionActionFor({ status: "active" }, undefined), "none");
  });
});
