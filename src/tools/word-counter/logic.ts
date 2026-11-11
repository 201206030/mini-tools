import { analyzeText, type TextStats } from '@/utils/text'

/** 文本统计，直接复用通用的 analyzeText（已处理中文、英文、数字、标点与组合 Emoji） */
export function countText(text: string): TextStats {
  return analyzeText(text)
}

/** 把统计结果整理成便于复制的中文汇总 */
export function buildSummary(stats: TextStats): string {
  return [
    `总字符数：${stats.characters}`,
    `汉字数量：${stats.chinese}`,
    `英文单词数量：${stats.englishWords}`,
    `数字数量：${stats.digits}`,
    `标点符号数量：${stats.punctuation}`,
    `行数：${stats.lines}`,
    `段落数量：${stats.paragraphs}`,
    `不含空格的字符数：${stats.noSpaces}`
  ].join('\n')
}
