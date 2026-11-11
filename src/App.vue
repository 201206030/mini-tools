<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'

onLaunch(() => {
  // 冷启动时恢复本地偏好；存储不可用时保持内存态，不影响使用
  try {
    useAppStore().hydrate()
  } catch {
    // 忽略：存储服务内部已做降级处理
  }
})
</script>

<style lang="scss">
@import '@/styles/common.scss';
</style>
