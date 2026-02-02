# TimeRange 边界问题修复总结

## 问题描述

当时间轴向右滑动到边界时，`timeRange` 数据异常，显示为公元 1043 年，导致左右滑动失效。

## 根本原因

### 1. 日期构造方式不正确
- **原代码**：`new Date('100-01-01')`
- **问题**：字符串解析可能不准确，导致时间戳为负数或异常值
- **测试结果**：`new Date('100-01-01')` 解析为 `0099-12-31T15:54:17.000Z`（负数时间戳）

### 2. clampTimeRange 逻辑缺陷
- **问题 1**：使用 `if-else if` 结构，只检查单一边界
  - 当调整 end 边界时，可能导致 start 超出范围
  - 当调整 start 边界时，可能导致 end 超出范围
- **问题 2**：缺少 span 限制
  - 如果 `span` 超过 `MAX_SAFE_DATE - MIN_SAFE_DATE`，无法正确限制
- **问题 3**：缺少循环验证
  - 调整边界后，没有再次验证是否满足所有约束

### 3. 边界处理不完善
- 当滑动到边界时，`clampTimeRange` 可能产生无效的时间范围
- 无效的时间范围导致时间轴渲染异常，进一步影响滑动功能

## 修复方案

### 1. 修正日期构造方式

**修复前：**
```typescript
const MIN_SAFE_DATE = new Date('100-01-01').getTime();
const MAX_SAFE_DATE = new Date('10000-12-31').getTime();
```

**修复后：**
```typescript
const MIN_SAFE_DATE = new Date(100, 0, 1).getTime(); // 公元100年1月1日
const MAX_SAFE_DATE = new Date(10000, 11, 31, 23, 59, 59, 999).getTime(); // 公元10000年12月31日
```

**改进点：**
- 使用明确的日期构造函数参数，避免字符串解析问题
- 确保时间戳为正数且准确

### 2. 重写 clampTimeRange 函数

**核心改进：**

1. **限制 span 的最大值**
   ```typescript
   const maxSpan = MAX_SAFE_DATE - MIN_SAFE_DATE;
   if (span > maxSpan) {
     span = maxSpan;
   }
   ```

2. **使用中心点调整策略**
   - 尝试保持原始中心点
   - 如果中心点调整后超出边界，再调整边界

3. **双重边界检查**
   - 先检查 start 边界，调整后检查 end 边界
   - 如果 end 超出，调整后再次检查 start
   - 如果 span 太大，使用最大 span 并居中显示

4. **最终验证和回退**
   - 确保最终结果在有效范围内
   - 如果仍然无效，使用安全的默认值（居中显示）

**修复后的逻辑流程：**

```
输入 range [start, end]
  ↓
确保 span 为正数
  ↓
限制 span <= maxSpan
  ↓
计算中心点 center = (start + end) / 2
  ↓
尝试保持中心点：clampedStart = center - span/2, clampedEnd = center + span/2
  ↓
如果 clampedStart < MIN_SAFE_DATE:
  调整 clampedStart = MIN_SAFE_DATE
  调整 clampedEnd = MIN_SAFE_DATE + span
  如果 clampedEnd > MAX_SAFE_DATE:
    进一步调整...
  ↓
如果 clampedEnd > MAX_SAFE_DATE:
  调整 clampedEnd = MAX_SAFE_DATE
  调整 clampedStart = MAX_SAFE_DATE - span
  如果 clampedStart < MIN_SAFE_DATE:
    进一步调整...
  ↓
最终验证：确保 finalStart >= MIN_SAFE_DATE 且 finalEnd <= MAX_SAFE_DATE
  ↓
如果无效，使用安全默认值（居中显示）
  ↓
返回 [finalStart, finalEnd]
```

## 修复效果

### 修复前的问题
- 滑动到边界时，`timeRange` 可能变成异常值（如 1043 年）
- 时间轴渲染失败，左右滑动失效
- 需要重新加载插件才能恢复

### 修复后的改进
- ✅ 边界处理更加健壮，不会产生异常时间值
- ✅ 滑动到边界时，时间范围被正确限制在有效区间内
- ✅ 即使 span 很大，也能正确处理并居中显示
- ✅ 添加了多重验证和回退机制，确保始终返回有效的时间范围

## 测试建议

1. **边界滑动测试**
   - 向右滑动到最大日期边界
   - 向左滑动到最小日期边界
   - 验证 `timeRange` 始终在有效范围内

2. **大 span 测试**
   - 缩放时间轴到非常大的时间跨度
   - 尝试滑动，验证边界处理正确

3. **极端情况测试**
   - 测试 span 超过 `MAX_SAFE_DATE - MIN_SAFE_DATE` 的情况
   - 验证回退机制正常工作

## 相关文件

- `src/ui/TimelineView.tsx` - 主要修复文件
- `docs/timeRange-update-mechanism.md` - 更新机制详细文档

## 后续优化建议

1. **添加边界视觉反馈**
   - 当到达边界时，显示视觉提示（如边界高亮）
   - 改善用户体验

2. **性能优化**
   - 如果已经在边界上，可以减少不必要的更新
   - 添加防抖机制

3. **边界值可配置**
   - 将 `MIN_SAFE_DATE` 和 `MAX_SAFE_DATE` 设为可配置项
   - 允许用户自定义时间范围限制
