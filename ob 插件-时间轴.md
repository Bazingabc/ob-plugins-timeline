# Obsidian 时间轴插件需求文档

> **项目名称**：Obsidian Timeline Plugin
> **版本**：v1.0.0
> **创建日期**：2026-02-01
> **状态**：待评审

---

## 目录

1. [项目概述与目标](#1-项目概述与目标)
2. [核心功能需求](#2-核心功能需求)
3. [高级功能需求](#3-高级功能需求)
4. [技术架构设计](#4-技术架构设计)
5. [数据流与状态管理](#5-数据流与状态管理)
6. [UI/UX 设计](#6-uiux-设计)
7. [性能优化策略](#7-性能优化策略)
8. [错误处理与容错](#8-错误处理与容错)
9. [测试策略](#9-测试策略)
10. [开发路线图](#10-开发路线图)
11. [附录](#附录)

---

## 1. 项目概述与目标

### 项目背景

在社科学习过程中，需要构建一个多维度关系图谱（人-事-物-地点-时间），并通过时间轴可视化呈现发展趋势和规律。虽然 Dataview 插件可以提供基础的查询和表格视图，但缺乏真正的时间轴可视化能力。

### 项目目标

**核心目标**：开发一个 Obsidian 自定义插件，提供强大的时间轴可视化功能，支持：

1. **多轨道时间轴展示**：同时展示不同类别的事件（政治、经济、文化等）
2. **交互式探索**：通过缩放、拖拽、筛选等方式探索数据
3. **智能关联分析**：自动发现实体之间的关系（人物参与的事件、事件的前因后果）
4. **视觉化配置**：通过 UI 界面配置轨道和视图，无需编写代码
5. **导出功能**：支持导出为 PNG/SVG/PDF 格式

### 目标用户

- **个人深度研究者**：在个人 vault 中积累大量笔记，希望通过时间轴发现规律
- **社科学习者**：研究历史事件、人物关系、政策演变
- **数据规模**：500-2000 条笔记记录

### 成功标准

- 首次加载时间 < 1 秒
- 交互响应时间 < 100ms
- 支持至少 500 条记录流畅运行（60fps）
- 用户可以通过 UI 完成所有配置，无需修改代码

---

## 2. 核心功能需求

### 2.1 多轨道时间轴可视化

**功能描述**：
- 将时间轴分为多个轨道（Swimlanes），每个轨道代表一类实体
- 支持 2-10 个轨道同时显示
- 实体以卡片形式显示在对应轨道上，位置由时间决定

**轨道类型**：
- 按实体类型：人物轨道、事件轨道、概念轨道
- 按标签分组：改革派轨道、保守派轨道
- 按时间段：世纪轨道、年代轨道
- 自定义轨道：用户可创建任意轨道

**可视化规则**：
- 横轴：时间（支持从公元前到现代）
- 纵轴：轨道（从上到下排列）
- 实体卡片：圆角矩形，宽度由持续时间决定
- 重要性标识：用边框粗细或颜色深浅表示（1-5 级）

### 2.2 数据读取与解析

**数据源**：
- 支持选择 vault 中的任意文件夹
- 递归读取子文件夹中的所有 Markdown 文件
- 实时监听文件变化（创建、修改、删除）并自动更新时间轴

**数据格式**：
- 从 YAML frontmatter 中提取结构化数据
- 核心字段：
  - `type`: 实体类型（person、event、concept、location）
  - `name`: 实体名称
  - `time_start` / `time_end`: 时间范围（必需）
  - `participants`: 参与者列表（数组）
  - `tags`: 标签（数组）
  - `importance`: 重要性（1-5）
  - `location`: 地点（wikilink）

**容错机制**：
- 缺少 `time_start` 的实体归类到"未分类"区域
- 缺少可选字段不影响显示，仅在详情面板标注为"未填写"
- 解析失败的文件记录到错误日志，不影响其他文件

### 2.3 交互操作

**导航操作**：
- 拖拽时间轴：左右平移查看不同时间段
- 缩放：鼠标滚轮或双指缩放，改变时间分辨率（年/月/日）
- 快速跳转：输入年份或选择预设时间范围

**实体交互**：
- 单击实体：选中并高亮，在右侧面板显示详情
- 双击实体：在 Obsidian 中打开对应笔记
- 右键菜单：快捷操作（标记星标、添加标签、复制链接）

**关联高亮**：
- 悬停实体时，高亮显示相关联的实体
- 例如：悬停"王安石变法"，高亮所有参与者（王安石、宋神宗、吕惠卿等）

### 2.4 搜索与筛选

**实时搜索**：
- 搜索框输入时实时过滤实体
- 支持搜索实体名称、标签、参与者
- 匹配的实体高亮显示，其他实体半透明

**多维筛选**：
- 按时间范围：滑动条或日期选择器
- 按标签：多选标签（如"政治" + "改革"）
- 按重要性：滑动条（1-5 星）
- 筛选器可保存为"视图预设"

---

## 3. 高级功能需求

### 3.1 智能关联分析

**人物-事件关联**：
- 自动分析人物参与的事件
- 显示人物生平时间轴（born → died）
- 标记重要事件节点

**事件因果关系**：
- 如果 frontmatter 包含 `causes`（前因）和 `effects`（后果）
- 在时间轴上绘制因果关系箭头
- 支持展开/折叠因果关系链

**关系网络可视化**：
- 在实体卡片之间绘制关联线（SVG）
- 虚线：弱关系（如 mentions）
- 实线：强关系（如 participants）
- 线条粗细：关联强度（如共同参与事件数）

### 3.2 配置 UI（无代码）

**轨道配置面板**：
- 添加/删除/重命名轨道
- 为每个轨道配置：
  - 过滤规则（标签、类型、自定义查询）
  - 颜色主题
  - 排序方式

**视图预设管理**：
- 保存当前视图配置（时间范围、轨道、筛选器）
- 加载已保存的预设
- 导出/导入预设配置文件（JSON）

**样式自定义**：
- 调整实体卡片宽度、高度、圆角
- 修改字体大小、颜色
- 切换深色/浅色主题

### 3.3 导出功能

**导出格式**：
- PNG：高分辨率截图（可自定义 DPI）
- SVG：矢量图，支持无损缩放
- PDF：适合打印和分享
- JSON：原始数据导出

**导出选项**：
- 选择导出整个时间轴或当前可见区域
- 包含/排除轨道标签
- 包含/排除时间刻度
- 自定义导出分辨率和文件大小

### 3.4 数据统计面板

**实时统计**：
- 当前视图内的实体总数
- 各轨道的实体数量分布
- 时间跨度（最早时间 - 最晚时间）

**数据质量检查**：
- 缺失关键字段的实体列表
- 孤立实体（未建立任何关系）
- 数据完整度评分（0-100%）

---

## 4. 技术架构设计

### 4.1 整体架构

采用**模块化分层架构**，分为 5 层：

```
┌─────────────────────────────────────────┐
│   UI Layer (React Components)           │
│   - TimelineView, EntityCard, Controls  │
├─────────────────────────────────────────┤
│   Rendering Layer (D3.js + SVG/Canvas)  │
│   - Coordinate mapping, layout calc     │
├─────────────────────────────────────────┤
│   Processing Layer                      │
│   - Filtering, grouping, sorting        │
├─────────────────────────────────────────┤
│   Data Parsing Layer                    │
│   - YAML parser, file watcher           │
├─────────────────────────────────────────┤
│   Obsidian API Layer                    │
│   - Vault, MetadataCache, Workspace     │
└─────────────────────────────────────────┘
```

### 4.2 技术栈选型

**推荐方案：React + D3.js**

| 技术 | 用途 | 理由 |
|------|------|------|
| React 18 | UI 框架 | 组件化开发，生态丰富 |
| D3.js 7 | 数据可视化 | 强大的时间轴布局能力 |
| TypeScript | 类型安全 | 代码可维护性高 |
| Vite | 构建工具 | 快速开发和热更新 |
| Immer | 状态管理 | 不可变数据更新 |

**替代方案**：

1. **纯原生（Vanilla JS）**
   - 优点：包体积小，无依赖
   - 缺点：开发效率低，难以维护
   - 适用场景：对包体积极度敏感

2. **Svelte + D3.js**
   - 优点：运行时性能更好，包体积小
   - 缺点：生态较 React 小，学习成本
   - 适用场景：追求极致性能

3. **Vue 3 + D3.js**
   - 优点：上手简单，文档完善
   - 缺点：Obsidian 生态中 React 更成熟
   - 适用场景：团队熟悉 Vue

### 4.3 核心模块设计

**数据解析层（Data Parsing Layer）**：
```typescript
interface DataParser {
  parseFrontmatter(content: string): ParsedEntity | null;
  watchFiles(callback: FileChangeCallback): void;
  getIndex(): EntityIndex;
}
```

**处理层（Processing Layer）**：
```typescript
interface DataProcessor {
  filter(entities: Entity[], filters: Filters): Entity[];
  groupByTrack(entities: Entity[], tracks: TrackConfig[]): TrackGroup[];
  sort(entities: Entity[], sortBy: SortField): Entity[];
}
```

**渲染层（Rendering Layer）**：
```typescript
interface TimelineRenderer {
  calculateScale(timeRange: TimeRange): d3.ScaleTime;
  layoutEntities(entities: Entity[], scale: ScaleTime): Layout[];
  render(container: HTMLElement): void;
}
```

### 4.4 目录结构

```
obsidian-timeline/
├── src/
│   ├── main.ts                 # 插件入口
│   ├── ui/                     # React 组件
│   │   ├── TimelineView.tsx
│   │   ├── EntityCard.tsx
│   │   └── ControlsPanel.tsx
│   ├── data/                   # 数据层
│   │   ├── parser.ts
│   │   ├── watcher.ts
│   │   └── index.ts
│   ├── processing/             # 处理层
│   │   ├── filter.ts
│   │   ├── group.ts
│   │   └── sort.ts
│   ├── rendering/              # 渲染层
│   │   ├── timeline.ts
│   │   ├── scale.ts
│   │   └── layout.ts
│   ├── state/                  # 状态管理
│   │   ├── store.ts
│   │   └── actions.ts
│   ├── utils/                  # 工具函数
│   │   └── helpers.ts
│   └── types/                  # TypeScript 类型定义
│       └── index.ts
├── tests/                      # 测试文件
├── package.json
└── tsconfig.json
```

---

## 5. 数据流与状态管理

### 5.1 数据流设计

采用**单向数据流**（Unidirectional Data Flow）：

```
用户操作 → Action → State Update → Re-render
   ↑                                         ↓
   └────────────── UI Feedback ←────────────┘
```

**流程说明**：
1. 用户操作（如拖拽、筛选）触发 Action
2. Action 更新 State（使用 Immer 确保不可变性）
3. State 变化触发 Re-render
4. UI 反馈给用户

### 5.2 状态管理

使用 **React Context API** + **Immer** 管理全局状态：

```typescript
interface TimelineState {
  // 数据状态
  entities: Entity[];              // 所有实体
  filteredEntities: Entity[];      // 筛选后的实体
  trackGroups: TrackGroup[];       // 轨道分组

  // UI 状态
  timeRange: [Date, Date];         // 当前时间范围
  selectedEntity: Entity | null;   // 选中的实体
  hoveredEntity: Entity | null;    // 悬停的实体

  // 配置状态
  filters: Filters;                // 筛选器
  tracks: TrackConfig[];           // 轨道配置
  viewPresets: ViewPreset[];       // 视图预设

  // 加载状态
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'SET_ENTITIES'; payload: Entity[] }
  | { type: 'SET_TIME_RANGE'; payload: [Date, Date] }
  | { type: 'SELECT_ENTITY'; payload: Entity | null }
  | { type: 'APPLY_FILTERS'; payload: Filters }
  | { type: 'SET_ERROR'; payload: Error };
```

### 5.3 状态更新示例

```typescript
import { produce } from 'immer';

function timelineReducer(
  state: TimelineState,
  action: Action
): TimelineState {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'SET_ENTITIES':
        draft.entities = action.payload;
        draft.filteredEntities = applyFilters(
          action.payload,
          state.filters
        );
        break;

      case 'APPLY_FILTERS':
        draft.filters = action.payload;
        draft.filteredEntities = applyFilters(
          state.entities,
          action.payload
        );
        break;

      case 'SELECT_ENTITY':
        draft.selectedEntity = action.payload;
        break;
    }
  });
}
```

### 5.4 数据同步策略

**初始化流程**：
1. 插件加载时读取 Obsidian 的 MetadataCache
2. 扫描指定文件夹中的所有 Markdown 文件
3. 解析 YAML frontmatter，建立实体索引
4. 首次渲染时间轴

**增量更新流程**：
1. 监听 Obsidian 的 `metadata:changed` 事件
2. 判断变化的文件是否在数据源文件夹内
3. 重新解析变化的文件
4. 增量更新索引
5. 触发重新渲染（仅更新受影响的部分）

**性能优化**：
- 使用防抖（debounce）避免频繁更新（500ms 延迟）
- Web Worker 中执行解析操作，避免阻塞 UI
- 缓存解析结果，避免重复计算

---

## 6. UI/UX 设计

### 6.1 界面布局架构

采用**三栏式响应式布局**：

**左侧面板（配置区）**：
- 数据源选择器（支持多选文件夹）
- 轨道配置面板（添加/删除/重命名轨道）
- 筛选器快捷开关（重要性、标签、日期范围）
- 视图预设管理（保存/加载/删除配置）

**中央面板（时间轴主视图）**：
- 顶部：时间刻度标尺（可拖拽缩放）
- 中部：多轨道时间轴（垂直滚动，水平可平移）
- 底部：迷你导航地图（显示全局视图）
- 支持鼠标拖拽平移、滚轮缩放时间轴

**右侧面板（详情/检查器）**：
- 选中实体的详细信息卡片
- 实体间的关联关系可视化
- 编辑元数据的快捷表单
- 可折叠以节省空间

### 6.2 交互设计原则

**直观操作**：
- 点击实体卡片 → 选中并高亮
- 双击实体卡片 → 打开对应 Obsidian 笔记
- 拖拽实体边缘 → 调整时间范围（如字段允许编辑）
- 右键菜单 → 快捷操作（标记星标、添加标签、导出等）

**视觉反馈**：
- 悬停时显示实体详情预览（tooltip）
- 高亮关联实体（同一人物参与的事件自动高亮）
- 加载状态使用骨架屏（skeleton screen）而非转圈
- 错误状态用红色边框 + 内联错误提示

### 6.3 配色方案

默认采用**深色主题优先**设计，遵循 Obsidian 原生风格：

- 轨道背景：半透明色块（改革派=红色、保守派=蓝色、文化=黄色等）
- 实体卡片：圆角矩形 + 微阴影，重要性等级用边框粗细区分
- 关联线：贝塞尔曲线，虚线表示弱关系，实线表示强关系
- 支持用户自定义配色方案（保存为主题配置）

### 6.4 响应式适配

- **桌面端（>1200px）**：完整三栏布局
- **平板端（768-1200px）**：左侧面板可折叠，右侧面板浮动
- **移动端（<768px）**：单栏布局，通过底部标签页切换视图

---

## 7. 性能优化策略

### 7.1 数据加载优化

**分批加载**：
- 初始只加载可见时间窗口内的数据（如 50 年范围）
- 用户滚动/平移时动态加载相邻时间段的数据
- 使用 LRU 缓存策略，最多缓存 3 个时间窗口的数据

**虚拟化渲染**：
- 使用 `react-window` 或 `react-virtualized` 实现虚拟滚动
- 只渲染视口可见的实体卡片（~20-30 个 DOM 节点）
- 估计高度：每个实体卡片约 60-80px，轨道高度 40px

**增量索引**：
- 插件启动时先建立基础索引（文件路径、时间范围）
- 延迟加载详细元数据（participants、tags 等）到 Web Worker
- 首次渲染时间目标：< 500ms（500 条记录）

### 7.2 渲染性能优化

**Canvas vs DOM 混合渲染**：
- 时间轴标尺、轨道背景：使用 Canvas 绘制（静态图层）
- 实体卡片：使用 DOM（支持交互、文本渲染）
- 关联线：使用 SVG（中等复杂度，支持样式）

**D3.js 优化**：
- 使用 `d3-scale` 的时间尺度（`scaleTime`）预先计算坐标
- 避免在每次渲染时重新计算布局，缓存为 `{[entityId]: {x, y, width, height}}`
- 使用 `requestAnimationFrame` 批量更新动画

**防抖与节流**：
- 拖拽、缩放操作：使用 `requestAnimationFrame` 限制到 60fps
- 搜索输入：300ms 防抖延迟
- 文件监听：500ms 节流（避免频繁重载）

### 7.3 内存管理

**数据清理**：
- 关闭时间轴视图时释放所有缓存数据
- 切换数据源时清理旧索引
- 使用 WeakMap 存储临时计算结果

**图片资源**：
- 延迟加载实体卡片中的图片
- 使用 `IntersectionObserver` 检测可见性
- 超过 2MB 的图片显示为缩略图

### 7.4 性能监控指标

**关键性能指标（KPI）**：
- 首次渲染时间（FCP）：< 1s
- 交互响应时间：< 100ms
- 内存占用：< 200MB（500 条记录）
- 导出 PNG 时间：< 3s（全屏）

**内置性能面板**：
- 使用 `React.Profiler` 采集组件渲染耗时
- 使用 `performance.now()` 记录关键操作耗时
- 开发模式下显示性能统计（FPS、内存、渲染次数）

---

## 8. 错误处理与容错

### 8.1 数据解析错误处理

**YAML Frontmatter 解析失败**：
- 降级策略：如果 frontmatter 解析失败，尝试从文件名推断基本信息
- 错误记录：将解析失败的文件路径记录到插件数据目录的 `errors.json`
- 用户提示：在 UI 中显示警告图标，点击查看失败的文件列表
- 恢复机制：提供"重新解析"按钮，手动触发重试

**缺失关键字段**：
- `time_start` 缺失：将实体归类到"未分类"轨道，并在 UI 中用灰色标识
- `name` 缺失：使用文件名作为显示名称
- 可选字段缺失：不影响显示，但在详情面板标注为"未填写"

### 8.2 运行时错误处理

**渲染错误边界（Error Boundary）**：
- 使用 React Error Boundary 捕获组件渲染错误
- 失败时显示友好的错误提示："时间轴渲染失败，请尝试刷新"
- 提供"复制错误日志"按钮，方便用户报告问题

**文件监听错误**：
- Obsidian 文件变化监听失败时，显示提示："数据可能已过期，请手动刷新"
- 防止监听器泄漏：插件卸载时确保移除所有监听器
- 使用 `try-catch` 包裹文件回调，避免单个文件错误影响整体

**导出失败处理**：
- 导出 PNG/SVG 失败时，提供降级方案（如仅导出数据为 JSON）
- 大文件导出超时（>10s）时，提示用户缩小时间范围
- 导出失败后保留临时文件，方便调试

### 8.3 用户输入验证

**时间范围输入**：
- 验证 `开始时间 ≤ 结束时间`，否则交换值
- 超出合理范围（如 year < 0 或 > 9999）时显示警告
- 支持多种日期格式（ISO 8601、中文日期、相对日期），解析失败时提示示例

**轨道配置**：
- 防止创建重名轨道
- 限制最大轨道数（建议 ≤ 10），超过时提示"轨道过多可能影响性能"

**搜索输入**：
- 过滤特殊字符（`<>{}|\`等），防止注入攻击
- 搜索结果为空时显示"未找到匹配项"并提供清除按钮

### 8.4 错误日志与诊断

**内置日志系统**：
- 使用 Obsidian 的 `Logger` API 记录错误（`plugin.logError`）
- 日志级别：DEBUG、INFO、WARN、ERROR
- 用户可在插件设置中调整日志级别

**诊断工具面板**：
- 显示当前插件版本、Obsidian 版本、系统信息
- 提供导出诊断包功能（包含日志、配置、数据采样）
- "一键重置"功能：清除缓存并重新加载（作为最后手段）

---

## 9. 测试策略

### 9.1 单元测试

**测试框架**：使用 `vitest`（与 Vite 集成良好）

**核心模块测试覆盖**：

*数据解析层（Data Parsing Layer）*：
- 测试 YAML frontmatter 解析：正常情况、缺失字段、格式错误
- 测试时间字段解析：多种日期格式、无效日期
- 目标覆盖率：≥ 90%

*数据处理层（Processing Layer）*：
- 测试轨道分组逻辑：单轨道、多轨道、跨轨道实体
- 测试过滤逻辑：按标签、时间范围、重要性
- 测试关联计算：参与者共同出现次数
- 目标覆盖率：≥ 85%

*坐标计算层（Coordinate Layer）*：
- 测试时间轴映射：D3 scale 坐标计算
- 测试实体定位：防止重叠算法
- 测试边界情况：负年份、超长持续时间

### 9.2 集成测试

**测试场景**：
- 使用 `playwright` 测试插件在 Obsidian 中的实际运行
- 准备测试数据集：50 个模拟文件（涵盖所有实体类型和边缘情况）
- 测试文件监听：创建、修改、删除文件时时间轴是否正确更新
- 测试导出功能：验证 PNG/SVG/PDF 导出结果

**关键用户流程**：
1. 打开时间轴视图 → 正确加载和显示
2. 搜索实体 → 实时过滤和高亮
3. 点击实体 → 打开对应笔记
4. 拖拽时间轴 → 平滑滚动
5. 切换轨道配置 → 正确重新分组

### 9.3 性能测试

**基准测试**：
- 使用真实数据集：500 条记录
- 测试首次加载时间：目标 < 1s
- 测试渲染性能：目标 60fps（拖拽、缩放时）
- 使用 Chrome DevTools 和 `vitest` 的 benchmark 功能

**内存泄漏检测**：
- 使用 `playwright` 的内存监测功能
- 反复打开/关闭时间轴视图 50 次
- 检查内存占用是否稳定（无持续增长）

### 9.4 用户验收测试（UAT）

**Beta 测试计划**：
- 邀请 5-10 名社区用户测试
- 提供测试数据和详细任务清单
- 收集反馈通过 GitHub Issues

**测试任务示例**：
- 创建一个包含 10 个事件的时间轴
- 配置 3 个轨道并按标签分组
- 导出时间轴为 PNG
- 修改某个事件的 time_start，验证时间轴自动更新

### 9.5 回归测试

**自动化测试流程**：
- 每次 PR 提交时自动运行单元测试
- 每次合并到 main 分支时运行完整测试套件
- 使用 GitHub Actions 实现 CI/CD

**测试数据管理**：
- 在 `tests/fixtures` 目录维护标准化测试数据
- 包含正常场景、边界情况、错误数据的完整覆盖
- 版本控制测试数据，确保测试稳定性

---

## 10. 开发路线图

### 阶段 1：项目初始化（第 1 周）

**任务清单**：
- 使用 `create-obsidian-plugin` 脚手架初始化项目
- 配置开发环境：TypeScript、ESLint、Prettier、Vite
- 设置项目结构：按照架构设计创建文件夹
- 配置 GitHub 仓库和 CI/CD（GitHub Actions）
- 编写 README.md（包含项目介绍、安装说明、开发指南）

**验收标准**：
- 插件能在 Obsidian 中加载（显示基础面板）
- 运行 `npm run dev` 成功启动开发模式
- 单元测试框架配置完成并能运行示例测试

### 阶段 2：核心数据层开发（第 2-3 周）

**任务清单**：
- 实现 YAML frontmatter 解析器
- 实现文件监听和索引更新机制
- 创建核心数据类型（Person、Event、Concept 等）的 TypeScript 接口
- 实现轨道分组逻辑
- 编写数据层的单元测试（覆盖率 ≥ 90%）

**验收标准**：
- 能正确解析现有的社科知识库数据
- 文件修改时索引自动更新
- 所有数据层单元测试通过

### 阶段 3：基础 UI 和渲染层（第 4-5 周）

**任务清单**：
- 使用 React + D3.js 实现基础时间轴组件
- 实现时间刻度标尺和坐标映射
- 实现实体卡片的渲染和布局
- 实现拖拽和缩放交互
- 实现左侧配置面板（数据源选择、轨道配置）

**验收标准**：
- 能显示基础时间轴（加载示例数据）
- 拖拽和缩放操作流畅（60fps）
- 能配置轨道并看到分组效果

### 阶段 4：高级功能开发（第 6-7 周）

**任务清单**：
- 实现搜索和过滤功能
- 实现右侧详情面板
- 实现关联线绘制（使用 SVG）
- 实现导出功能（PNG、SVG、PDF）
- 添加视图预设管理

**验收标准**：
- 搜索框输入时实时过滤和高亮
- 点击实体显示详情
- 导出的图片清晰可读
- 能保存和加载视图配置

### 阶段 5：性能优化和测试（第 8 周）

**任务清单**：
- 实现虚拟化渲染（react-window）
- 优化大数据集性能（测试 500+ 条记录）
- 实现缓存机制
- 编写集成测试（使用 Playwright）
- 性能基准测试和优化

**验收标准**：
- 首次加载时间 < 1s
- 拖拽缩放保持 60fps
- 内存占用 < 200MB（500 条记录）
- 所有集成测试通过

### 阶段 6：错误处理和完善（第 9 周）

**任务清单**：
- 实现完整的错误处理和降级策略
- 添加诊断工具面板
- 编写用户文档（README、示例配置）
- 修复 Beta 测试反馈的问题
- 代码审查和重构

**验收标准**：
- 所有错误情况都有友好提示
- 用户文档完整清晰
- Beta 测试用户反馈的严重问题全部解决

### 阶段 7：发布准备（第 10 周）

**任务清单**：
- 发布到 GitHub Releases
- 提交到 Obsidian 插件市场
- 创建项目官网/演示视频
- 发布社区公告

**验收标准**：
- 插件在 Obsidian 插件市场可搜索
- 首个稳定版本（v1.0.0）成功发布

---

## 附录

### A. 数据模型详细定义

#### 核心 YAML Frontmatter 字段

**人物**：
```yaml
---
type: person
name: 王安石
born: 1021-12-18
died: 1086-05-21
role: [政治家, 思想家, 文学家]
era: 北宋
affiliations: [[北宋朝廷]], [[改革派]]
works: [《临川集》, 《王文公文集》]
tags: [person/政治, person/改革派]
---
```

**事件**：
```yaml
---
type: event
name: 王安石变法
time_start: 1069-01-01
time_end: 1085-04-01
location: [[汴京]]
participants: [[王安石]], [[宋神宗]], [[吕惠卿]]
opponents: [[司马光]], [[苏轼]]
importance: 5
tags: [event/政治, event/改革]
---
```

**概念/政策**：
```yaml
---
type: concept
name: 青苗法
category: 经济政策
created: 1069-01-01
abolished: 1085-04-01
creator: [[王安石]]
related_event: [[王安石变法]]
tags: [concept/政策, concept/经济]
---
```

### B. 技术依赖清单

#### 核心依赖
- `obsidian`: ^1.5.0
- `react`: ^18.2.0
- `react-dom`: ^18.2.0
- `d3`: ^7.9.0
- `immer`: ^10.0.0

#### 构建工具
- `typescript`: ^5.3.0
- `vite`: ^5.0.0
- `@vitejs/plugin-react`: ^4.2.0

#### 开发工具
- `vitest`: ^1.0.0
- `@playwright/test`: ^1.40.0
- `eslint`: ^8.55.0
- `prettier`: ^3.1.0

#### UI 库（可选）
- `react-window`: ^1.8.10
- `html2canvas`: ^1.4.1
- `jspdf`: ^2.5.1

### C. 配置文件示例

**插件配置存储位置**：`.obsidian/plugins/obsidian-timeline/data.json`

```json
{
  "version": "1.0.0",
  "dataSources": ["草稿/社科知识库"],
  "tracks": [
    {
      "id": "track-1",
      "name": "政治家",
      "filter": "tag:person/政治",
      "color": "#f66"
    },
    {
      "id": "track-2",
      "name": "文学家",
      "filter": "tag:person/文学",
      "color": "#6f9"
    }
  ],
  "viewPresets": [
    {
      "name": "北宋政治",
      "timeRange": ["1060-01-01", "1100-01-01"],
      "visibleTracks": ["track-1", "track-2"]
    }
  ],
  "ui": {
    "theme": "dark",
    "showGrid": true,
    "cardWidth": 200
  }
}
```

### D. 参考资源

**Obsidian 插件开发**：
- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)

**React & D3.js**：
- [React 官方文档](https://react.dev/)
- [D3.js 官方文档](https://d3js.org/)
- [D3 + React 最佳实践](https://wattenberger.com/blog/react-and-d3)

**可视化设计**：
- [时间轴设计模式](https://www.nngroup.com/articles/timelines/)
- [数据可视化最佳实践](https://www.data-to-viz.com/)

---

**需求文档版本**：v1.0
**创建日期**：2026-02-01
**状态**：待评审
