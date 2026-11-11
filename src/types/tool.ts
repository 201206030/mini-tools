/** 工具分类标识 */
export type CategoryId = 'calc' | 'life' | 'image' | 'text'

/** 工具分类元数据 */
export interface Category {
  id: CategoryId
  name: string
  desc: string
  icon: string
  /** 主色调（用于分类卡与图标底色） */
  color: string
  /** 浅色底 */
  tint: string
}

/** 工具元数据：驱动首页展示、搜索、分类与路由 */
export interface ToolMeta {
  id: string
  name: string
  desc: string
  category: CategoryId
  /** 图标文字（中文单字，非 Emoji，保证各基础库版本显示一致） */
  icon: string
  /** 搜索关键词，包含名称、分类、场景词 */
  keywords: string[]
  /** 是否为默认推荐工具 */
  recommended?: boolean
  /** 工具补充说明，展示在详情页 */
  tip?: string
}

/** 最近使用记录：只保存工具 ID 与时间，不保存任何输入内容 */
export interface RecentItem {
  id: string
  time: number
}
