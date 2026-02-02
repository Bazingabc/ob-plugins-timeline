/**
 * LRU (Least Recently Used) Cache implementation
 * Used for caching computed layouts and filtered entities
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Add new entry
    this.cache.set(key, value);

    // Evict oldest entry if at capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Cache key generators for different types of data
 */
export const CacheKeys = {
  layout: (entities: string[], timeRange: [number, number]): string => {
    return `layout:${entities.join(',')}:${timeRange[0]}-${timeRange[1]}`;
  },

  filteredEntities: (baseEntities: string[], filters: string): string => {
    return `filtered:${baseEntities.join(',')}:${filters}`;
  },

  timeScale: (timeRange: [number, number], width: number): string => {
    return `scale:${timeRange[0]}-${timeRange[1]}:${width}`;
  },
};

/**
 * Global cache instances
 */
export const layoutCache = new LRUCache<string, any>(50);
export const filteredEntitiesCache = new LRUCache<string, any[]>(50);
export const timeScaleCache = new LRUCache<string, any>(20);

/**
 * Utility function to clear all caches
 */
export function clearAllCaches(): void {
  layoutCache.clear();
  filteredEntitiesCache.clear();
  timeScaleCache.clear();
}

/**
 * Cache statistics for debugging
 */
export function getCacheStats(): Record<string, number> {
  return {
    layout: layoutCache.size(),
    filteredEntities: filteredEntitiesCache.size(),
    timeScale: timeScaleCache.size(),
  };
}
