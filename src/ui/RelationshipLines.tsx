import React, { useMemo } from 'react';
import type { Entity } from '../types';
import type { EntityLayout } from '../rendering';

interface RelationshipLinesProps {
  entities: Entity[];
  layout: Map<string, EntityLayout>;
  selectedEntity: Entity | null;
  hoveredEntity: Entity | null;
}

interface Connection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  strength: number; // 0-1, determines line width and opacity
  type: 'participant' | 'related' | 'causal';
}

/**
 * SVG component for drawing relationship lines between entities
 */
export const RelationshipLines: React.FC<RelationshipLinesProps> = ({
  entities,
  layout,
  selectedEntity,
  hoveredEntity,
}) => {
  // Calculate connections based on selected/hovered entity
  const connections = useMemo<Connection[]>(() => {
    const targetEntity = selectedEntity || hoveredEntity;
    if (!targetEntity) return [];

    const lines: Connection[] = [];

    entities.forEach((entity) => {
      if (entity.id === targetEntity.id) return;

      const fromLayout = layout.get(targetEntity.id);
      const toLayout = layout.get(entity.id);

      if (!fromLayout || !toLayout) return;

      // Determine connection type and strength
      let type: Connection['type'] = 'related';
      let strength = 0.3;

      // Check if this entity is a participant in the target event
      if (targetEntity.participants?.includes(entity.id)) {
        type = 'participant';
        strength = 0.7;
      }

      // Check if target is a participant in this entity's event
      if (entity.participants?.includes(targetEntity.id)) {
        type = 'participant';
        strength = 0.7;
      }

      // Check for shared tags (indicates relatedness)
      const sharedTags = entity.tags.filter((tag) => targetEntity.tags.includes(tag));
      if (sharedTags.length > 0) {
        strength = Math.min(strength + 0.2 * sharedTags.length, 1);
      }

      // Calculate connection points (center of cards)
      const fromX = fromLayout.x + fromLayout.width / 2;
      const fromY = fromLayout.y + fromLayout.height / 2;
      const toX = toLayout.x + toLayout.width / 2;
      const toY = toLayout.y + toLayout.height / 2;

      lines.push({
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY },
        strength,
        type,
      });
    });

    return lines;
  }, [selectedEntity, hoveredEntity, entities, layout]);

  if (connections.length === 0) return null;

  return (
    <svg
      className="relationship-lines"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <defs>
        {/* Arrow marker for causal relationships */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--interactive-accent)" opacity="0.6" />
        </marker>
      </defs>
      {connections.map((conn, index) => {
        const isStrong = conn.strength > 0.6;
        const isWeak = conn.strength < 0.4;

        // Determine stroke color based on type
        let strokeColor = 'var(--text-faint)';
        if (conn.type === 'participant') {
          strokeColor = 'var(--interactive-accent)';
        } else if (conn.type === 'causal') {
          strokeColor = 'var(--color-orange)';
        }

        // Calculate path using bezier curve
        const midX = (conn.from.x + conn.to.x) / 2;
        const controlY = Math.min(conn.from.y, conn.to.y) - 50;

        const pathData = `M ${conn.from.x} ${conn.from.y} Q ${midX} ${controlY} ${conn.to.x} ${conn.to.y}`;

        return (
          <path
            key={index}
            d={pathData}
            stroke={strokeColor}
            strokeWidth={isStrong ? 2 : isWeak ? 1 : 1.5}
            strokeDasharray={isWeak ? '4,4' : 'none'}
            opacity={conn.strength}
            fill="none"
            markerEnd={conn.type === 'causal' ? 'url(#arrowhead)' : undefined}
          />
        );
      })}
    </svg>
  );
};
