import React from 'react';
import type { Entity } from '../types';

interface DetailsPanelProps {
  entity: Entity | null;
  relatedEntities: Entity[];
  onClose: () => void;
}

const formatDate = (date: Date | undefined): string => {
  if (!date) return '未知';
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

export const DetailsPanel: React.FC<DetailsPanelProps> = ({
  entity,
  relatedEntities,
  onClose,
}) => {
  if (!entity) {
    return (
      <div className="details-panel empty">
        <div className="empty-state">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <p>选择一个实体查看详情</p>
        </div>
      </div>
    );
  }

  const importanceStars = '⭐'.repeat(entity.importance || 1);

  return (
    <div className="details-panel">
      <div className="details-header">
        <h3>{entity.name}</h3>
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close details"
        >✕</button>
      </div>

      <div className="details-content">
        {/* 类型 */}
        <div className="detail-section">
          <label>类型</label>
          <span className="detail-value type-badge">{entity.type}</span>
        </div>

        {/* 时间 */}
        <div className="detail-section">
          <label>时间</label>
          <span className="detail-value">
            {formatDate(entity.timeStart)}
            {entity.timeEnd && ` - ${formatDate(entity.timeEnd)}`}
          </span>
        </div>

        {/* 重要性 */}
        <div className="detail-section">
          <label>重要性</label>
          <span className="detail-value importance-stars">{importanceStars}</span>
        </div>

        {/* 参与者 */}
        {entity.participants && entity.participants.length > 0 && (
          <div className="detail-section">
            <label>参与者 ({entity.participants.length})</label>
            <div className="detail-value">
              {entity.participants.map((p) => (
                <span key={p} className="participant-tag">{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* 标签 */}
        {entity.tags && entity.tags.length > 0 && (
          <div className="detail-section">
            <label>标签</label>
            <div className="detail-value">
              {entity.tags.map((t) => (
                <span key={t} className="tag">#{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* 地点 */}
        {entity.location && (
          <div className="detail-section">
            <label>地点</label>
            <span className="detail-value location">{entity.location}</span>
          </div>
        )}

        {/* 相关实体 */}
        {relatedEntities.length > 0 && (
          <div className="detail-section">
            <label>相关实体 ({relatedEntities.length})</label>
            <div className="detail-value related-entities">
              {relatedEntities.map((e) => (
                <div key={e.id} className="related-entity-card">
                  <span className="related-name">{e.name}</span>
                  <span className="related-type">{e.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="details-footer">
        <button
          className="open-note-btn"
          onClick={() => {
            // Open the note in Obsidian - this will be handled by parent
            window.dispatchEvent(new CustomEvent('timeline-open-entity', {
              detail: entity
            }));
          }}
        >
          打开笔记
        </button>
      </div>
    </div>
  );
};
