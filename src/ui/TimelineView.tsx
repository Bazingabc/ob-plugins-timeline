import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { EntityCard } from './EntityCard';
import { TimeScale } from './TimeScale';
import { Toolbar } from './Toolbar';
import { DetailsPanel } from './DetailsPanel';
import { ExportPanel } from './ExportPanel';
import { RelationshipLines } from './RelationshipLines';
import { TimelineRenderer } from '../rendering';
import type { Entity, TimeRange, Filters } from '../types';
import type { EntityIndexer } from '../data';

interface TimelineViewProps {
  entities: Entity[];
  indexer: EntityIndexer;
  onOpenNote?: (entity: Entity) => void;
}

interface PanState {
  isDragging: boolean;
  startX: number;
  startTime: number;
  timeSpan: number; // Capture time span at drag start to avoid scroll lock
  hasMoved: boolean;
  isMouseDown: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  entities,
  indexer,
  onOpenNote,
}) => {
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<Entity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showRelationshipLines, setShowRelationshipLines] = useState(true);
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [panState, setPanState] = useState<PanState>({
    isDragging: false,
    startX: 0,
    startTime: 0,
    timeSpan: 0,
    hasMoved: false,
    isMouseDown: false,
  });
  // Use a view time range that can be controlled by zoom/pan
  const [viewTimeRange, setViewTimeRange] = useState<TimeRange>();
  const [originalTimeRange, setOriginalTimeRange] = useState<TimeRange>();

  const containerRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Create renderer
  const renderer = useMemo(() => new TimelineRenderer(), []);

  // Get all unique tags for filter
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    entities.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [entities]);

  // Filter entities based on search and filters
  const filteredEntities = useMemo(() => {
    const result = indexer.filter({
      types: filters.types,
      tags: filters.tags,
      importance: filters.importance,
      searchQuery: searchQuery,
    });
    console.log('[Timeline View] filteredEntities:', result.length, 'from', entities.length, 'entities');
    return result;
  }, [indexer, filters, searchQuery, entities.length]);

  // Calculate time range from filtered entities (the data range)
  const dataTimeRange = useMemo<TimeRange>(() => {
    const range = renderer.calculateTimeRange(filteredEntities);
    console.log('[Timeline View] dataTimeRange:', range);
    return range;
  }, [filteredEntities, renderer]);

  // Initialize view time range
  useEffect(() => {
    if (!viewTimeRange && dataTimeRange) {
      setViewTimeRange(dataTimeRange);
      setOriginalTimeRange(dataTimeRange);
    }
  }, [dataTimeRange]);

  // Use viewTimeRange for rendering, fallback to dataTimeRange
  const timeRange = viewTimeRange || dataTimeRange;

  // Define safe date boundaries to prevent scrolling into invalid ranges
  // Year 100 to Year 10000 - prevents issues with extreme dates
  // Use explicit date constructor to avoid parsing issues
  const MIN_SAFE_DATE = new Date(100, 0, 1).getTime(); // 公元100年1月1日
  const MAX_SAFE_DATE = new Date(10000, 11, 31, 23, 59, 59, 999).getTime(); // 公元10000年12月31日

  // Helper function to clamp a time range within safe boundaries
  const clampTimeRange = useCallback((range: TimeRange): TimeRange => {
    let [start, end] = range;
    let span = end.getTime() - start.getTime();

    // Ensure span is positive
    if (span < 0) {
      span = Math.abs(span);
      [start, end] = [end, start];
    }

    // Limit span to maximum allowed range
    const maxSpan = MAX_SAFE_DATE - MIN_SAFE_DATE;
    if (span > maxSpan) {
      span = maxSpan;
    }

    // Calculate the desired center point
    const center = (start.getTime() + end.getTime()) / 2;
    
    // Try to maintain the center while fitting within bounds
    let clampedStart = center - span / 2;
    let clampedEnd = center + span / 2;

    // Adjust if start is too early
    if (clampedStart < MIN_SAFE_DATE) {
      clampedStart = MIN_SAFE_DATE;
      clampedEnd = MIN_SAFE_DATE + span;
      // If end exceeds max, we need to reduce span
      if (clampedEnd > MAX_SAFE_DATE) {
        clampedEnd = MAX_SAFE_DATE;
        clampedStart = MAX_SAFE_DATE - span;
        // Ensure start is still valid
        if (clampedStart < MIN_SAFE_DATE) {
          clampedStart = MIN_SAFE_DATE;
          clampedEnd = MIN_SAFE_DATE + span;
          // Final check: if span is too large, use max span centered
          if (clampedEnd > MAX_SAFE_DATE) {
            const safeCenter = (MIN_SAFE_DATE + MAX_SAFE_DATE) / 2;
            clampedStart = safeCenter - maxSpan / 2;
            clampedEnd = safeCenter + maxSpan / 2;
          }
        }
      }
    }
    // Adjust if end is too late
    else if (clampedEnd > MAX_SAFE_DATE) {
      clampedEnd = MAX_SAFE_DATE;
      clampedStart = MAX_SAFE_DATE - span;
      // Ensure start is still valid
      if (clampedStart < MIN_SAFE_DATE) {
        clampedStart = MIN_SAFE_DATE;
        clampedEnd = MIN_SAFE_DATE + span;
        // If span is too large, use max span centered
        if (clampedEnd > MAX_SAFE_DATE) {
          const safeCenter = (MIN_SAFE_DATE + MAX_SAFE_DATE) / 2;
          clampedStart = safeCenter - maxSpan / 2;
          clampedEnd = safeCenter + maxSpan / 2;
        }
      }
    }

    // Final validation: ensure both dates are within bounds
    const finalStart = Math.max(clampedStart, MIN_SAFE_DATE);
    const finalEnd = Math.min(clampedEnd, MAX_SAFE_DATE);
    
    // Ensure final range is valid
    if (finalEnd <= finalStart) {
      const safeCenter = (MIN_SAFE_DATE + MAX_SAFE_DATE) / 2;
      const safeSpan = Math.min(span, maxSpan);
      return [
        new Date(safeCenter - safeSpan / 2),
        new Date(safeCenter + safeSpan / 2),
      ];
    }

    return [new Date(finalStart), new Date(finalEnd)];
  }, []);

  // Store original time range for reset
  useEffect(() => {
    if (!originalTimeRange && dataTimeRange) {
      setOriginalTimeRange(dataTimeRange);
    }
  }, [dataTimeRange]);

  // Create time scale
  const timeScale = useMemo(() => {
    return renderer.createTimeScale(timeRange);
  }, [renderer, timeRange]);

  // Calculate layout for all entities
  const layout = useMemo(() => {
    const result = renderer.calculateLayout(filteredEntities, timeScale);
    console.log('[Timeline View] layout:', result.size, 'entity positions');
    return result;
  }, [filteredEntities, renderer, timeScale]);

  // Get related entities for highlighting (based on selected or hovered entity)
  const relatedEntities = useMemo(() => {
    const targetId = (selectedEntity || hoveredEntity)?.id;
    if (!targetId) return [];
    return indexer.getRelated(targetId);
  }, [selectedEntity, hoveredEntity, indexer]);

  // Format date for display
  const formatDate = useCallback(
    (date: Date) => renderer.formatDate(date),
    [renderer]
  );

  // Handle entity click - select and show details panel only
  const handleEntityClick = useCallback(
    (entity: Entity) => {
      setSelectedEntity(entity);
      setShowDetailsPanel(true);
    },
    []
  );

  // Handle open note button click
  const handleOpenNote = useCallback(
    (e: React.MouseEvent, entity: Entity) => {
      e.stopPropagation(); // Prevent triggering the card click
      onOpenNote?.(entity);
    },
    [onOpenNote]
  );

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    const currentSpan = timeRange[1].getTime() - timeRange[0].getTime();
    const center = (timeRange[0].getTime() + timeRange[1].getTime()) / 2;
    const newSpan = currentSpan * 0.8; // Zoom in by 20%

    const newRange: TimeRange = [
      new Date(center - newSpan / 2),
      new Date(center + newSpan / 2),
    ];

    setViewTimeRange(clampTimeRange(newRange));
  }, [timeRange, clampTimeRange]);

  const handleZoomOut = useCallback(() => {
    const currentSpan = timeRange[1].getTime() - timeRange[0].getTime();
    const center = (timeRange[0].getTime() + timeRange[1].getTime()) / 2;
    const newSpan = currentSpan * 1.25; // Zoom out by 25%

    const newRange: TimeRange = [
      new Date(center - newSpan / 2),
      new Date(center + newSpan / 2),
    ];

    setViewTimeRange(clampTimeRange(newRange));
  }, [timeRange, clampTimeRange]);

  const handleResetView = useCallback(() => {
    if (originalTimeRange) {
      setViewTimeRange([...originalTimeRange]);
    }
  }, [originalTimeRange]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    const target = e.target as HTMLElement;
    // Ignore clicks on interactive elements
    if (target.closest('.entity-card') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('.details-panel') ||
        target.closest('.toolbar')) {
      return;
    }

    // Capture both start time and time span at drag start to avoid dependency issues
    const currentTimeSpan = timeRange[1].getTime() - timeRange[0].getTime();
    setPanState({
      isDragging: false, // Don't start dragging yet - wait for movement
      startX: e.clientX,
      startTime: timeRange[0].getTime(),
      timeSpan: currentTimeSpan, // Capture time span at drag start
      hasMoved: false,
      isMouseDown: true,
    });
  }, [timeRange]);

  // Handle mouse move for panning
  // IMPORTANT: This callback must NOT depend on timeRange to avoid re-creation during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;

    const deltaX = e.clientX - panState.startX;
    const movementThreshold = 5; // pixels - must move this much before dragging starts

    // Check if we've moved enough to start dragging
    if (!panState.isDragging) {
      if (Math.abs(deltaX) > movementThreshold) {
        // Start dragging
        setPanState(prev => ({ ...prev, isDragging: true, hasMoved: true }));
      } else {
        return; // Haven't moved enough yet
      }
    }

    // Use the captured time span from drag start, not current timeRange
    // This prevents the scroll lock bug when timeRange changes during drag
    const containerWidth = containerRef.current.offsetWidth;
    const timeSpan = panState.timeSpan;
    const timeDelta = (deltaX / containerWidth) * timeSpan;

    const newRange: TimeRange = [
      new Date(panState.startTime + timeDelta),
      new Date(panState.startTime + timeDelta + timeSpan),
    ];

    // Clamp to safe boundaries to prevent scrolling into invalid date ranges
    // The improved clampTimeRange function now handles all edge cases correctly
    setViewTimeRange(clampTimeRange(newRange));
  }, [panState, clampTimeRange]); // Only depend on panState, not timeRange!

  // Handle mouse up to end panning
  const handleMouseUp = useCallback(() => {
    setPanState({
      isDragging: false,
      startX: 0,
      startTime: 0,
      timeSpan: 0,
      hasMoved: false,
      isMouseDown: false,
    });
  }, []);

  // Handle click to clear selection when clicking empty space
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only clear if we didn't drag (hasMoved is false)
    if (panState.hasMoved) return;

    const target = e.target as HTMLElement;
    if (!target.closest('.entity-card') &&
        !target.closest('.details-panel') &&
        !target.closest('.toolbar') &&
        !target.closest('button')) {
      setSelectedEntity(null);
    }
  }, [panState.hasMoved]);

  // Register global mouse events when mouse is down (potential drag start)
  useEffect(() => {
    if (panState.isMouseDown) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [panState.isMouseDown, handleMouseMove, handleMouseUp]);

  // Handle wheel for zooming
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const currentSpan = timeRange[1].getTime() - timeRange[0].getTime();
    const center = (timeRange[0].getTime() + timeRange[1].getTime()) / 2;
    let newSpan = currentSpan * zoomFactor;

    // Limit zoom range (1 day to 10000 years)
    const minSpan = 24 * 60 * 60 * 1000; // 1 day
    const maxSpan = 10000 * 365 * 24 * 60 * 60 * 1000; // 10000 years
    newSpan = Math.max(minSpan, Math.min(maxSpan, newSpan));

    const newRange: TimeRange = [
      new Date(center - newSpan / 2),
      new Date(center + newSpan / 2),
    ];

    setViewTimeRange(clampTimeRange(newRange));
  }, [timeRange, clampTimeRange]);

  // Register wheel event
  useEffect(() => {
    const tracks = tracksRef.current;
    if (!tracks) return;

    tracks.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      tracks.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return renderer.getTotalHeight(filteredEntities.length);
  }, [filteredEntities.length, renderer]);

  // Check if panel should be shown - only when an entity is clicked (selected), not on hover
  // Hover only highlights related cards, doesn't show the panel
  const showPanel = selectedEntity !== null;

  // Debug logging
  console.log('[Timeline View] Render state:', {
    entitiesCount: entities.length,
    filteredEntitiesCount: filteredEntities.length,
    timeRange,
    layoutSize: layout.size,
    totalHeight,
  });

  return (
    <div className="timeline-view-container">
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        availableTags={availableTags}
        onExportClick={() => setShowExportPanel(true)}
        showRelationshipLines={showRelationshipLines}
        onToggleRelationshipLines={() => setShowRelationshipLines(!showRelationshipLines)}
      />

      <div className="timeline-content">
        <div
          ref={containerRef}
          className="timeline-wrapper"
          onMouseDown={handleMouseDown}
          onClick={handleBackgroundClick}
          style={{ cursor: panState.isDragging ? 'grabbing' : 'grab' }}
        >
          <div ref={timelineRef} className="timeline-container">
            <TimeScale scale={timeScale} formatDate={formatDate} />
            <div
              ref={tracksRef}
              className="timeline-tracks"
              style={{
                height: `${totalHeight}px`,
                position: 'relative',
              }}
            >
              {showRelationshipLines && (
                <RelationshipLines
                  entities={filteredEntities}
                  layout={layout}
                  selectedEntity={selectedEntity}
                  hoveredEntity={hoveredEntity}
                />
              )}
              {filteredEntities.map((entity) => {
                const entityLayout = layout.get(entity.id);
                if (!entityLayout) return null;

                const targetEntity = selectedEntity || hoveredEntity;
                const isRelated = targetEntity ? relatedEntities.some((e) => e.id === entity.id) : false;
                const isSelected = selectedEntity?.id === entity.id;
                const isHovered = hoveredEntity?.id === entity.id;
                const isHighlighted = Boolean(
                  isSelected ||
                  isHovered ||
                  (targetEntity && isRelated)
                );

                return (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    layout={entityLayout}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    onSelect={() => handleEntityClick(entity)}
                    onOpenNote={(e) => handleOpenNote(e, entity)}
                    onMouseEnter={() => setHoveredEntity(entity)}
                    onMouseLeave={() => setHoveredEntity(null)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {showPanel && selectedEntity && (
          <DetailsPanel
            entity={selectedEntity}
            relatedEntities={relatedEntities}
            onClose={() => {
              setSelectedEntity(null);
              setShowDetailsPanel(false);
            }}
          />
        )}
      </div>

      {showExportPanel && (
        <ExportPanel
          timelineRef={timelineRef}
          onClose={() => setShowExportPanel(false)}
        />
      )}
    </div>
  );
};
