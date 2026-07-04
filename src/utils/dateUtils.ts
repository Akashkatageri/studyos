/**
 * Returns the local date string formatted as YYYY-MM-DD.
 * This completely avoids timezone-shift issues where UTC dates (like toISOString())
 * misidentify today's date for users in negative/positive timezone offsets.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
