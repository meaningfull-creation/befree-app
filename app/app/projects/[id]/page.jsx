"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

// プロジェクト詳細の実URL(/app/projects/[id])。
// 以前はSPA内蔵版(view="projectDetail")と別実装の画面がここにあり、二重実装ゆえの
// 表示不整合(90日プランの形式ずれ等)が起きたため、SPA本体(/app?project=<id>)へ
// リダイレクトする方式に一本化した。メール内のリンク等の互換のためURLは残している。
export default function ProjectRedirect() {
  const { id } = useParams();
  useEffect(() => {
    if (id) window.location.replace(`/app?project=${id}`);
  }, [id]);
  return null;
}
