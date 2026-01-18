const CACHE_PREFIX = 'sanskrit_cache_';
const CACHE_VERSION = 'v1_';

export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = localStorage.getItem(CACHE_PREFIX + CACHE_VERSION + key);
    if (!item) return null;
    
    const { data, expires } = JSON.parse(item);
    if (Date.now() > expires) {
      localStorage.removeItem(CACHE_PREFIX + CACHE_VERSION + key);
      return null;
    }
    
    return data as T;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T, ttlSeconds: number = 3600) {
  if (typeof window === 'undefined') return;
  
  try {
    const item = {
      data,
      expires: Date.now() + ttlSeconds * 1000
    };
    localStorage.setItem(
      CACHE_PREFIX + CACHE_VERSION + key,
      JSON.stringify(item)
    );
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
}

export function clearAllCache() {
  if (typeof window === 'undefined') return;
  
  Object.keys(localStorage)
    .filter(key => key.startsWith(CACHE_PREFIX))
    .forEach(key => localStorage.removeItem(key));
}
