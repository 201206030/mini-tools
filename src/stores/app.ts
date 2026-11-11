import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as storage from '@/services/storage'
import type { Prefs } from '@/types/common'
import type { RecentItem, ToolMeta } from '@/types/tool'
import { getTool, getToolsByIds } from '@/data/tools'

/**
 * 全局轻量状态：收藏、最近使用、偏好。
 * 所有持久化都通过统一的 storage 服务，且不记录任何用户输入内容。
 */
export const useAppStore = defineStore('app', () => {
  const favorites = ref<string[]>([])
  const recent = ref<RecentItem[]>([])
  const prefs = ref<Prefs>({})

  function hydrate(): void {
    favorites.value = storage.readFavorites().filter((id) => Boolean(getTool(id)))
    recent.value = storage.readRecent().filter((item) => Boolean(getTool(item.id)))
    prefs.value = storage.readPrefs()
  }

  hydrate()

  const favoriteTools = computed<ToolMeta[]>(() => getToolsByIds(favorites.value))
  const recentTools = computed<ToolMeta[]>(() => getToolsByIds(recent.value.map((item) => item.id)))

  function isFavorite(id: string): boolean {
    return favorites.value.indexOf(id) !== -1
  }

  function toggleFavorite(id: string): boolean {
    if (!getTool(id)) return false
    const index = favorites.value.indexOf(id)
    if (index === -1) {
      favorites.value = [id, ...favorites.value]
    } else {
      favorites.value = favorites.value.filter((item) => item !== id)
    }
    storage.writeFavorites(favorites.value)
    return index === -1
  }

  function removeFavorite(id: string): void {
    favorites.value = favorites.value.filter((item) => item !== id)
    storage.writeFavorites(favorites.value)
  }

  /** 只记录工具 ID 与时间，最多 10 条，重复使用时更新排序 */
  function recordRecent(id: string): void {
    if (!getTool(id)) return
    const next = recent.value.filter((item) => item.id !== id)
    next.unshift({ id, time: Date.now() })
    recent.value = next.slice(0, storage.MAX_RECENT)
    storage.writeRecent(recent.value)
  }

  function clearRecent(): void {
    recent.value = []
    storage.writeRecent([])
  }

  function setPref(key: string, value: string | number | boolean): void {
    prefs.value = { ...prefs.value, [key]: value }
    storage.writePrefs(prefs.value)
  }

  function getPref<T extends string | number | boolean>(key: string, fallback: T): T {
    const value = prefs.value[key]
    return (typeof value === typeof fallback ? value : fallback) as T
  }

  function clearAllData(): void {
    storage.clearAll()
    favorites.value = []
    recent.value = []
    prefs.value = {}
  }

  return {
    favorites,
    recent,
    prefs,
    favoriteTools,
    recentTools,
    hydrate,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    recordRecent,
    clearRecent,
    setPref,
    getPref,
    clearAllData
  }
})
