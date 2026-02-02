# Phase 2 设计方案：核心数据层

**项目名称**：Obsidian Timeline Plugin
**设计日期**：2026-02-01
**阶段**：Phase 2 - 核心数据层开发

---

## 概述

Phase 2 实现核心数据层，负责从 Obsidian vault 中读取、解析和索引实体数据。采用事件驱动架构，使用 Obsidian 内置 API 实现高效的文件监听和增量更新。

---

## 第一部分：架构概览

### 核心组件

1. **EntityIndexer** - 索引管理器，维护所有实体数据的内存索引
2. **FrontmatterParser** - YAML frontmatter 解析器
3. **FileWatcher** - 文件变化监听器
4. **DataSourceConfig** - 数据源配置管理

### 数据流

```
MetadataCache → FrontmatterParser → EntityIndexer → Timeline State
     ↑                                            ↓
     └──────────── FileWatcher (监听变化) ────────┘
```

### 目录结构

```
src/data/
├── parser.ts          # YAML 解析
├── indexer.ts         # 索引管理
├── watcher.ts         # 文件监听
└── index.ts           # 导出入口
```

---

## 第二部分：FrontmatterParser

### 类设计

```typescript
class FrontmatterParser {
  // 从单个文件解析实体
  parseEntity(file: TFile, cache: MetadataCache): ParsedEntity | null;

  // 批量解析多个文件
  parseEntities(files: TFile[], cache: MetadataCache): ParsedEntity[];

  // 解析时间字段（支持多种格式）
  parseTimeField(value: unknown): Date | null;

  // 提取 wikilinks
  extractWikilinks(content: string): string[];
}
```

### 解析逻辑

1. 从 `MetadataCache.getFileCache(file)` 获取 frontmatter
2. 映射 YAML 字段到 `Entity` 接口
3. 容错处理：缺失 `time_start` 返回 null

### 时间解析支持

- ISO 格式：`1069-01-01`
- 年份：`1069`
- 负年份（公元前）：`-221` 表示公元前 221 年

---

## 第三部分：EntityIndexer

### 类设计

```typescript
class EntityIndexer {
  private entities: Map<string, Entity> = new Map();
  private entitiesByType: Map<EntityType, Set<string>> = new Map();
  private entitiesByTag: Map<string, Set<string>> = new Map();

  // 添加或更新实体
  upsert(entity: Entity): void;

  // 删除实体
  remove(id: string): void;

  // 获取所有实体
  getAll(): Entity[];

  // 按类型筛选
  getByType(type: EntityType): Entity[];

  // 按标签筛选
  getByTag(tag: string): Entity[];

  // 搜索（名称、参与者）
  search(query: string): Entity[];

  // 获取相关实体（共同参与者、标签）
  getRelated(entityId: string): Entity[];

  // 清空索引
  clear(): void;
}
```

### 数据结构

- `entities` - 主索引：文件路径 → Entity
- `entitiesByType` - 反向索引：类型 → 文件路径集合
- `entitiesByTag` - 反向索引：标签 → 文件路径集合

### 关联计算

两个实体相关 = 共同标签 OR 互为参与者

---

## 第四部分：FileWatcher 与数据源配置

### FileWatcher 类设计

```typescript
class FileWatcher {
  private indexer: EntityIndexer;
  private parser: FrontmatterParser;
  private dataSources: string[];

  // 注册监听器
  register(app: App): void;

  // 处理文件变化
  handleFileChange(file: TFile): void;

  // 处理文件删除
  handleFileDelete(path: string): void;

  // 更新数据源配置
  updateDataSources(folders: string[]): void;

  // 全量重建索引
  rebuildIndex(): Promise<void>;
}
```

### 监听 Obsidian 事件

- `metadata:changed` - frontmatter 变化
- `delete` - 文件删除
- `rename` - 文件重命名

### 设置面板配置

```typescript
interface TimelineSettings {
  dataSources: string[];  // 文件夹路径数组
}
```

**设置 UI**：
- 文件夹选择器（支持多选）
- 已选择文件夹列表
- 移除按钮

---

## 第五部分：错误处理与测试

### 错误处理策略

1. **解析失败**
   - 记录到 `ParseError[]` 数组
   - 在设置面板显示错误数量和列表
   - 不影响其他文件的正常解析

2. **缺失关键字段**
   - `time_start` 缺失：跳过该实体
   - `name` 缺失：使用文件名作为后备
   - `type` 缺失：默认为 'event'

3. **文件监听错误**
   - 单个文件错误不影响整体
   - 使用 try-catch 包裹每个处理函数
   - 插件卸载时确保清理所有监听器

### 测试策略

```typescript
// parser.test.ts
describe('FrontmatterParser', () => {
  test('解析完整 frontmatter');
  test('处理缺失 time_start');
  test('解析负年份');
  test('提取 wikilinks');
});

// indexer.test.ts
describe('EntityIndexer', () => {
  test('添加和获取实体');
  test('按类型筛选');
  test('按标签筛选');
  test('计算相关实体');
});
```

---

## 验收标准

1. ✅ 能解析 vault 中的 YAML frontmatter
2. ✅ 文件修改时索引自动更新
3. ✅ 设置面板可选择数据源文件夹
4. ✅ 单元测试覆盖率 ≥ 80%

---

## 技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| YAML 解析 | Obsidian 内置 API | 简单可靠，无额外依赖 |
| 文件监听 | Obsidian 事件系统 | 自动响应变化，实时性好 |
| 数据源配置 | 设置面板选择 | 用户体验好，实现简单 |

---

## 后续步骤

Phase 2 完成后，进入 **Phase 3：基础 UI 和渲染层**，使用 React + D3.js 实现时间轴可视化。
