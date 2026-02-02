# TimeRange 数据更新机制分析

## 概述

`timeRange` 是时间轴视图的核心状态，控制着当前可见的时间范围。本文档详细梳理了 `timeRange` 的更新机制，并定位了边界滑动时的异常问题。

## 数据结构

### TimeRange 类型定义
```typescript
type TimeRange = [Date, Date]; // [start, end]
```

### 相关状态变量

1. **`dataTimeRange`** (计算值，useMemo)
   - 来源：从 `filteredEntities` 计算得出
   - 计算函数：`renderer.calculateTimeRange(filteredEntities)`
   - 更新时机：当 `filteredEntities` 或 `renderer` 变化时
   - 作用：表示数据实际覆盖的时间范围

2. **`viewTimeRange`** (状态，useState)
   - 初始值：`undefined`
   - 更新时机：用户交互（缩放、拖拽）时
   - 作用：用户自定义的视图时间范围

3. **`originalTimeRange`** (状态，useState)
   - 初始值：`undefined`
   - 更新时机：首次设置 `viewTimeRange` 时
   - 作用：保存初始时间范围，用于重置视图

4. **`timeRange`** (计算值)
   - 定义：`viewTimeRange || dataTimeRange`
   - 作用：实际用于渲染的时间范围

## 更新流程

### 1. 初始化流程

```
filteredEntities 变化
  ↓
dataTimeRange 重新计算 (useMemo)
  ↓
useEffect 检测到 dataTimeRange 变化
  ↓
如果 viewTimeRange 为空，设置 viewTimeRange = dataTimeRange
同时设置 originalTimeRange = dataTimeRange
```

**代码位置：** `src/ui/TimelineView.tsx:86-91`

```typescript
useEffect(() => {
  if (!viewTimeRange && dataTimeRange) {
    setViewTimeRange(dataTimeRange);
    setOriginalTimeRange(dataTimeRange);
  }
}, [dataTimeRange]);
```

### 2. 拖拽滑动更新流程

```
用户按下鼠标 (handleMouseDown)
  ↓
捕获当前 timeRange[0] 和 timeSpan
保存到 panState: { startTime, timeSpan, startX }
  ↓
用户移动鼠标 (handleMouseMove)
  ↓
计算 deltaX = e.clientX - panState.startX
计算 timeDelta = (deltaX / containerWidth) * panState.timeSpan
  ↓
计算新范围：
  newRange = [
    new Date(panState.startTime + timeDelta),
    new Date(panState.startTime + timeDelta + panState.timeSpan)
  ]
  ↓
调用 clampTimeRange(newRange) 限制边界
  ↓
setViewTimeRange(clampedRange)
```

**代码位置：** `src/ui/TimelineView.tsx:231-260`

**关键设计：**
- `handleMouseMove` **不依赖** `timeRange`，只依赖 `panState`
- 使用拖拽开始时捕获的 `timeSpan`，避免拖拽过程中 `timeRange` 变化导致的滚动锁定问题

### 3. 缩放更新流程

#### 3.1 放大 (handleZoomIn)
```
当前 timeRange
  ↓
计算 center = (timeRange[0] + timeRange[1]) / 2
计算 currentSpan = timeRange[1] - timeRange[0]
计算 newSpan = currentSpan * 0.8
  ↓
newRange = [
  new Date(center - newSpan / 2),
  new Date(center + newSpan / 2)
]
  ↓
clampTimeRange(newRange)
  ↓
setViewTimeRange(clampedRange)
```

#### 3.2 缩小 (handleZoomOut)
```
当前 timeRange
  ↓
计算 center = (timeRange[0] + timeRange[1]) / 2
计算 currentSpan = timeRange[1] - timeRange[0]
计算 newSpan = currentSpan * 1.25
  ↓
newRange = [
  new Date(center - newSpan / 2),
  new Date(center + newSpan / 2)
]
  ↓
clampTimeRange(newRange)
  ↓
setViewTimeRange(clampedRange)
```

#### 3.3 滚轮缩放 (handleWheel)
```
当前 timeRange
  ↓
计算 center = (timeRange[0] + timeRange[1]) / 2
计算 currentSpan = timeRange[1] - timeRange[0]
计算 zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
计算 newSpan = currentSpan * zoomFactor
  ↓
限制 newSpan 在 [1天, 10000年] 范围内
  ↓
newRange = [
  new Date(center - newSpan / 2),
  new Date(center + newSpan / 2)
]
  ↓
clampTimeRange(newRange)
  ↓
setViewTimeRange(clampedRange)
```

### 4. 重置视图流程

```
用户点击重置按钮 (handleResetView)
  ↓
如果 originalTimeRange 存在
  ↓
setViewTimeRange([...originalTimeRange])
```

## 边界处理机制

### clampTimeRange 函数

**代码位置：** `src/ui/TimelineView.tsx:102-118`

```typescript
const MIN_SAFE_DATE = new Date('100-01-01').getTime();
const MAX_SAFE_DATE = new Date('10000-12-31').getTime();

const clampTimeRange = useCallback((range: TimeRange): TimeRange => {
  let [start, end] = range;
  const span = end.getTime() - start.getTime();

  // Clamp start date
  if (start.getTime() < MIN_SAFE_DATE) {
    start = new Date(MIN_SAFE_DATE);
    end = new Date(MIN_SAFE_DATE + span);
  }
  // Clamp end date
  else if (end.getTime() > MAX_SAFE_DATE) {
    end = new Date(MAX_SAFE_DATE);
    start = new Date(MAX_SAFE_DATE - span);
  }

  return [start, end];
}, []);
```

