function computeTotalStudyMinutes(sessions) {
  if (!Array.isArray(sessions)) return 0;
  let sum = 0;
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const n = Number(s && s.duration_minutes);
    if (Number.isFinite(n) && n > 0) sum += Math.floor(n);
  }
  return sum;
}

function computeExpectedScore(results) {
  if (!Array.isArray(results) || results.length === 0) return null;
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const n = Number(r && r.score);
    if (Number.isFinite(n)) {
      const clamped = Math.max(0, Math.min(100, Math.round(n)));
      sum += clamped;
      cnt += 1;
    }
  }
  if (cnt === 0) return null;
  return Math.round(sum / cnt);
}

module.exports = { computeTotalStudyMinutes, computeExpectedScore };

