import React, { useState } from 'react';
import type { Filters, EntityType } from '../types';

interface FilterPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClose: () => void;
  availableTags: string[];
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onClose,
  availableTags,
}) => {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);

  const entityTypes: EntityType[] = ['person', 'event', 'concept', 'location'];

  const handleTypeToggle = (type: EntityType) => {
    const current = localFilters.types || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setLocalFilters({ ...localFilters, types: updated });
  };

  const handleTagToggle = (tag: string) => {
    const current = localFilters.tags || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setLocalFilters({ ...localFilters, tags: updated });
  };

  const handleImportanceChange = (min: number, max: number) => {
    setLocalFilters({ ...localFilters, importance: [min, max] });
  };

  const handleApply = () => {
    onChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  return (
    <div className="filter-panel-overlay" onClick={onClose}>
      <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
        <div className="filter-panel-header">
          <h3>筛选</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="filter-panel-content">
          {/* 实体类型筛选 */}
          <div className="filter-section">
            <h4>实体类型</h4>
            <div className="filter-options">
              {entityTypes.map((type) => (
                <label key={type} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={localFilters.types?.includes(type) || false}
                    onChange={() => handleTypeToggle(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 标签筛选 */}
          {availableTags.length > 0 && (
            <div className="filter-section">
              <h4>标签</h4>
              <div className="filter-tags">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    className={`filter-tag ${localFilters.tags?.includes(tag) ? 'active' : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 重要性筛选 */}
          <div className="filter-section">
            <h4>重要性</h4>
            <div className="filter-importance">
              <input
                type="range"
                min="1"
                max="5"
                value={localFilters.importance?.[0] || 1}
                onChange={(e) => {
                  const max = localFilters.importance?.[1] || 5;
                  handleImportanceChange(parseInt(e.target.value), max);
                }}
                className="importance-slider"
              />
              <span>至</span>
              <input
                type="range"
                min="1"
                max="5"
                value={localFilters.importance?.[1] || 5}
                onChange={(e) => {
                  const min = localFilters.importance?.[0] || 1;
                  handleImportanceChange(min, parseInt(e.target.value));
                }}
                className="importance-slider"
              />
              <span className="importance-label">
                {localFilters.importance?.[0] || 1} - {localFilters.importance?.[1] || 5} ⭐
              </span>
            </div>
          </div>
        </div>

        <div className="filter-panel-footer">
          <button className="reset-btn" onClick={handleReset}>重置</button>
          <button className="apply-btn" onClick={handleApply}>应用</button>
        </div>
      </div>
    </div>
  );
};
