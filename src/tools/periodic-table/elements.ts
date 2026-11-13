/**
 * 元素周期表静态数据（1 - 118 号）。
 *
 * 说明：
 * - 相对原子质量取常用标准值；放射性元素用方括号标出最稳定同位素的质量数。
 * - 104 号及以后元素的官方中文名多属 CJK 扩展汉字，部分机型字体无法显示，
 *   因此数据源中留空，界面以元素符号为准并在详情里说明，避免出现「豆腐块」。
 * - 数据全部内置在本机，不联网、不请求任何接口。
 */

export type ElementCategory =
  | 'alkali'
  | 'alkaline'
  | 'transition'
  | 'metal'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble'
  | 'lanthanide'
  | 'actinide'

export interface ChemicalElement {
  number: number
  symbol: string
  name: string
  mass: string
  category: ElementCategory
  period: number
}

export interface ElementCategoryOption {
  id: ElementCategory | 'all'
  name: string
  color: string
}

export const ELEMENT_CATEGORIES: ElementCategoryOption[] = [
  { id: 'all', name: '全部', color: '#3EAF7C' },
  { id: 'alkali', name: '碱金属', color: '#E2646B' },
  { id: 'alkaline', name: '碱土金属', color: '#E9963A' },
  { id: 'transition', name: '过渡金属', color: '#5B8FF9' },
  { id: 'metal', name: '主族金属', color: '#7B8FA8' },
  { id: 'metalloid', name: '类金属', color: '#9270CA' },
  { id: 'nonmetal', name: '非金属', color: '#3EAF7C' },
  { id: 'halogen', name: '卤素', color: '#D9A520' },
  { id: 'noble', name: '稀有气体', color: '#2C9CB0' },
  { id: 'lanthanide', name: '镧系', color: '#C96A9B' },
  { id: 'actinide', name: '锕系', color: '#8B6F47' }
]

export function getCategoryName(id: ElementCategory): string {
  return ELEMENT_CATEGORIES.find((item) => item.id === id)?.name || ''
}

export function getCategoryColor(id: ElementCategory): string {
  return ELEMENT_CATEGORIES.find((item) => item.id === id)?.color || '#3EAF7C'
}

/** [原子序数, 元素符号, 中文名, 相对原子质量, 类别] */
type RawElement = [number, string, string, string, ElementCategory]

