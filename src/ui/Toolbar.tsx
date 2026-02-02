import React, { useState, useRef, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { ZoomControls } from './ZoomControls';
import { FilterPanel } from './FilterPanel';
import type { Filters } from '../types';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  availableTags: string[];
  onExportClick?: () => void;
  showRelationshipLines?: boolean;
  onToggleRelationshipLines?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  availableTags,
  onExportClick,
  showRelationshipLines = true,
  onToggleRelationshipLines,
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close filter panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showFilterPanel &&
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        setShowFilterPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPanel]);

  // Count active filters
  const activeFilterCount =
    (filters.types?.length || 0) +
    (filters.tags?.length || 0) +
    (filters.importance ? 1 : 0);

  return (
    <div className="timeline-toolbar" ref={toolbarRef}>
      <div className="toolbar-left">
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="搜索实体..."
        />
        <button
          className={`filter-toggle-btn ${activeFilterCount > 0 ? 'has-filters' : ''}`}
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          title="筛选"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="22 3 2 3 7 17 12 3 22 3" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
        </button>
        {showFilterPanel && (
          <FilterPanel
            filters={filters}
            onChange={onFiltersChange}
            onClose={() => setShowFilterPanel(false)}
            availableTags={availableTags}
          />
        )}
      </div>

      <div className="toolbar-spacer" />

      {/* Toggle relationship lines button */}
      {onToggleRelationshipLines && (
        <button
          className={`icon-btn ${showRelationshipLines ? 'active' : ''}`}
          onClick={onToggleRelationshipLines}
          title={showRelationshipLines ? '隐藏关联线' : '显示关联线'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="18" r="3" />
            <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
          </svg>
        </button>
      )}

      {/* Export button */}
      {onExportClick && (
        <button
          className="icon-btn"
          onClick={onExportClick}
          title="导出时间轴"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      )}

      <ZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onReset={onResetView}
      />
    </div>
  );
};
