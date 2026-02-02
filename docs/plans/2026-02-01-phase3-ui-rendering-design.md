# Phase 3 设计方案：基础 UI 和渲染层

**项目名称**：Obsidian Timeline Plugin
**设计日期**：2026-02-01
**阶段**：Phase 3 - 基础 UI 和渲染层

---

## 概述

Phase 3 实现时间轴的可视化展示，采用 React 组件 + D3 坐标计算的混合架构。用户可以在右侧面板查看时间轴，点击实体卡片打开对应笔记。

---

## 第一部分：架构概览

### 技术栈选择

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2+ | UI 组件框架 |
| ReactDOM | 18.2+ | DOM 渲染 |
| D3.js | 7.9+ | 坐标计算（仅 scale） |
| TypeScript | 5.3+ | 类型安全 |

### 架构层次

```
┌─────────────────────────────────────────┐
│   TimelineView (React 组件)             │
│   - 状态管理（时间范围、选中状态）        │
│   - 事件处理（点击、悬停）                │
├─────────────────────────────────────────┤
│   TimelineRenderer (D3 计算)            │
│   - scaleTime 坐标映射                   │
│   - 实体布局计算                          │
├─────────────────────────────────────────┤
│   EntityCard (React 组件)               │
│   - 单个实体卡片渲染                      │
│   - 样式和交互                           │
└─────────────────────────────────────────┘
```

### 目录结构

```
src/
├── rendering/
│   ├── timeline.ts          # D3 坐标计算
│   └── index.ts
├── ui/
│   ├── TimelineView.tsx     # 主视图组件
│   ├── EntityCard.tsx       # 实体卡片
│   ├── TimeScale.tsx        # 时间刻度
│   ├── TimelineViewWrapper.ts # Obsidian ItemView 包装器
│   └── index.ts
└── styles.css               # 样式文件
```

---

## 第二部分：D3 坐标计算层

### TimelineRenderer 类

```typescript
interface TimelineBounds {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

interface EntityLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

class TimelineRenderer {
  // 创建时间轴比例尺
  createTimeScale(
    timeRange: [Date, Date],
    bounds: TimelineBounds
  ): ScaleTime<number, number>;

  // 计算实体的布局位置
  calculateLayout(
    entities: Entity[],
    timeScale: ScaleTime<number, number>,
    bounds: TimelineBounds
  ): Map<string, EntityLayout>;

  // 计算实体宽度（基于持续时间）
  calculateEntityWidth(
    entity: Entity,
    timeScale: ScaleTime<number, number>
  ): number;

  // 生成时间刻度
  generateTimeTicks(
    timeScale: ScaleTime<number, number>,
    interval: d3.TimeInterval
  ): Date[];
}
```

### 坐标映射规则

- **横轴（X）**：时间，使用 `scaleTime` 映射
- **纵轴（Y）**：轨道，使用简单顺序排列
- **实体宽度**：`timeEnd - timeStart` 的像素差
- **实体高度**：固定值 60px

---

## 第三部分：React 组件设计

### TimelineView 主组件

```typescript
interface TimelineViewProps {
  entities: Entity[];
  indexer: EntityIndexer;
  onEntityClick?: (entity: Entity) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  entities,
  indexer,
  onEntityClick,
}) => {
  // 状态
  const [timeRange, setTimeRange] = useState<[Date, Date]>(...);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  // D3 渲染器
  const renderer = useMemo(() => new TimelineRenderer(), []);

  // 计算布局
  const layout = useMemo(() =>
    renderer.calculateLayout(entities, timeScale, bounds),
    [entities, timeRange]
  );

  return (
    <div className="timeline-container">
      <TimeScale timeRange={timeRange} />
      <div className="timeline-tracks">
        {entities.map(entity => (
          <EntityCard
            key={entity.id}
            entity={entity}
            layout={layout.get(entity.id)}
            isHovered={hoveredEntity === entity.id}
            onHover={setHoveredEntity}
            onClick={() => onEntityClick?.(entity)}
          />
        ))}
      </div>
    </div>
  );
};
```

### EntityCard 卡片组件

