function computeProgressPercent(lastScore) {
  const v = lastScore == null ? 0 : Number(lastScore);
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function computeCompletionPercent(taken, total) {
  const t = Number(taken ?? 0);
  const all = Number(total ?? 0);
  if (!isFinite(t) || !isFinite(all) || all <= 0 || t <= 0) return 0;
  const pct = Math.round((t / all) * 100);
  return Math.max(0, Math.min(100, pct));
}

module.exports = { computeProgressPercent, computeCompletionPercent };
