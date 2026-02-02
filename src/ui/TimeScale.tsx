import React from 'react';
import type { ScaleTime } from 'd3-scale';
import { timeYear, timeMonth, timeDay, timeHour, timeMinute } from 'd3-time';

interface TimeScaleProps {
  scale: ScaleTime<number, number>;
  formatDate: (date: Date) => string;
}

/**
 * Generate unique, meaningful ticks for time scale
 * Handles edge cases where D3's default ticks may return duplicates
 */
function generateUniqueTicks(scale: ScaleTime<number, number>, count: number = 10): Date[] {
  const domain = scale.domain();
  const [start, end] = domain;
  const timeSpan = end.getTime() - start.getTime();

  // If time span is zero or very small, return just the single date
  if (timeSpan <= 0) {
    return [start];
  }

  // Get default ticks from D3
  const defaultTicks = scale.ticks(count);

  // Check if we have duplicates or all ticks are the same
  const uniqueTicks = Array.from(
    new Set(defaultTicks.map(d => d.getTime()))
  ).map(t => new Date(t));

  // If all unique ticks are valid and diverse enough, use them
  if (uniqueTicks.length > 1) {
    return uniqueTicks;
  }

  // Fallback: manually generate ticks based on time span
  // Determine appropriate interval
  const intervals = [
    { duration: timeMinute.every(1), threshold: 60 * 1000 }, // 1 minute
    { duration: timeHour.every(1), threshold: 24 * 60 * 60 * 1000 }, // 1 day
    { duration: timeDay.every(1), threshold: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    { duration: timeMonth.every(1), threshold: 365 * 24 * 60 * 60 * 1000 }, // 1 year
    { duration: timeYear.every(1), threshold: 10 * 365 * 24 * 60 * 60 * 1000 }, // 10 years
    { duration: timeYear.every(10), threshold: 100 * 365 * 24 * 60 * 60 * 1000 }, // 100 years
    { duration: timeYear.every(100), threshold: Infinity }, // fallback
  ];

  const intervalObj = intervals.find(i => timeSpan < i.threshold) || intervals[intervals.length - 1];
  const interval = intervalObj.duration;

  if (!interval) {
    // Ultimate fallback: just return start and end
    return [start, end];
  }

  const ticks: Date[] = [];
  let current = interval.floor(start);

  while (current <= end && ticks.length < count) {
    ticks.push(new Date(current));
    current = interval.offset(current, 1);
  }

  return ticks.length > 0 ? ticks : [start, end];
}

export const TimeScale: React.FC<TimeScaleProps> = ({ scale, formatDate }) => {
  const ticks = generateUniqueTicks(scale, 10);

  return (
    <div className="timeline-scale">
      {ticks.map((tick, index) => {
        const xPosition = scale(tick);
        // Skip ticks that would be outside the visible range
        if (xPosition < 0 || xPosition > scale.range()[1]) {
          return null;
        }

        return (
          <div
            key={`${tick.getTime()}-${index}`}
            className="timeline-tick"
            style={{ left: `${xPosition}px` }}
          >
            <span className="tick-line"></span>
            <span className="tick-label">{formatDate(tick)}</span>
          </div>
        );
      })}
    </div>
  );
};
