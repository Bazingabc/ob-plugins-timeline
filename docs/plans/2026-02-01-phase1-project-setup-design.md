# Phase 1 设计方案：项目初始化

**项目名称**：Obsidian Timeline Plugin
**设计日期**：2026-02-01
**阶段**：Phase 1 - 项目初始化

---

## 概述

Phase 1 专注于建立项目基础设施，包括脚手架初始化、开发环境配置、类型定义和 CI/CD 设置。完成后项目将具备可运行的开发环境，为后续功能开发奠定基础。

---

## 第一部分：项目结构与脚手架

### 工具选择

- **脚手架**：`create-obsidian-plugin` (官方)
- **构建工具**：Vite
- **包管理器**：npm
- **语言**：TypeScript

### 初始化流程

1. 使用 `create-obsidian-plugin` 生成基础项目结构
2. 将默认构建工具替换为 Vite
3. 按照架构文档创建目录结构

### 目录结构

```
obsidian-timeline/
├── .github/workflows/       # CI/CD 配置
├── src/
│   ├── main.ts              # 插件入口
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── data/                # 数据层（Phase 2）
│   ├── processing/          # 处理层（Phase 2+）
│   ├── rendering/           # 渲染层（Phase 3）
│   ├── state/               # 状态管理（Phase 3）
│   └── utils/               # 工具函数
├── tests/                   # 测试目录
├── package.json
├── tsconfig.json
├── vite.config.ts
├── manifest.json
└── README.md
```

---

## 第二部分：开发环境配置

### TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### ESLint 配置

- 继承 `@typescript-eslint/recommended`
- React 插件规则
- `eslint-plugin-import` 导入顺序检查

### Prettier 配置

```json
{
  "singleQuote": true,
  "tabWidth": 2,
  "semi": true,
  "trailingComma": "es5"
}
```

### Vitest 配置

- 测试环境：jsdom
- 覆盖率收集（可选）
- 测试文件模式：`*.test.ts`

### 开发脚本

```json
{
  "scripts": {
    "dev": "vite build --watch",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

---

## 第三部分：CI/CD 与 Git 配置

### GitHub Actions 工作流

**`.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

### .gitignore

```
node_modules/
dist/
*.log
.obsidian/plugins/obsidian-timeline/
.DS_Store
coverage/
```

### Git 配置

- 默认分支：`main`
- 提交规范：Conventional Commits
  - `feat:` 新功能
  - `fix:` 修复
  - `chore:` 构建/配置
  - `docs:` 文档
  - `test:` 测试

---

## 第四部分：核心类型定义

### `src/types/index.ts`

```typescript
// 实体基础类型
export interface Entity {
  id: string;              // 文件路径
  type: EntityType;        // person | event | concept | location
  name: string;            // 实体名称
  timeStart?: Date;        // 开始时间
  timeEnd?: Date;          // 结束时间（可选）
  participants?: string[]; // 参与者 wikilinks
  tags: string[];          // 标签数组
  importance?: 1 | 2 | 3 | 4 | 5;  // 重要性等级
  location?: string;       // 地点 wikilink
}

export type EntityType = 'person' | 'event' | 'concept' | 'location';

// 轨道配置
export interface TrackConfig {
  id: string;
  name: string;
  filter: TrackFilter;
  color: string;
}

export interface TrackFilter {
  type?: EntityType;
  tags?: string[];
  customQuery?: string;
}

// 时间范围
export type TimeRange = [Date, Date];

// 筛选器
export interface Filters {
  timeRange?: TimeRange;
  tags?: string[];
  importance?: [number, number];
  searchQuery?: string;
}

// 视图预设
export interface ViewPreset {
  name: string;
  timeRange: TimeRange;
  visibleTracks: string[];
  filters: Filters;
}

// 解析结果
export interface ParsedEntity extends Entity {
  frontmatter: Record<string, any>;
  content: string;
}

// 错误类型
export interface ParseError {
  file: string;
  error: string;
}
```

---

## 第五部分：验收标准

### 完成标准

1. ✅ 项目能用 `create-obsidian-plugin` 成功初始化
2. ✅ 所有依赖安装成功（`npm install` 无错误）
3. ✅ `npm run dev` 启动监听模式，文件变更时自动重建
4. ✅ `npm run build` 成功编译，生成 `main.js` 和 `manifest.json`
5. ✅ 在 Obsidian 中加载插件，显示基础面板
6. ✅ 运行 `npm run lint` 和 `npm run test` 无错误
7. ✅ GitHub 仓库创建完成，CI/CD 工作流正常运行

### README.md 结构

```markdown
# Obsidian Timeline Plugin

多轨道时间轴可视化插件，用于社科学习和历史研究。

## 功能特性

- [ ] 多轨道时间轴展示
- [ ] 交互式探索
- [ ] YAML frontmatter 数据解析

## 开发状态

> 🚧 当前处于 Phase 1 - 项目初始化阶段

## 开发指南

### 环境要求
- Node.js >= 18
- Obsidian Desktop

### 安装依赖
\`\`\`bash
npm install
\`\`\`

### 开发模式
\`\`\`bash
npm run dev
\`\`\`

### 构建插件
\`\`\`bash
npm run build
\`\`\`

## 技术栈

- React 18 + TypeScript
- D3.js
- Vite
- Obsidian API

## 许可证

MIT
```

---

## 依赖清单

### 核心依赖
```json
{
  "dependencies": {
    "obsidian": "^1.5.0"
  }
}
```

### 开发依赖
```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "@vitest/ui": "^1.0.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0"
  }
}
```

---

## 后续步骤

Phase 1 完成后，进入 **Phase 2：核心数据层开发**，包括：
- YAML frontmatter 解析器
- 文件监听和索引更新机制
- 轨道分组逻辑
- 数据层单元测试
