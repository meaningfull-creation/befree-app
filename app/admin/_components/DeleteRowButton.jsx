"use client";

// 一覧の行から直接削除するためのボタン。
// 詳細ページ側は「名前を正確に入力させる」確認を使っているが、一覧は
// サンプルデータをまとめて片付ける用途なので、ブラウザの確認ダイアログで代替する。
// どちらの経路でも、サーバー側で管理者判定とDB上の名前の一致を再確認している。
export default function DeleteRowButton({ action, idName, id, name, kindLabel }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`${kindLabel}「${name}」を関連データごと完全に削除します。\nこの操作は取り消せません。よろしいですか?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name={idName} value={id} />
      <input type="hidden" name="confirmText" value={name} />
      <button type="submit" className="admin-btn-danger" aria-label={`${name}を削除`}>
        削除
      </button>
    </form>
  );
}
