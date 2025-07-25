export function readValue<T>(
  key: string,
  initialValue: T,
  version: number = 1
): T {
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      const { value, version: localStorageVersion } = JSON.parse(item);
      return localStorageVersion === version ? value : initialValue;
    }
    return initialValue;
  } catch (error) {
    console.warn(`Error reading localStorage key “${key}”:`, error);
    return initialValue;
  }
}

export function saveValue<T>(key: string, value: T, version: number = 1) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ version, value }));
  } catch (error) {
    console.warn(`Error setting localStorage key “${key}”:`, error);
  }
}
