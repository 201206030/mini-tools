import type { Category, CategoryId } from '@/types/tool'

export const CATEGORIES: Category[] = [
  {
    id: 'calc',
    name: '计算工具',
    desc: '日期、换算、房贷、个税、汇率、健康与作息',
    icon: '算',
    color: '#3EAF7C',
    tint: '#E8F6EF'
  },
  {
    id: 'life',
    name: '生活工具',
    desc: '二维码、Wi-Fi、随机与密码',
    icon: '生',
    color: '#E9963A',
    tint: '#FFF2E1'
  },
  {
    id: 'image',
    name: '图片工具',
    desc: '压缩、尺寸、取色与编码',
    icon: '图',
    color: '#5B8FF9',
    tint: '#EAF1FF'
  },
  {
    id: 'text',
    name: '文本工具',
    desc: '字数统计、去重与文本对比',
    icon: '文',
    color: '#9270CA',
    tint: '#F1EBFA'
  },
  {
    id: 'study',
    name: '学习工具',
    desc: '公式、元素、分数、编码与质数',
    icon: '学',
    color: '#E2646B',
    tint: '#FDEDEE'
  },
  {
    id: 'office',
    name: '办公工具',
    desc: 'JSON、时间、进制、编码与标识',
    icon: '办',
    color: '#2C9CB0',
    tint: '#E6F5F8'
  }
]

const CATEGORY_MAP = new Map<CategoryId, Category>(CATEGORIES.map((item) => [item.id, item]))

export function getCategory(id: CategoryId): Category {
  return CATEGORY_MAP.get(id) || CATEGORIES[0]
}

export function getCategoryName(id: CategoryId): string {
  return getCategory(id).name
}
