import React, { useCallback } from 'react';
import type { Entity } from '../types';
import type { EntityLayout } from '../rendering';

interface EntityCardProps {
  entity: Entity;
  layout: EntityLayout;
  isSelected: boolean;
  isHighlighted?: boolean;
  onSelect: () => void;
  onOpenNote: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  layout,
  isSelected,
  isHighlighted = false,
  onSelect,
  onOpenNote,
  onMouseEnter,
  onMouseLeave,
}) => {
  const importance = entity.importance || 1;

  // 处理卡片点击，但排除打开笔记按钮的点击
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // 如果点击的是打开笔记按钮，不触发选择
    if ((e.target as HTMLElement).closest('.entity-open-btn')) {
      return;
    }
    onSelect();
  }, [onSelect]);

  return (
    <div
      className={`entity-card importance-${importance} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
      style={{
        position: 'absolute',
        left: `${layout.x}px`,
        top: `${layout.y}px`,
        width: `${layout.width}px`,
        height: `${layout.height}px`,
      }}
      title={`${entity.name}\n${entity.timeStart?.toLocaleDateString()}${entity.timeEnd ? ' - ' + entity.timeEnd.toLocaleDateString() : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleCardClick}
    >
      {/* 固定显示的名称和标签层 */}
      <div className="entity-sticky-info">
        <div className="entity-header">
          <span className="entity-name">{entity.name}</span>
          <button
            className="entity-open-btn"
            onClick={onOpenNote}
            title="打开笔记"
            aria-label="打开笔记"
          >
            📄
          </button>
        </div>
        {entity.tags && entity.tags.length > 0 && (
          <div className="entity-tags">
            {entity.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="entity-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
      {/* 卡片内容区域 */}
      <div className="entity-card-content">
        {entity.participants && entity.participants.length > 0 && (
          <span className="entity-participants">
            👤 {entity.participants.length}
          </span>
        )}
      </div>
    </div>
  );
};
