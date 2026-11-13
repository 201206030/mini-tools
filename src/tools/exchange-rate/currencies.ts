/**
 * 汇率计算器支持的币种静态表。
 *
 * 数据来源说明：
 * - Frankfurter（欧洲央行参考汇率）官方 /v1/currencies 实际支持 30 种，已全部收录；
 * - 其中不含 TWD、RUB，这两个币种由 ExchangeRate-API 开放端点补充；
 * - 不要在此写死任何汇率数值，汇率一律来自网络获取后的本地缓存。
 */

export interface Currency {
  code: string
  nameCn: string
  nameEn: string
  symbol: string
  /** 结果展示时保留的小数位 */
  digits: number
  /** 汇率来源标记，仅用于说明，不参与计算 */
  via: 'frankfurter' | 'supplement'
}

const F = 'frankfurter' as const
const S = 'supplement' as const

/** 按币种代码字母序排列，方便与 API 返回的 rates 对齐 */
export const CURRENCIES: Currency[] = [
  { code: 'AUD', nameCn: '澳大利亚元', nameEn: 'Australian Dollar', symbol: 'A$', digits: 2, via: F },
  { code: 'BRL', nameCn: '巴西雷亚尔', nameEn: 'Brazilian Real', symbol: 'R$', digits: 2, via: F },
  { code: 'CAD', nameCn: '加拿大元', nameEn: 'Canadian Dollar', symbol: 'C$', digits: 2, via: F },
  { code: 'CHF', nameCn: '瑞士法郎', nameEn: 'Swiss Franc', symbol: 'Fr', digits: 2, via: F },
  { code: 'CNY', nameCn: '人民币', nameEn: 'Chinese Renminbi Yuan', symbol: '¥', digits: 2, via: F },
  { code: 'CZK', nameCn: '捷克克朗', nameEn: 'Czech Koruna', symbol: 'Kč', digits: 2, via: F },
  { code: 'DKK', nameCn: '丹麦克朗', nameEn: 'Danish Krone', symbol: 'kr', digits: 2, via: F },
  { code: 'EUR', nameCn: '欧元', nameEn: 'Euro', symbol: '€', digits: 2, via: F },
  { code: 'GBP', nameCn: '英镑', nameEn: 'British Pound', symbol: '£', digits: 2, via: F },
  { code: 'HKD', nameCn: '港币', nameEn: 'Hong Kong Dollar', symbol: 'HK$', digits: 2, via: F },
  { code: 'HUF', nameCn: '匈牙利福林', nameEn: 'Hungarian Forint', symbol: 'Ft', digits: 2, via: F },
  { code: 'IDR', nameCn: '印尼盾', nameEn: 'Indonesian Rupiah', symbol: 'Rp', digits: 0, via: F },
  { code: 'ILS', nameCn: '以色列新谢克尔', nameEn: 'Israeli New Shekel', symbol: '₪', digits: 2, via: F },
  { code: 'INR', nameCn: '印度卢比', nameEn: 'Indian Rupee', symbol: '₹', digits: 2, via: F },
  { code: 'ISK', nameCn: '冰岛克朗', nameEn: 'Icelandic Króna', symbol: 'kr', digits: 2, via: F },
  { code: 'JPY', nameCn: '日元', nameEn: 'Japanese Yen', symbol: '¥', digits: 0, via: F },
  { code: 'KRW', nameCn: '韩元', nameEn: 'South Korean Won', symbol: '₩', digits: 0, via: F },
  { code: 'MXN', nameCn: '墨西哥比索', nameEn: 'Mexican Peso', symbol: '$', digits: 2, via: F },
  { code: 'MYR', nameCn: '马来西亚林吉特', nameEn: 'Malaysian Ringgit', symbol: 'RM', digits: 2, via: F },
  { code: 'NOK', nameCn: '挪威克朗', nameEn: 'Norwegian Krone', symbol: 'kr', digits: 2, via: F },
  { code: 'NZD', nameCn: '新西兰元', nameEn: 'New Zealand Dollar', symbol: 'NZ$', digits: 2, via: F },
  { code: 'PHP', nameCn: '菲律宾比索', nameEn: 'Philippine Peso', symbol: '₱', digits: 2, via: F },
  { code: 'PLN', nameCn: '波兰兹罗提', nameEn: 'Polish Złoty', symbol: 'zł', digits: 2, via: F },
  { code: 'RON', nameCn: '罗马尼亚列伊', nameEn: 'Romanian Leu', symbol: 'lei', digits: 2, via: F },
  { code: 'RUB', nameCn: '俄罗斯卢布', nameEn: 'Russian Ruble', symbol: '₽', digits: 2, via: S },
  { code: 'SEK', nameCn: '瑞典克朗', nameEn: 'Swedish Krona', symbol: 'kr', digits: 2, via: F },
  { code: 'SGD', nameCn: '新加坡元', nameEn: 'Singapore Dollar', symbol: 'S$', digits: 2, via: F },
  { code: 'THB', nameCn: '泰铢', nameEn: 'Thai Baht', symbol: '฿', digits: 2, via: F },
  { code: 'TRY', nameCn: '土耳其里拉', nameEn: 'Turkish Lira', symbol: '₺', digits: 2, via: F },
  { code: 'TWD', nameCn: '新台币', nameEn: 'New Taiwan Dollar', symbol: 'NT$', digits: 2, via: S },
  { code: 'USD', nameCn: '美元', nameEn: 'United States Dollar', symbol: '$', digits: 2, via: F },
  { code: 'ZAR', nameCn: '南非兰特', nameEn: 'South African Rand', symbol: 'R', digits: 2, via: F }
]

const CURRENCY_MAP = new Map<string, Currency>(CURRENCIES.map((item) => [item.code, item]))

export function getCurrency(code: string): Currency | undefined {
  return CURRENCY_MAP.get(code)
}

/** 常用币种置顶，方便普通用户快速选择 */
export const POPULAR_CODES: string[] = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'KRW', 'TWD', 'SGD', 'AUD']

/** Frankfurter 未覆盖、需要由补充源提供的币种 */
export const SUPPLEMENT_CODES: string[] = CURRENCIES.filter((item) => item.via === 'supplement').map((item) => item.code)

export const SOURCE_PRIMARY = 'Frankfurter（欧洲央行参考汇率）'
export const SOURCE_SUPPLEMENT = 'ExchangeRate-API 开放端点（补充 TWD / RUB）'

export const PRIMARY_API = 'https://api.frankfurter.dev/v1/latest?base=USD'
export const SUPPLEMENT_API = 'https://open.er-api.com/v6/latest/USD'
