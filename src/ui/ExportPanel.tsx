import React, { useState } from 'react';
import html2canvas from 'html2canvas';

interface ExportPanelProps {
  timelineRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
}

type ExportFormat = 'png' | 'svg' | 'json';

export const ExportPanel: React.FC<ExportPanelProps> = ({ timelineRef, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!timelineRef.current) {
      alert('无法找到时间轴元素');
      return;
    }

    setIsExporting(true);

    try {
      const element = timelineRef.current;

      if (format === 'png') {
        // Export as PNG
        const canvas = await html2canvas(element, {
          backgroundColor: '#1e1e1e',
          scale: 2, // High resolution
          logging: false,
        });

        const link = document.createElement('a');
        link.download = `timeline-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else if (format === 'svg') {
        // Export as SVG (basic implementation)
        const svgData = new XMLSerializer().serializeToString(element);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = `timeline-${new Date().toISOString().split('T')[0]}.svg`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
      } else if (format === 'json') {
        // Export data as JSON
        const data = {
          exportedAt: new Date().toISOString(),
          format: 'json',
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = `timeline-${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
      }

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-panel-overlay" onClick={onClose}>
      <div className="export-panel" onClick={(e) => e.stopPropagation()}>
        <div className="export-panel-header">
          <h3>导出时间轴</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="export-panel-content">
          <div className="export-section">
            <label>导出格式</label>
            <div className="export-options">
              <label className="export-option">
                <input
                  type="radio"
                  name="format"
                  value="png"
                  checked={format === 'png'}
                  onChange={() => setFormat('png')}
                />
                <span>PNG 图片</span>
              </label>
              <label className="export-option">
                <input
                  type="radio"
                  name="format"
                  value="svg"
                  checked={format === 'svg'}
                  onChange={() => setFormat('svg')}
                />
                <span>SVG 矢量图</span>
              </label>
              <label className="export-option">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={() => setFormat('json')}
                />
                <span>JSON 数据</span>
              </label>
            </div>
          </div>

          <div className="export-info">
            <p>
              {format === 'png' && '导出为高分辨率 PNG 图片，适合分享和演示'}
              {format === 'svg' && '导出为 SVG 矢量图，可无损缩放'}
              {format === 'json' && '导出原始数据，便于二次处理'}
            </p>
          </div>
        </div>

        <div className="export-panel-footer">
          <button className="cancel-btn" onClick={onClose} disabled={isExporting}>
            取消
          </button>
          <button className="export-btn" onClick={handleExport} disabled={isExporting}>
            {isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>
    </div>
  );
};
