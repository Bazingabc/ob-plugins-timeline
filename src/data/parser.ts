import { TFile, MetadataCache } from 'obsidian';
import type { ParsedEntity, Entity, EntityType } from '../types';

export class FrontmatterParser {
  /**
   * Parse a single file into an entity
   */
  parseEntity(file: TFile, cache: MetadataCache): ParsedEntity | null {
    const fileCache = cache.getFileCache(file);
    if (!fileCache?.frontmatter) {
      return null;
    }

    const fm = fileCache.frontmatter;
    const timeStart = this.parseTimeField(fm.time_start || fm.born);
    const timeEnd = this.parseTimeField(fm.time_end || fm.died);

    // Require at least a time_start to be considered a timeline entity
    if (!timeStart) {
      return null;
    }

    const type = this.parseEntityType(fm.type);
    const name = fm.name || file.basename;

    const entity: ParsedEntity = {
      id: file.path,
      type,
      name,
      timeStart,
      timeEnd,
      participants: this.parseParticipants(fm.participants),
      tags: this.parseTags(fm.tags),
      importance: this.parseImportance(fm.importance),
      location: fm.location,
      frontmatter: fm,
      content: '', // Could be populated if needed
    };

    return entity;
  }

  /**
   * Parse time field into Date object
   * Supports: ISO format (1069-01-01), year only (1069), negative years (-221)
   */
  parseTimeField(value: unknown): Date | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    const str = String(value).trim();

    // Handle negative years (BCE)
    const yearMatch = str.match(/^(-?\d+)$/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      // Create a date for the year (January 1st)
      // Note: JavaScript's Date has issues with years before 100 CE, but we'll do our best
      const date = new Date();
      date.setFullYear(Math.abs(year), 0, 1);
      if (year < 0) {
        // BCE - mark as negative
        (date as unknown as { year: number }).year = year;
      }
      return date;
    }

    // Try parsing as ISO date
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date;
    }

    return undefined;
  }

  /**
   * Parse entity type with default fallback
   */
  private parseEntityType(value: unknown): EntityType {
    const validTypes: EntityType[] = ['person', 'event', 'concept', 'location'];
    const type = String(value).toLowerCase() as EntityType;
    if (validTypes.includes(type)) {
      return type;
    }
    return 'event'; // Default
  }

  /**
   * Parse participants array from frontmatter
   */
  private parseParticipants(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    return [];
  }

  /**
   * Parse tags array from frontmatter
   */
  private parseTags(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    return [];
  }

  /**
   * Parse importance rating (1-5)
   */
  private parseImportance(value: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
    const num = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (num >= 1 && num <= 5) {
      return num as 1 | 2 | 3 | 4 | 5;
    }
    return undefined;
  }

  /**
   * Extract wikilinks from content
   * Matches [[wikilink]] and [[wikilink|alias]]
   */
  extractWikilinks(content: string): string[] {
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    const links: string[] = [];
    let match;
    while ((match = wikilinkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }
    return links;
  }
}
