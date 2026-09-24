// Порожній або з самих пробілів опис — це «опису немає», а не порожній рядок,
// який форма заявки показала б як пусте пояснення.
export function normalizeDescription(
  description: string | null | undefined,
): string | null {
  return description?.trim() || null;
}
