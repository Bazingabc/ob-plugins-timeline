# Phase 4 设计方案：高级功能

**项目名称**：Obsidian Timeline Plugin
**设计日期**：2026-02-01
**阶段**：Phase 4 - 高级功能开发

---

## 概述

Phase 4 实现时间轴的高级交互功能，包括搜索筛选、详情面板、拖拽缩放等，提升用户体验和数据探索能力。

---

## 第一部分：顶部工具栏

### 功能组件

- **搜索框**：实时搜索实体名称、参与者
- **筛选按钮**：打开筛选面板（按类型、标签、重要性）
- **缩放控制**：+ / - / 重置按钮

### 组件结构

```typescript
// src/ui/Toolbar.tsx
interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}
```

### 布局

固定在时间轴顶部，包含：
- 左侧：搜索框 + 筛选按钮
- 右侧：缩放控制

---

## 第二部分：详情面板

### 设计风格

属性检查器风格，固定在右侧面板。

### 显示内容

| 字段 | 说明 |
|------|------|
| 名称 | 实体名称 |
| 类型 | person/event/concept/location |
| 时间 | time_start ~ time_end |
| 重要性 | 星级显示 (⭐×N) |
| 参与者 | Tag 列表 |
| 标签 | Tag 列表 |
| 相关实体 | 关联的实体列表 |

### 组件结构

```typescript
// src/ui/DetailsPanel.tsx
interface DetailsPanelProps {
  entity: Entity | null;
  relatedEntities: Entity[];
  onClose: () => void;
}
```

### 空状态

未选择实体时显示：
```
选择一个实体查看详情
```

---

## 第三部分：交互增强

### 拖拽平移

**触发方式**：鼠标按下时间轴空白区域 + 拖动

**计算逻辑**：
```typescript
deltaX = currentX - startX
timeDelta = (deltaX / containerWidth) * timeSpan
newTimeRange = [startTime + timeDelta, endTime + timeDelta]
```

### 滚轮缩放

**触发方式**：鼠标滚轮

**计算逻辑**：
```typescript
zoomFactor = deltaY > 0 ? 1.1 : 0.9
centerTime = (startTime + endTime) / 2
newSpan = (endTime - startTime) * zoomFactor
newTimeRange = [centerTime - newSpan/2, centerTime + newSpan/2]
```

### 缩放限制

- 最小时间跨度：1 天
- 最大时间跨度：10000 年

---

## 第四部分：状态管理

### TimelineView 状态扩展

```typescript
interface TimelineViewState {
  // 现有状态
  timeRange: TimeRange;
  hoveredEntity: string | null;

  // 新增状态
  selectedEntity: Entity | null;
  searchQuery: string;
  filters: Filters;
  showDetailsPanel: boolean;
  panState: {
    isDragging: boolean;
    startX: number;
    startTime: number;
  };
}
```

### 筛选逻辑

使用 EntityIndexer 的 filter 方法：

```typescript
const filteredEntities = indexer.filter({
  types: filters.types,
  tags: filters.tags,
  importance: filters.importance,
  searchQuery: searchQuery,
});
```

---

## 第五部分：UI 布局

### 最终布局结构

```
┌────────────────────────────────────────────────┐
│  TimelineView (React 组件)                      │
│  ┌────────────────────────────────────────────┐ │
│  │ Toolbar (搜索、筛选、缩放)                  │ │
│  └────────────────────────────────────────────┘ │
│  ┌──────────────┬───────────────────────────────┐│
│  │ Timeline     │ Details Panel               ││
│  │ (可拖拽、缩放) │ (属性检查器风格)              ││
│  └──────────────┴───────────────────────────────┘│
└────────────────────────────────────────────────┘
```

### CSS 样式

```css
/* 工具栏 */
.timeline-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--background-secondary);
  border-bottom: 1px solid var(--background-modifier-border);
  flex-shrink: 0;
}

/* 详情面板 */
.details-panel {
  width: 280px;
  border-left: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
  overflow-y: auto;
}

/* 主容器 - 使用 flex 布局 */
.timeline-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.timeline-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.timeline-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}
```

---

## 第六部分：事件处理

### 事件注册

```typescript
// 拖拽事件
const handleMouseDown = (e: React.MouseEvent) => { ... };
const handleMouseMove = (e: React.MouseEvent) => { ... };
const handleMouseUp = () => { ... };

// 滚轮事件
const handleWheel = (e: React.WheelEvent) => { ... };

// 全局事件（在拖拽时）
useEffect(() => {
  if (panState.isDragging) {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }
}, [panState.isDragging]);
```

---

## 验收标准

1. ✅ 顶部工具栏显示搜索框和缩放控制
2. ✅ 搜索框输入实时过滤实体
3. ✅ 点击实体显示详情面板
4. ✅ 详情面板显示实体完整信息
5. ✅ 拖拽时间轴空白区域可以平移视图
6. ✅ 滚轮可以缩放时间轴
7. ✅ 缩放按钮正常工作

---

## 新增组件

| 组件 | 文件 | 职责 |
|------|------|------|
| Toolbar | src/ui/Toolbar.tsx | 顶部工具栏 |
| SearchBar | src/ui/SearchBar.tsx | 搜索框 |
| FilterPanel | src/ui/FilterPanel.tsx | 筛选面板 |
| DetailsPanel | src/ui/DetailsPanel.tsx | 详情面板 |
| ZoomControls | src/ui/ZoomControls.tsx | 缩放控制 |

---

## 后续步骤

Phase 4 完成后，可选功能：
- **导出功能** (PNG/SVG/PDF)
- **关联线绘制**
- **视图预设管理**
- **性能优化** (虚拟化渲染)
