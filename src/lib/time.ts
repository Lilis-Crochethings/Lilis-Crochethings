// Shared "time spent" display formatting — used anywhere hoursSpent is
// shown as text (creation/pattern detail pages, the gallery info card).
// Rounds to the nearest 5 minutes (rather than fixed decimal places on the
// hour) so e.g. 1.3 reads as "1 h 20 min" instead of a bare "1.3h" — a
// recorded time is already an estimate, so a round-number minute count
// reads more naturally than an oddly precise one.
export function formatHours(hours: number): string {
  const totalMinutes = Math.round((hours * 60) / 5) * 5;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
