export function getCachedData<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(`cache_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error(`Error reading cache for key "${key}":`, e);
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Error writing cache for key "${key}":`, e);
  }
}
