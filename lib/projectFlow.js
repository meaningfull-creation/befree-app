// プロジェクト(=契約)の進行フローの状態判定。
// 契約成立 → 実行中 → 完了報告 → 企業が確認 → 契約完了 の5段階のうち、
// 今どこにいるかを Project のフィールドだけから導出する純粋ロジック(DB接続不要・テスト可能)。
//
// 状態遷移:
//   契約成立時                     … completionRequestedAt=null, completedAt=null      → 実行中
//   人材が完了を報告               … completionRequestedAt=<日時>                       → 企業が確認
//   企業が差し戻し                 … completionRequestedAt=null, completionRejectedAt=<日時> → 実行中
//   企業が承認                     … status="completed", completedAt=<日時>             → 契約完了

export const PROJECT_FLOW_STEPS = [
  { key: "contracted", label: "契約成立", hint: "業務委託契約が成立しプロジェクトが開始" },
  { key: "running", label: "実行中", hint: "90日プランに沿ってタスクを進める" },
  { key: "reported", label: "完了報告", hint: "人材が作業の完了を報告する" },
  { key: "confirming", label: "企業が確認", hint: "企業が成果を確認して承認/差し戻し" },
  { key: "completed", label: "契約完了", hint: "契約完了。稼働枠が解放される" },
];

// PROJECT_FLOW_STEPS上の現在地(index)を返す。
export function projectFlowStepIndex(project) {
  if (!project) return 0;
  if (project.completedAt || project.status === "completed") return 4;
  if (project.completionRequestedAt) return 3;
  return 1;
}

// 一覧・ダッシュボードで使う状態バッジの表示内容。
// タスクと同じ配色ルール(グレー=待ち / オレンジ=要対応・進行中 / 緑=完了)に揃えている。
export function projectStatusMeta(project) {
  const p = project || {};
  if (p.completedAt || p.status === "completed") {
    return { key: "completed", label: "契約完了", fg: "#FFFFFF", bg: "#1E9E5A", border: "#1E9E5A" };
  }
  if (p.completionRequestedAt) {
    return { key: "confirming", label: "完了確認待ち", fg: "#FFFFFF", bg: "#F46919", border: "#F46919" };
  }
  if (p.status === "paused") {
    return { key: "paused", label: "一時停止", fg: "#5B6B82", bg: "#FFFFFF", border: "#B9C4D3" };
  }
  return { key: "running", label: "進行中", fg: "#C35414", bg: "#FFF3EA", border: "#F46919" };
}

// 完了フローで、そのロールが今とれる操作を返す(UIのボタン出し分けとAPIの前提を1箇所に揃える)。
// 返り値: "request" | "await_confirmation" | "confirm" | "await_report" | "none"
export function completionActionFor(project, myRole) {
  const p = project || {};
  if (p.completedAt || p.status === "completed") return "none";
  if (myRole === "talent") return p.completionRequestedAt ? "await_confirmation" : "request";
  if (myRole === "company") return p.completionRequestedAt ? "confirm" : "await_report";
  return "none";
}
