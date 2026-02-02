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
  types?: EntityType[];
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
