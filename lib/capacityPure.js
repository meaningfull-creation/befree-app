// 外部依存(Prisma等)を持たない純粋ロジック。単体テストから直接importして検証できる。

// 進行中の契約数が上限(maxConcurrentEngagements)未満かどうか(BeFree_マッチングロジック設計.md セクション5)
export function isTalentAvailable(talent, activeCountByTalent) {
  const active = activeCountByTalent[talent.id] || 0;
  const max = talent.capacity?.maxConcurrentEngagements ?? 3;
  return active < max;
}
