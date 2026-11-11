import type { Category, CategoryId } from '@/types/tool'

export const CATEGORIES: Category[] = [
  {
    id: 'calc',
    name: '计算工具',
    desc: '日期、换算、房贷、个税',
    icon: '算',
    color: '#3EAF7C',
    tint: '#E8F6EF'
  },
  {
    id: 'life',
    name: '生活工具',
    desc: '二维码、随机、密码',
    icon: '生',
    color: '#E9963A',
    tint: '#FFF2E1'
  },
  {
    id: 'image',
    name: '图片工具',
    desc: '压缩、调整尺寸',
    icon: '图',
    color: '#5B8FF9',
    tint: '#EAF1FF'
  },
  {
    id: 'text',
    name: '文本工具',
    desc: '字数统计、文本去重',
    icon: '文',
    color: '#9270CA',
    tint: '#F1EBFA'
  }
]

const CATEGORY_MAP = new Map<CategoryId, Category>(CATEGORIES.map((item) => [item.id, item]))

export function getCategory(id: CategoryId): Category {
  return CATEGORY_MAP.get(id) || CATEGORIES[0]
}

export function getCategoryName(id: CategoryId): string {
  return getCategory(id).name
}