const RAW: RawElement[] = [
  // 第 1 周期
  [1, 'H', '氢', '1.008', 'nonmetal'],
  [2, 'He', '氦', '4.0026', 'noble'],
  // 第 2 周期
  [3, 'Li', '锂', '6.94', 'alkali'],
  [4, 'Be', '铍', '9.0122', 'alkaline'],
  [5, 'B', '硼', '10.81', 'metalloid'],
  [6, 'C', '碳', '12.011', 'nonmetal'],
  [7, 'N', '氮', '14.007', 'nonmetal'],
  [8, 'O', '氧', '15.999', 'nonmetal'],
  [9, 'F', '氟', '18.998', 'halogen'],
  [10, 'Ne', '氖', '20.180', 'noble'],
  // 第 3 周期
  [11, 'Na', '钠', '22.990', 'alkali'],
  [12, 'Mg', '镁', '24.305', 'alkaline'],
  [13, 'Al', '铝', '26.982', 'metal'],
  [14, 'Si', '硅', '28.085', 'metalloid'],
  [15, 'P', '磷', '30.974', 'nonmetal'],
  [16, 'S', '硫', '32.06', 'nonmetal'],
  [17, 'Cl', '氯', '35.45', 'halogen'],
  [18, 'Ar', '氩', '39.95', 'noble'],
  // 第 4 周期
  [19, 'K', '钾', '39.098', 'alkali'],
  [20, 'Ca', '钙', '40.078', 'alkaline'],
  [21, 'Sc', '钪', '44.956', 'transition'],
  [22, 'Ti', '钛', '47.867', 'transition'],
  [23, 'V', '钒', '50.942', 'transition'],
  [24, 'Cr', '铬', '51.996', 'transition'],
  [25, 'Mn', '锰', '54.938', 'transition'],
  [26, 'Fe', '铁', '55.845', 'transition'],
  [27, 'Co', '钴', '58.933', 'transition'],
  [28, 'Ni', '镍', '58.693', 'transition'],
  [29, 'Cu', '铜', '63.546', 'transition'],
  [30, 'Zn', '锌', '65.38', 'transition'],
  [31, 'Ga', '镓', '69.723', 'metal'],
  [32, 'Ge', '锗', '72.630', 'metalloid'],
  [33, 'As', '砷', '74.922', 'metalloid'],
  [34, 'Se', '硒', '78.971', 'nonmetal'],
  [35, 'Br', '溴', '79.904', 'halogen'],
  [36, 'Kr', '氪', '83.798', 'noble'],
  // 第 5 周期
  [37, 'Rb', '铷', '85.468', 'alkali'],
  [38, 'Sr', '锶', '87.62', 'alkaline'],
  [39, 'Y', '钇', '88.906', 'transition'],
  [40, 'Zr', '锆', '91.224', 'transition'],
  [41, 'Nb', '铌', '92.906', 'transition'],
  [42, 'Mo', '钼', '95.95', 'transition'],
  [43, 'Tc', '锝', '[98]', 'transition'],
  [44, 'Ru', '钌', '101.07', 'transition'],
  [45, 'Rh', '铑', '102.91', 'transition'],
  [46, 'Pd', '钯', '106.42', 'transition'],
  [47, 'Ag', '银', '107.87', 'transition'],
  [48, 'Cd', '镉', '112.41', 'transition'],
  [49, 'In', '铟', '114.82', 'metal'],
  [50, 'Sn', '锡', '118.71', 'metal'],
  [51, 'Sb', '锑', '121.76', 'metalloid'],
  [52, 'Te', '碲', '127.60', 'metalloid'],
  [53, 'I', '碘', '126.90', 'halogen'],
  [54, 'Xe', '氙', '131.29', 'noble'],
  // 第 6 周期
  [55, 'Cs', '铯', '132.91', 'alkali'],
  [56, 'Ba', '钡', '137.33', 'alkaline'],
  [57, 'La', '镧', '138.91', 'lanthanide'],
  [58, 'Ce', '铈', '140.12', 'lanthanide'],
  [59, 'Pr', '镨', '140.91', 'lanthanide'],
  [60, 'Nd', '钕', '144.24', 'lanthanide'],
  [61, 'Pm', '钷', '[145]', 'lanthanide'],
  [62, 'Sm', '钐', '150.36', 'lanthanide'],
  [63, 'Eu', '铕', '151.96', 'lanthanide'],
  [64, 'Gd', '钆', '157.25', 'lanthanide'],
  [65, 'Tb', '铽', '158.93', 'lanthanide'],
  [66, 'Dy', '镝', '162.50', 'lanthanide'],
  [67, 'Ho', '钬', '164.93', 'lanthanide'],
  [68, 'Er', '铒', '167.26', 'lanthanide'],
  [69, 'Tm', '铥', '168.93', 'lanthanide'],
  [70, 'Yb', '镱', '173.05', 'lanthanide'],
  [71, 'Lu', '镥', '174.97', 'lanthanide'],
  [72, 'Hf', '铪', '178.49', 'transition'],
  [73, 'Ta', '钽', '180.95', 'transition'],
  [74, 'W', '钨', '183.84', 'transition'],
  [75, 'Re', '铼', '186.21', 'transition'],
  [76, 'Os', '锇', '190.23', 'transition'],
  [77, 'Ir', '铱', '192.22', 'transition'],
  [78, 'Pt', '铂', '195.08', 'transition'],
  [79, 'Au', '金', '196.97', 'transition'],
  [80, 'Hg', '汞', '200.59', 'transition'],
  [81, 'Tl', '铊', '204.38', 'metal'],
  [82, 'Pb', '铅', '207.2', 'metal'],
  [83, 'Bi', '铋', '208.98', 'metal'],
  [84, 'Po', '钋', '[209]', 'metal'],
  [85, 'At', '砹', '[210]', 'halogen'],
  [86, 'Rn', '氡', '[222]', 'noble'],
  // 第 7 周期
  [87, 'Fr', '钫', '[223]', 'alkali'],
  [88, 'Ra', '镭', '[226]', 'alkaline'],
  [89, 'Ac', '锕', '[227]', 'actinide'],
  [90, 'Th', '钍', '232.04', 'actinide'],
  [91, 'Pa', '镤', '231.04', 'actinide'],
  [92, 'U', '铀', '238.03', 'actinide'],
  [93, 'Np', '镎', '[237]', 'actinide'],
  [94, 'Pu', '钚', '[244]', 'actinide'],
  [95, 'Am', '镅', '[243]', 'actinide'],
  [96, 'Cm', '锔', '[247]', 'actinide'],
  [97, 'Bk', '锫', '[247]', 'actinide'],
  [98, 'Cf', '锎', '[251]', 'actinide'],
  [99, 'Es', '锿', '[252]', 'actinide'],
  [100, 'Fm', '镄', '[257]', 'actinide'],
  [101, 'Md', '钔', '[258]', 'actinide'],
  [102, 'No', '锘', '[259]', 'actinide'],
  [103, 'Lr', '铹', '[266]', 'actinide'],
  [104, 'Rf', '', '[267]', 'transition'],
  [105, 'Db', '', '[268]', 'transition'],
  [106, 'Sg', '', '[269]', 'transition'],
  [107, 'Bh', '', '[270]', 'transition'],
  [108, 'Hs', '', '[269]', 'transition'],
  [109, 'Mt', '', '[278]', 'transition'],
  [110, 'Ds', '', '[281]', 'transition'],
  [111, 'Rg', '', '[282]', 'transition'],
  [112, 'Cn', '', '[285]', 'transition'],
  [113, 'Nh', '', '[286]', 'metal'],
  [114, 'Fl', '', '[289]', 'metal'],
  [115, 'Mc', '', '[290]', 'metal'],
  [116, 'Lv', '', '[293]', 'metal'],
  [117, 'Ts', '', '[294]', 'halogen'],
  [118, 'Og', '', '[294]', 'noble']
]

/** 按原子序数推算所属周期，避免在数据里重复录入 */
export function periodOf(number: number): number {
  if (number <= 2) return 1
  if (number <= 10) return 2
  if (number <= 18) return 3
  if (number <= 36) return 4
  if (number <= 54) return 5
  if (number <= 86) return 6
  return 7
}

export const ELEMENTS: ChemicalElement[] = RAW.map(([number, symbol, name, mass, category]) => ({
  number,
  symbol,
  name,
  mass,
  category,
  period: periodOf(number)
}))

export function getElementByNumber(number: number): ChemicalElement | undefined {
  return ELEMENTS.find((item) => item.number === number)
}

/** 支持按序号、符号、中文名、相对原子质量与类别名搜索 */
export function searchElements(query: string, category: ElementCategory | 'all'): ChemicalElement[] {
  const keyword = query.trim().toLowerCase()
  return ELEMENTS.filter((item) => {
    if (category !== 'all' && item.category !== category) return false
    if (!keyword) return true
    const haystack = [
      String(item.number),
      item.symbol,
      item.name,
      item.mass,
      getCategoryName(item.category),
      String(item.period)
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(keyword)
  })
}
