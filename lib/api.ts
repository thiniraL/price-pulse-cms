export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as { error?: string; message?: string }).error ||
      (data as { message?: string }).message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}
