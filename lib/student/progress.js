function computeProgressPercent(lastScore) {
  const v = lastScore == null ? 0 : Number(lastScore);
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

module.exports = { computeProgressPercent };

