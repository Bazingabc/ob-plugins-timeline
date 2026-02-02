import type { Entity, EntityType } from '../types';

export class EntityIndexer {
  private entities: Map<string, Entity> = new Map();
  private entitiesByType: Map<EntityType, Set<string>> = new Map();
  private entitiesByTag: Map<string, Set<string>> = new Map();
  private participantsMap: Map<string, Set<string>> = new Map(); // participant -> entity IDs

  /**
   * Add or update an entity in the index
   */
  upsert(entity: Entity): void {
    const isNew = !this.entities.has(entity.id);

    // Remove from old indexes if updating
    if (!isNew) {
      this.removeFromIndexes(entity.id);
    }

    // Add to main index
    this.entities.set(entity.id, entity);

    // Update type index
    if (!this.entitiesByType.has(entity.type)) {
      this.entitiesByType.set(entity.type, new Set());
    }
    this.entitiesByType.get(entity.type)!.add(entity.id);

    // Update tag indexes
    for (const tag of entity.tags) {
      if (!this.entitiesByTag.has(tag)) {
        this.entitiesByTag.set(tag, new Set());
      }
      this.entitiesByTag.get(tag)!.add(entity.id);
    }

    // Update participants index
    for (const participant of entity.participants || []) {
      if (!this.participantsMap.has(participant)) {
        this.participantsMap.set(participant, new Set());
      }
      this.participantsMap.get(participant)!.add(entity.id);
    }
  }

  /**
   * Remove an entity from the index
   */
  remove(id: string): void {
    this.entities.delete(id);
    this.removeFromIndexes(id);
  }

  /**
   * Remove from all indexes
   */
  private removeFromIndexes(id: string): void {
    // Remove from type index
    for (const [type, ids] of this.entitiesByType.entries()) {
      ids.delete(id);
      if (ids.size === 0) {
        this.entitiesByType.delete(type);
      }
    }

    // Remove from tag indexes
    for (const [tag, ids] of this.entitiesByTag.entries()) {
      ids.delete(id);
      if (ids.size === 0) {
        this.entitiesByTag.delete(tag);
      }
    }

    // Remove from participants index
    for (const [participant, ids] of this.participantsMap.entries()) {
      ids.delete(id);
      if (ids.size === 0) {
        this.participantsMap.delete(participant);
      }
    }
  }

  /**
   * Get all entities
   */
  getAll(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get an entity by ID
   */
  get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get entities by type
   */
  getByType(type: EntityType): Entity[] {
    const ids = this.entitiesByType.get(type);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.entities.get(id)!)
      .filter((e) => e !== undefined);
  }

  /**
   * Get entities by tag
   */
  getByTag(tag: string): Entity[] {
    const ids = this.entitiesByTag.get(tag);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.entities.get(id)!)
      .filter((e) => e !== undefined);
  }

  /**
   * Search entities by name or participants
   */
  search(query: string): Entity[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (e) =>
        e.name.toLowerCase().includes(lowerQuery) ||
        e.participants?.some((p) => p.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get related entities (shared tags or participants)
   */
  getRelated(entityId: string): Entity[] {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return [];
    }

    const relatedIds = new Set<string>();

    // Find entities with shared tags
    for (const tag of entity.tags) {
      const ids = this.entitiesByTag.get(tag);
      if (ids) {
        ids.forEach((id) => {
          if (id !== entityId) {
            relatedIds.add(id);
          }
        });
      }
    }

    // Find entities with shared participants
    for (const participant of entity.participants || []) {
      const ids = this.participantsMap.get(participant);
      if (ids) {
        ids.forEach((id) => {
          if (id !== entityId) {
            relatedIds.add(id);
          }
        });
      }
    }

    return Array.from(relatedIds)
      .map((id) => this.entities.get(id)!)
      .filter((e) => e !== undefined);
  }

  /**
   * Clear all indexes
   */
  clear(): void {
    this.entities.clear();
    this.entitiesByType.clear();
    this.entitiesByTag.clear();
    this.participantsMap.clear();
  }

  /**
   * Get index statistics
   */
  getStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const [type, ids] of this.entitiesByType.entries()) {
      byType[type] = ids.size;
    }
    return {
      total: this.entities.size,
      byType,
    };
  }

  /**
   * Get entities within a time range
   */
  getByTimeRange(start: Date, end: Date): Entity[] {
    return this.getAll().filter((e) => {
      if (!e.timeStart) {
        return false;
      }
      return e.timeStart <= end && (!e.timeEnd || e.timeEnd >= start);
    });
  }

  /**
   * Get entities filtered by multiple criteria
   */
  filter(options: {
    types?: EntityType[];
    tags?: string[];
    importance?: [number, number];
    searchQuery?: string;
  }): Entity[] {
    let results = this.getAll();

    // Filter by type
    if (options.types && options.types.length > 0) {
      results = results.filter((e) => options.types!.includes(e.type));
    }

    // Filter by tags (any match)
    if (options.tags && options.tags.length > 0) {
      results = results.filter((e) =>
        options.tags!.some((tag) => e.tags.includes(tag))
      );
    }

    // Filter by importance range
    if (options.importance) {
      const [min, max] = options.importance;
      results = results.filter(
        (e) => e.importance !== undefined && e.importance >= min && e.importance <= max
      );
    }

    // Filter by search query
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      results = results.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.participants?.some((p) => p.toLowerCase().includes(query))
      );
    }

    return results;
  }
}
