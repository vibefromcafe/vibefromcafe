export function changedFields(current: Record<string, string>, draft: Record<string, string>) {
  return Object.fromEntries(Object.entries(draft).filter(([field, value]) => value !== current[field]));
}

export function matchesAdminSearch(values: Array<string | undefined>, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || values.some((value) => value?.toLocaleLowerCase().includes(normalized));
}

export async function adminMutation(url: string, init: RequestInit, fallbackError: string) {
  try {
    const response = await fetch(url, init);
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    return response.ok ? { ok: true as const } : { ok: false as const, error: data?.error ?? fallbackError };
  } catch {
    return { ok: false as const, error: fallbackError };
  }
}