### 边界值定义

- **MIN_SAFE_DATE**: `new Date('100-01-01').getTime()`
  - 实际解析结果：`-59011488343000` (对应 `0099-12-31T15:54:17.000Z`)
  - 问题：日期字符串解析可能不准确，导致时间戳为负数

- **MAX_SAFE_DATE**: `new Date('10000-12-31').getTime()`
  - 实际解析结果：`253433808000000` (对应 `+010000-12-30T16:00:00.000Z`)

## 问题定位

### 问题现象

当时间轴向右滑动到边界时，`timeRange` 数据异常，显示为公元 1043 年，导致左右滑动失效。

### 根本原因分析

#### 1. clampTimeRange 逻辑缺陷

**问题 1：只检查单一边界**
- 当前逻辑使用 `if-else if`，只检查 start 或 end 是否超出边界
- 当 `span` 很大时，调整一个边界可能导致另一个边界也超出范围
- 例如：如果 `end > MAX_SAFE_DATE`，调整后 `start = MAX_SAFE_DATE - span` 可能 `< MIN_SAFE_DATE`

**问题 2：边界值解析问题**
- `new Date('100-01-01')` 的解析结果不准确
- 应该使用 `new Date(100, 0, 1)` 来明确指定年份

**问题 3：缺少循环检查**
- 调整边界后，没有再次检查是否满足所有约束
- 可能导致调整后的范围仍然无效

#### 2. 拖拽时的边界处理

**问题场景：**
1. 用户向右滑动到接近 `MAX_SAFE_DATE`
2. `handleMouseMove` 计算出的 `newRange` 的 `end` 超过 `MAX_SAFE_DATE`
3. `clampTimeRange` 将 `end` 设置为 `MAX_SAFE_DATE`，`start` 设置为 `MAX_SAFE_DATE - span`
4. 如果 `span` 很大，`start` 可能变成负数或异常值
5. 如果 `start < MIN_SAFE_DATE`，但由于使用了 `else if`，不会再次调整
6. 导致 `timeRange` 包含异常日期（如 1043 年）

#### 3. 日期解析问题

测试结果：
```javascript
new Date('100-01-01')  // 解析为 0099-12-31T15:54:17.000Z (负数时间戳)
new Date(1043, 7, 27)  // 解析为 1043-08-26T15:54:17.000Z (负数时间戳)
```

负数时间戳可能导致比较逻辑出现问题。

## 修复方案

### 方案 1：改进 clampTimeRange 函数

1. **使用正确的日期构造方式**
   ```typescript
   const MIN_SAFE_DATE = new Date(100, 0, 1).getTime();  // 公元100年1月1日
   const MAX_SAFE_DATE = new Date(10000, 11, 31).getTime(); // 公元10000年12月31日
   ```

2. **改进边界检查逻辑**
   - 使用循环检查，确保调整后满足所有约束
   - 同时检查 start 和 end 是否都在有效范围内
   - 如果 `span` 太大，限制 `span` 的最大值

3. **添加边界限制检查**
   ```typescript
   const clampTimeRange = useCallback((range: TimeRange): TimeRange => {
     let [start, end] = range;
     let span = end.getTime() - start.getTime();
     
     // 限制 span 的最大值
     const maxSpan = MAX_SAFE_DATE - MIN_SAFE_DATE;
     if (span > maxSpan) {
       span = maxSpan;
     }
     
     // 确保 start >= MIN_SAFE_DATE
     if (start.getTime() < MIN_SAFE_DATE) {
       start = new Date(MIN_SAFE_DATE);
       end = new Date(MIN_SAFE_DATE + span);
     }
     
     // 确保 end <= MAX_SAFE_DATE
     if (end.getTime() > MAX_SAFE_DATE) {
       end = new Date(MAX_SAFE_DATE);
       start = new Date(MAX_SAFE_DATE - span);
       // 再次检查 start 是否有效
       if (start.getTime() < MIN_SAFE_DATE) {
         start = new Date(MIN_SAFE_DATE);
         end = new Date(MIN_SAFE_DATE + span);
       }
     }
     
     return [start, end];
   }, []);
   ```

### 方案 2：添加边界检测和恢复机制

在 `handleMouseMove` 中添加额外的边界检测：

```typescript
const handleMouseMove = useCallback((e: MouseEvent) => {
  // ... 现有代码 ...
  
  const newRange: TimeRange = [
    new Date(panState.startTime + timeDelta),
    new Date(panState.startTime + timeDelta + timeSpan),
  ];
  
  // 检查边界，如果超出则停止滑动
  const clampedRange = clampTimeRange(newRange);
  
  // 如果调整后的范围与原始范围差异过大，说明已经到达边界
  const startDiff = Math.abs(clampedRange[0].getTime() - newRange[0].getTime());
  const endDiff = Math.abs(clampedRange[1].getTime() - newRange[1].getTime());
  
  if (startDiff > timeSpan * 0.1 || endDiff > timeSpan * 0.1) {
    // 已经到达边界，不继续更新
    return;
  }
  
  setViewTimeRange(clampedRange);
}, [panState, clampTimeRange]);
```

## 总结

`timeRange` 的更新机制涉及多个状态和计算值的协调：

1. **数据驱动**：`dataTimeRange` 从实体数据计算得出
2. **用户交互**：`viewTimeRange` 通过拖拽、缩放等操作更新
3. **边界保护**：`clampTimeRange` 确保时间范围在有效区间内

当前的主要问题在于 `clampTimeRange` 函数的边界处理逻辑不够健壮，需要改进以处理各种边界情况。
