function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Consecutive days (ending today, or yesterday if nothing yet today) with at least
 * one study session. Uses the viewer's local calendar days.
 */
export function studyStreak(timestamps: (string | Date)[], now = new Date()): number {
  const days = new Set(timestamps.map((t) => dayKey(new Date(t))));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
