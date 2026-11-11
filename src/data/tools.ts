import type { CategoryId, ToolMeta } from '@/types/tool'

/**
 * 统一工具注册表。
 * 新增工具时：在 src/tools/<id>/ 下新增 index.vue 与 logic.ts，
 * 然后在下方数组追加一条元数据，并在 pages/tool/detail.vue 中挂载组件即可。
 */
export const TOOLS: ToolMeta[] = [
  {
    id: 'date-calculator',
    name: '日期计算器',
    desc: '算相隔天数、前后 N 天、还有多少天',
    category: 'calc',
    icon: '日',
    keywords: ['日期', '天数', '相隔', '倒计时', '还有多少天', '闰年', '纪念日', '生日', '考试', '合同', '年月日'],
    recommended: true,
    tip: '日期按日历天数计算，不依赖手机时区。'
  },
  {
    id: 'unit-converter',
    name: '单位换算器',
    desc: '长度、重量、面积、容量、温度、存储单位',
    category: 'calc',
    icon: '换',
    keywords: ['单位', '换算', '转换', '长度', '重量', '斤', '两', '亩', '平方米', '英寸', '英尺', '温度', '摄氏', '华氏', '容量', '流量', 'MB', 'GB'],
    recommended: true
  },
  {
    id: 'mortgage-calculator',
    name: '房贷计算器',
    desc: '商业贷、公积金贷、组合贷，两种还款方式',
    category: 'calc',
    icon: '房',
    keywords: ['房贷', '贷款', '月供', '等额本息', '等额本金', '公积金', '组合贷', '利息', '买房', '利率']
  },
  {
    id: 'tax-calculator',
    name: '个税计算器',
    desc: '按年度综合所得口径估算工资薪金个税',
    category: 'calc',
    icon: '税',
    keywords: ['个税', '个人所得税', '工资', '税后', '五险一金', '专项附加扣除', '起征点', '汇算', '税率', '速算扣除数']
  },
  {
    id: 'qrcode-generator',
    name: '二维码生成',
    desc: '把文字、网址生成二维码并保存到相册',
    category: 'life',
    icon: '码',
    keywords: ['二维码', 'QR', '扫码', '网址', '链接', '名片', '保存图片'],
    recommended: true,
    tip: '二维码在本机生成，内容不会上传。'
  },
  {
    id: 'random-number',
    name: '随机数生成',
    desc: '在指定范围内随机抽取一个或多个数字',
    category: 'life',
    icon: '数',
    keywords: ['随机数', '抽号', '摇号', '随机', '抽奖', '号码', '范围']
  },
  {
    id: 'random-picker',
    name: '随机抽签',
    desc: '今天吃什么、谁来买单，交给抽签决定',
    category: 'life',
    icon: '签',
    keywords: ['抽签', '抽签器', '随机', '吃什么', '抓阄', '抽奖', '点名', '选择'],
    recommended: true
  },
  {
    id: 'password-generator',
    name: '密码生成器',
    desc: '在本机生成随机密码，不保存历史',
    category: 'life',
    icon: '密',
    keywords: ['密码', '随机密码', '强密码', '生成密码', '口令', '字符']
  },
  {
    id: 'image-compressor',
    name: '图片压缩',
    desc: '选择照片，调质量，压缩后保存到相册',
    category: 'image',
    icon: '压',
    keywords: ['图片', '照片', '压缩', '缩小体积', '节省空间', '图片大小'],
    recommended: true,
    tip: '图片全程在本机处理，不会上传。'
  },
  {
    id: 'image-resizer',
    name: '图片尺寸调整',
    desc: '修改图片宽高，可锁定原始比例',
    category: 'image',
    icon: '尺',
    keywords: ['图片', '照片', '尺寸', '宽高', '缩放', '分辨率', '比例']
  },
  {
    id: 'word-counter',
    name: '字数统计',
    desc: '统计汉字、单词、数字、标点、行数等',
    category: 'text',
    icon: '字',
    keywords: ['字数', '统计', '字符', '汉字', '单词', '段落', '行数', '作文', '文案'],
    recommended: true
  },
  {
    id: 'text-deduplicator',
    name: '文本去重',
    desc: '按行去掉重复内容，保留原有顺序',
    category: 'text',
    icon: '重',
    keywords: ['去重', '重复', '文本', '按行', '名单', '整理']
  }
]

const TOOL_MAP = new Map<string, ToolMeta>(TOOLS.map((tool) => [tool.id, tool]))

export const DEFAULT_RECOMMENDED_IDS: string[] = TOOLS.filter((tool) => tool.recommended).map((tool) => tool.id)

export function getTool(id: string): ToolMeta | undefined {
  return TOOL_MAP.get(id)
}

export function getToolsByCategory(category: CategoryId): ToolMeta[] {
  return TOOLS.filter((tool) => tool.category === category)
}

/** 按给定 ID 顺序返回工具，自动忽略已下线的工具 */
export function getToolsByIds(ids: string[]): ToolMeta[] {
  const result: ToolMeta[] = []
  ids.forEach((id) => {
    const tool = TOOL_MAP.get(id)
    if (tool) result.push(tool)
  })
  return result
}

/** 工具搜索：匹配名称、分类名称、说明与关键词，实时返回结果 */
export function searchTools(query: string): ToolMeta[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  return TOOLS.filter((tool) => {
    const categoryName = CATEGORY_NAMES[tool.category] || ''
    const haystack = [tool.name, tool.desc, categoryName, ...tool.keywords].join(' ').toLowerCase()
    return haystack.includes(trimmed)
  })
}

const CATEGORY_NAMES: Record<CategoryId, string> = {
  calc: '计算工具 计算',
  life: '生活工具 生活',
  image: '图片工具 图片 照片',
  text: '文本工具 文本 文字'
}