```typescript
interface EntityCardProps {
  entity: Entity;
  layout: EntityLayout;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
}

const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  layout,
  isHovered,
  onHover,
  onClick,
}) => (
  <div
    className={`entity-card importance-${entity.importance || 1} ${isHovered ? 'highlighted' : ''}`}
    style={{
      left: layout.x,
      top: layout.y,
      width: layout.width,
      height: layout.height,
    }}
    onMouseEnter={() => onHover(entity.id)}
    onMouseLeave={() => onHover(null)}
    onClick={onClick}
  >
    <span className="entity-name">{entity.name}</span>
    {entity.participants && (
      <span className="entity-participants">
        {entity.participants.length} participants
      </span>
    )}
  </div>
);
```

---

## 第四部分：Obsidian 集成

### ItemView 包装器

```typescript
export const TIMELINE_VIEW_TYPE = 'timeline-view';

class TimelineViewWrapper extends ItemView {
  private indexer: EntityIndexer;
  private reactRoot: ReactDOM.Root | null = null;

  getViewType(): string {
    return TIMELINE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Timeline';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();

    this.reactRoot = ReactDOM.createRoot(container);
    this.reactRoot.render(
      <TimelineView
        entities={this.indexer.getAll()}
        indexer={this.indexer}
        onEntityClick={this.handleEntityClick}
      />
    );
  }

  async onClose() {
    this.reactRoot?.unmount();
  }

  private handleEntityClick = (entity: Entity) => {
    this.app.workspace.openLinkText(entity.id, '');
  };
}
```

### 在 main.ts 中注册

```typescript
async onload() {
  // ... 现有代码

  // 注册视图
  this.registerView(
    TIMELINE_VIEW_TYPE,
    (leaf) => new TimelineViewWrapper(leaf, this.indexer)
  );

  // 添加打开命令
  this.addCommand({
    id: 'show-timeline',
    name: 'Show Timeline',
    callback: () => this.activateTimelineView(),
  });

  // 更新图标点击
  this.addRibbonIcon('calendar', 'Open Timeline', () => {
    this.activateTimelineView();
  });
}

private activateTimelineView() {
  const { workspace } = this.app;
  let leaf = workspace.getRightLeaf(false);
  if (!leaf) {
    leaf = workspace.getRightLeaf(true);
  }
  leaf.setViewState({ type: TIMELINE_VIEW_TYPE, active: true });
  workspace.revealLeaf(leaf);
}
```

---

## 第五部分：样式与交互

### CSS 样式

```css
/* 时间轴容器 */
.timeline-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
}

/* 时间刻度 */
.timeline-scale {
  position: sticky;
  top: 0;
  height: 30px;
  background: var(--background-secondary);
  border-bottom: 1px solid var(--background-modifier-border);
  z-index: 10;
}

/* 实体卡片 */
.entity-card {
  position: absolute;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.entity-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.entity-card.highlighted {
  border-color: var(--interactive-accent);
  box-shadow: 0 0 0 2px var(--interactive-accent-hover);
}

/* 按重要性设置边框 */
.entity-card.importance-5 { border-width: 3px; }
.entity-card.importance-4 { border-width: 2.5px; }
.entity-card.importance-3 { border-width: 2px; }
.entity-card.importance-2 { border-width: 1.5px; }
.entity-card.importance-1 { border-width: 1px; }
```

### Phase 3 交互范围

**实现**：
- 点击实体卡片 → 打开对应笔记
- 悬停实体 → 高亮显示
- 点击图标/命令 → 在右侧面板打开时间轴

**不实现**（留待 Phase 4）：
- 拖拽平移时间轴
- 滚轮缩放时间轴
- 搜索和筛选 UI

---

## 验收标准

1. ✅ 右侧面板显示时间轴视图
2. ✅ 实体按时间正确排列
3. ✅ 点击实体打开对应笔记
4. ✅ 悬停高亮效果
5. ✅ 基本样式适配 Obsidian 主题

---

## 新增依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "d3": "^7.9.0"
  },
  "devDependencies": {
    "@types/d3": "^7.4.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

---

## 后续步骤

Phase 3 完成后，进入 **Phase 4：高级功能开发**，包括：
- 搜索和筛选功能
- 详情面板
- 关联线绘制
- 拖拽和缩放交互
