/**
 * 常用数学公式静态数据。
 * 公式用纯文本 + Unicode 数学符号展示，不引入公式渲染库，保证离线与低端机型可用。
 */

export interface FormulaGroup {
  id: string
  name: string
}

export interface FormulaItem {
  group: string
  name: string
  expr: string
  note?: string
}

export const FORMULA_GROUPS: FormulaGroup[] = [
  { id: 'all', name: '全部' },
  { id: 'algebra', name: '代数' },
  { id: 'equation', name: '方程' },
  { id: 'plane', name: '平面几何' },
  { id: 'solid', name: '立体几何' },
  { id: 'trig', name: '三角函数' },
  { id: 'sequence', name: '数列' },
  { id: 'prob', name: '概率统计' },
  { id: 'calculus', name: '微积分' },
  { id: 'constant', name: '常用常数' }
]

export const FORMULAS: FormulaItem[] = [
  // 代数
  { group: 'algebra', name: '平方差', expr: 'a² − b² = (a + b)(a − b)' },
  { group: 'algebra', name: '完全平方', expr: '(a ± b)² = a² ± 2ab + b²' },
  { group: 'algebra', name: '立方和', expr: 'a³ + b³ = (a + b)(a² − ab + b²)' },
  { group: 'algebra', name: '立方差', expr: 'a³ − b³ = (a − b)(a² + ab + b²)' },
  { group: 'algebra', name: '二项式定理', expr: '(a + b)^n = Σ C(n,k)·a^(n−k)·b^k' },
  { group: 'algebra', name: '同底数幂相乘', expr: 'a^m × a^n = a^(m+n)' },
  { group: 'algebra', name: '幂的乘方', expr: '(a^m)^n = a^(mn)' },
  { group: 'algebra', name: '对数乘法', expr: 'logₐ(MN) = logₐM + logₐN' },
  { group: 'algebra', name: '对数换底', expr: 'logₐb = ln b / ln a' },
  { group: 'algebra', name: '绝对值', expr: '|a × b| = |a| × |b|，|a/b| = |a|/|b|' },
  { group: 'algebra', name: '比例性质', expr: '若 a/b = c/d，则 ad = bc' },

  // 方程
  { group: 'equation', name: '一元一次方程', expr: 'ax + b = 0 → x = −b/a（a ≠ 0）' },
  { group: 'equation', name: '一元二次方程求根', expr: 'x = (−b ± √(b² − 4ac)) / (2a)' },
  { group: 'equation', name: '判别式', expr: 'Δ = b² − 4ac；Δ > 0 两根，Δ = 0 重根，Δ < 0 无实根' },
  { group: 'equation', name: '韦达定理', expr: 'x₁ + x₂ = −b/a，x₁·x₂ = c/a' },
  { group: 'equation', name: '两点间距离', expr: 'd = √((x₂ − x₁)² + (y₂ − y₁)²)' },
  { group: 'equation', name: '中点坐标', expr: 'M = ((x₁ + x₂)/2, (y₁ + y₂)/2)' },
  { group: 'equation', name: '均值不等式', expr: '(a + b)/2 ≥ √(ab)（a, b ≥ 0）' },

  // 平面几何
  { group: 'plane', name: '勾股定理', expr: 'a² + b² = c²（直角三角形）' },
  { group: 'plane', name: '三角形面积', expr: 'S = 底 × 高 / 2' },
  { group: 'plane', name: '海伦公式', expr: 'S = √(p(p−a)(p−b)(p−c))，p = (a+b+c)/2' },
  { group: 'plane', name: '三角形内角和', expr: '∠A + ∠B + ∠C = 180°' },
  { group: 'plane', name: '多边形内角和', expr: '(n − 2) × 180°；外角和恒为 360°' },
  { group: 'plane', name: '矩形', expr: 'S = a × b，C = 2(a + b)' },
  { group: 'plane', name: '平行四边形', expr: 'S = 底 × 高' },
  { group: 'plane', name: '梯形', expr: 'S = (上底 + 下底) × 高 / 2' },
  { group: 'plane', name: '菱形', expr: 'S = 两条对角线乘积 / 2' },
  { group: 'plane', name: '圆', expr: 'C = 2πr，S = πr²' },
  { group: 'plane', name: '弧长', expr: 'l = nπr / 180（n 为圆心角度数）' },
  { group: 'plane', name: '扇形面积', expr: 'S = nπr²/360 = l·r / 2' },

  // 立体几何
  { group: 'solid', name: '长方体', expr: 'V = 长 × 宽 × 高，S = 2(ab + bc + ca)' },
  { group: 'solid', name: '正方体', expr: 'S = 6a²，V = a³' },
  { group: 'solid', name: '圆柱', expr: 'V = πr²h，侧面积 S = 2πrh' },
  { group: 'solid', name: '圆锥', expr: 'V = πr²h / 3，侧面积 S = πrl' },
  { group: 'solid', name: '球', expr: 'V = 4πr³ / 3，S = 4πr²' },
  { group: 'solid', name: '棱柱', expr: 'V = 底面积 × 高' },
  { group: 'solid', name: '棱锥', expr: 'V = 底面积 × 高 / 3' },

  // 三角函数
  { group: 'trig', name: '基本关系', expr: 'sin²A + cos²A = 1，tan A = sin A / cos A' },
  { group: 'trig', name: '正弦定理', expr: 'a/sin A = b/sin B = c/sin C = 2R' },
  { group: 'trig', name: '余弦定理', expr: 'c² = a² + b² − 2ab·cos C' },
  { group: 'trig', name: '三角形面积', expr: 'S = ab·sin C / 2' },
  { group: 'trig', name: '正弦和角', expr: 'sin(A ± B) = sin A·cos B ± cos A·sin B' },
  { group: 'trig', name: '余弦和角', expr: 'cos(A ± B) = cos A·cos B ∓ sin A·sin B' },
  { group: 'trig', name: '正弦二倍角', expr: 'sin 2A = 2 sin A·cos A' },
  { group: 'trig', name: '余弦二倍角', expr: 'cos 2A = cos²A − sin²A = 2cos²A − 1' },
  { group: 'trig', name: '特殊角', expr: 'sin30° = 1/2，sin45° = √2/2，sin60° = √3/2' },

  // 数列
  { group: 'sequence', name: '等差数列通项', expr: 'aₙ = a₁ + (n − 1)d' },
  { group: 'sequence', name: '等差数列求和', expr: 'Sₙ = n(a₁ + aₙ)/2 = n·a₁ + n(n−1)d/2' },
  { group: 'sequence', name: '等比数列通项', expr: 'aₙ = a₁·q^(n−1)' },
  { group: 'sequence', name: '等比数列求和', expr: 'Sₙ = a₁(1 − qⁿ)/(1 − q)（q ≠ 1）' },
  { group: 'sequence', name: '前 n 个正整数和', expr: '1 + 2 + … + n = n(n+1)/2' },
  { group: 'sequence', name: '平方和', expr: '1² + 2² + … + n² = n(n+1)(2n+1)/6' },
  { group: 'sequence', name: '立方和', expr: '1³ + 2³ + … + n³ = [n(n+1)/2]²' },

  // 概率统计
  { group: 'prob', name: '平均数', expr: 'x̄ = (x₁ + x₂ + … + xₙ) / n' },
  { group: 'prob', name: '方差', expr: 's² = Σ(xᵢ − x̄)² / n' },
  { group: 'prob', name: '标准差', expr: 's = √s²' },
  { group: 'prob', name: '排列数', expr: 'A(n, m) = n! / (n − m)!' },
  { group: 'prob', name: '组合数', expr: 'C(n, m) = n! / (m!·(n − m)!)' },
  { group: 'prob', name: '古典概型', expr: 'P(A) = 事件 A 包含的基本事件数 / 总数' },
  { group: 'prob', name: '数学期望', expr: 'E(X) = Σ xᵢ·pᵢ' },
  { group: 'prob', name: '互斥事件加法', expr: 'P(A ∪ B) = P(A) + P(B)' },

  // 微积分
  { group: 'calculus', name: '导数定义', expr: 'f′(x) = lim(Δx→0) [f(x+Δx) − f(x)] / Δx' },
  { group: 'calculus', name: '幂函数导数', expr: '(xⁿ)′ = n·x^(n−1)' },
  { group: 'calculus', name: '常见导数', expr: '(sin x)′ = cos x，(cos x)′ = −sin x，(eˣ)′ = eˣ，(ln x)′ = 1/x' },
  { group: 'calculus', name: '乘积求导', expr: '(uv)′ = u′v + uv′' },
  { group: 'calculus', name: '商的求导', expr: '(u/v)′ = (u′v − uv′) / v²' },
  { group: 'calculus', name: '幂函数积分', expr: '∫ xⁿ dx = x^(n+1)/(n+1) + C（n ≠ −1）' },
  { group: 'calculus', name: '牛顿—莱布尼茨公式', expr: '∫[a,b] f(x) dx = F(b) − F(a)' },

  // 常用常数
  { group: 'constant', name: '圆周率', expr: 'π ≈ 3.14159265' },
  { group: 'constant', name: '自然常数', expr: 'e ≈ 2.71828183' },
  { group: 'constant', name: '根号 2 / 3', expr: '√2 ≈ 1.41421356，√3 ≈ 1.73205081' },
  { group: 'constant', name: '角度与弧度', expr: '180° = π rad，1 rad ≈ 57.2958°' },
  { group: 'constant', name: '黄金比例', expr: 'φ ≈ 0.61803399' }
]

export function getGroupName(id: string): string {
  return FORMULA_GROUPS.find((group) => group.id === id)?.name || ''
}

/** 按分类与关键词筛选，匹配名称、公式、备注与分类名 */
export function searchFormulas(query: string, groupId: string): FormulaItem[] {
  const keyword = query.trim().toLowerCase()
  return FORMULAS.filter((item) => {
    if (groupId && groupId !== 'all' && item.group !== groupId) return false
    if (!keyword) return true
    const haystack = [item.name, item.expr, item.note || '', getGroupName(item.group)].join(' ').toLowerCase()
    return haystack.includes(keyword)
  })
}

export function countByGroup(groupId: string): number {
  if (groupId === 'all') return FORMULAS.length
  return FORMULAS.filter((item) => item.group === groupId).length
}
