import { scaleTime, ScaleTime, scaleBand, ScaleBand } from 'd3-scale';
import type { Entity, TimeRange } from '../types';

export interface TimelineBounds {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface EntityLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_BOUNDS: TimelineBounds = {
  width: 2000,
  height: 800,
  padding: { top: 40, right: 20, bottom: 40, left: 20 },
};

const TRACK_HEIGHT = 80;
const CARD_HEIGHT = 60;
const CARD_MIN_WIDTH = 100;

export class TimelineRenderer {
  private bounds: TimelineBounds;

  constructor(bounds?: Partial<TimelineBounds>) {
    this.bounds = { ...DEFAULT_BOUNDS, ...bounds };
  }

  /**
   * Create a time scale for mapping dates to x-coordinates
   */
  createTimeScale(timeRange: TimeRange): ScaleTime<number, number> {
    const { width, padding } = this.bounds;
    const effectiveWidth = width - padding.left - padding.right;

    return scaleTime()
      .domain(timeRange)
      .range([padding.left, padding.left + effectiveWidth]);
  }

  /**
   * Calculate layout positions for all entities
   */
  calculateLayout(
    entities: Entity[],
    timeScale: ScaleTime<number, number>
  ): Map<string, EntityLayout> {
    const layout = new Map<string, EntityLayout>();

    // Sort entities by time start
    const sortedEntities = [...entities].sort(
      (a, b) => a.timeStart!.getTime() - b.timeStart!.getTime()
    );

    // Assign tracks to minimize overlap
    const tracks: Array<{ end: number }> = [];

    for (const entity of sortedEntities) {
      if (!entity.timeStart) continue;

      const startX = timeScale(entity.timeStart.getTime());
      const endX = entity.timeEnd
        ? timeScale(entity.timeEnd.getTime())
        : startX + CARD_MIN_WIDTH;

      // Find the first available track
      let trackIndex = 0;
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].end < startX) {
          trackIndex = i;
          break;
        }
        trackIndex = i + 1;
      }

      // Ensure we have enough tracks
      while (tracks.length <= trackIndex) {
        tracks.push({ end: 0 });
      }

      // Calculate position
      const y = this.bounds.padding.top + trackIndex * TRACK_HEIGHT;
      const width = Math.max(endX - startX, CARD_MIN_WIDTH);

      layout.set(entity.id, {
        x: startX,
        y: y,
        width: width,
        height: CARD_HEIGHT,
      });

      // Update track end position
      tracks[trackIndex].end = endX;
    }

    return layout;
  }

  /**
   * Calculate entity width based on time duration
   */
  calculateEntityWidth(
    entity: Entity,
    timeScale: ScaleTime<number, number>
  ): number {
    if (!entity.timeStart) return CARD_MIN_WIDTH;

    const startX = timeScale(entity.timeStart.getTime());
    const endX = entity.timeEnd
      ? timeScale(entity.timeEnd.getTime())
      : startX + CARD_MIN_WIDTH;

    return Math.max(endX - startX, CARD_MIN_WIDTH);
  }

  /**
   * Generate time ticks for the scale
   */
  generateTimeTicks(timeScale: ScaleTime<number, number>, count: number = 10): Date[] {
    return timeScale.ticks(count);
  }

  /**
   * Format a date for display
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (year < 0) {
      return `${Math.abs(year)} BCE`;
    }
    if (year < 1000) {
      return `${year}`;
    }
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  /**
   * Get the total height required for all tracks
   */
  getTotalHeight(entityCount: number): number {
    const maxTracks = Math.min(entityCount, 10); // Cap at 10 tracks for initial view
    return this.bounds.padding.top + maxTracks * TRACK_HEIGHT + this.bounds.padding.bottom;
  }

  /**
   * Update bounds
   */
  setBounds(bounds: Partial<TimelineBounds>): void {
    this.bounds = { ...this.bounds, ...bounds };
  }

  /**
   * Get current bounds
   */
  getBounds(): TimelineBounds {
    return { ...this.bounds };
  }

  /**
   * Calculate time range from entities
   */
  calculateTimeRange(entities: Entity[]): TimeRange {
    if (entities.length === 0) {
      const now = new Date();
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return [yearAgo, now];
    }

    let minDate = entities[0].timeStart!;
    let maxDate = entities[0].timeEnd || entities[0].timeStart!;

    for (const entity of entities) {
      if (entity.timeStart) {
        if (entity.timeStart < minDate) {
          minDate = entity.timeStart;
        }
        const end = entity.timeEnd || entity.timeStart;
        if (end > maxDate) {
          maxDate = end;
        }
      }
    }

    // Add padding (10% on each side)
    // But ensure minimum padding for cases where all entities have the same date
    const rawSpan = maxDate.getTime() - minDate.getTime();
    const minPadding = 24 * 60 * 60 * 1000; // At least 1 day of padding on each side
    const padding = Math.max(rawSpan * 0.1, minPadding);
    return [
      new Date(minDate.getTime() - padding),
      new Date(maxDate.getTime() + padding),
    ];
  }
}
