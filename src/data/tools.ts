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
  },
  {
    id: 'exchange-rate',
    name: '汇率计算器',
    desc: '多币种换算，联网取一次汇率后即可离线使用',
    category: 'calc',
    icon: '汇',
    keywords: ['汇率', '换算', '外币', '货币', '兑换', '美元', '欧元', '日元', '港币', '出国', '旅游', '代购', '结汇', 'CNY', 'USD'],
    recommended: true,
    tip: '首次需联网获取一次参考汇率，之后保存在本机，断网也能换算；金额不会上传。'
  },
  {
    id: 'math-formulas',
    name: '数学公式',
    desc: '常用数学公式速查，可按分类与关键词查找',
    category: 'study',
    icon: '公',
    keywords: ['数学', '公式', '几何', '代数', '三角函数', '面积', '体积', '勾股', '二次方程', '导数', '数列', '概率', '学生', '考试'],
    tip: '公式为纯文本展示，供学习与速查使用。'
  },
  {
    id: 'periodic-table',
    name: '元素周期表',
    desc: '118 种元素的符号、名称与相对原子质量速查',
    category: 'study',
    icon: '素',
    keywords: ['元素', '周期表', '化学', '原子序数', '原子量', '元素符号', '金属', '稀有气体', '学生', '考试'],
    tip: '元素数据内置在本机，无需联网。'
  },
  {
    id: 'fraction-calculator',
    name: '分数计算器',
    desc: '分数四则运算、自动约分与小数互化',
    category: 'study',
    icon: '分',
    keywords: ['分数', '约分', '通分', '四则运算', '小数', '百分数', '分子', '分母', '数学', '学生'],
    tip: '结果自动化为最简分数，并同时给出小数与百分数。'
  },
  {
    id: 'morse-code',
    name: '摩斯电码',
    desc: '英文字母、数字与摩斯电码互相转换',
    category: 'study',
    icon: '摩',
    keywords: ['摩斯', '摩尔斯', '电码', 'Morse', '点划', '密码', '电报', 'SOS'],
    tip: '摩斯电码仅支持英文字母、数字与常用标点，暂不支持中文。'
  },
  {
    id: 'roman-numeral',
    name: '罗马数字',
    desc: '阿拉伯数字与罗马数字互相转换',
    category: 'study',
    icon: '罗',
    keywords: ['罗马数字', '罗马', 'Roman', 'I', 'V', 'X', '阿拉伯数字', '年份', '章节'],
    tip: '罗马数字标准写法仅支持 1 到 3999 的整数。'
  },
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    desc: '校验、美化、压缩与转义 JSON 文本',
    category: 'office',
    icon: '格',
    keywords: ['JSON', '格式化', '美化', '压缩', '校验', '转义', '缩进', '开发', '接口', '数据'],
    tip: 'JSON 在本机解析，内容不会上传。'
  },
  {
    id: 'timestamp-converter',
    name: '时间戳转换',
    desc: '秒 / 毫秒时间戳与日期时间互相转换',
    category: 'office',
    icon: '时',
    keywords: ['时间戳', 'Unix', 'timestamp', '毫秒', '秒', '日期', '时间', '时区', '开发'],
    tip: '按手机本地时区换算，不联网校准时间。'
  },
  {
    id: 'base64-codec',
    name: 'Base64 编解码',
    desc: '文本与 Base64 互转，正确处理中文',
    category: 'office',
    icon: '编',
    keywords: ['Base64', '编码', '解码', 'base64', 'UTF-8', '中文', '开发', '转义'],
    tip: '编码与解码都在本机完成，内容不会上传。'
  },
  {
    id: 'url-codec',
    name: 'URL 编码解码',
    desc: '网址与文本的百分号编码互相转换',
    category: 'office',
    icon: '址',
    keywords: ['URL', 'url', '网址', '编码', '解码', '百分号', 'percent', '转义', '参数', '开发'],
    tip: '按 UTF-8 逐字节编码，中文与空格都能正确处理。'
  },
  {
    id: 'uuid-generator',
    name: 'UUID 生成',
    desc: '在本机生成 UUID v4，可批量、可去掉横线',
    category: 'office',
    icon: '号',
    keywords: ['UUID', 'GUID', '唯一标识', '随机 ID', 'v4', '开发', '批量'],
    tip: '优先使用系统安全随机源，生成结果不保存历史。'
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
  text: '文本工具 文本 文字',
  study: '学习工具 学习 学生 数学 化学 考试',
  office: '办公工具 办公 效率 开发 程序员 编码'
}
