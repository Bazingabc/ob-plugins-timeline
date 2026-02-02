import React from 'react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
}) => {
  return (
    <div className="timeline-zoom-controls">
      <button
        className="zoom-btn"
        onClick={onZoomIn}
        title="放大"
        aria-label="Zoom in"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        className="zoom-btn"
        onClick={onZoomOut}
        title="缩小"
        aria-label="Zoom out"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        className="zoom-btn"
        onClick={onReset}
        title="重置视图"
        aria-label="Reset view"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      </button>
    </div>
  );
};
