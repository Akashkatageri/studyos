import { TodoItem } from '../types';

/**
 * Pure data sanitization utility to deduplicate todos and maintain data integrity.
 * Does not mutate business logic properties (e.g. repeat settings).
 */
export function sanitizeTodos(todos: TodoItem[]): TodoItem[] {
  if (!Array.isArray(todos)) return [];

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const cleaned: TodoItem[] = [];

  for (const item of todos) {
    if (!item || !item.id) continue;

    // Remove exact ID duplicates
    if (seenIds.has(item.id)) continue;

    // Deduplicate uncompleted tasks created on the same date with identical title
    const titleKey = `${(item.title || '').trim().toLowerCase()}_${item.dateCreated}_${item.completed}`;
    if (seenKeys.has(titleKey)) continue;

    seenIds.add(item.id);
    seenKeys.add(titleKey);
    cleaned.push({ ...item });
  }

  return cleaned;
}
