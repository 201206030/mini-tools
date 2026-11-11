<script setup lang="ts">
import type { SelectOption } from '@/types/common'

defineProps<{
  modelValue: string | number
  options: Array<SelectOption<string | number>>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()
</script>

<template>
  <view class="segmented">
    <view
      v-for="option in options"
      :key="String(option.value)"
      class="segmented__item"
      :class="{ 'segmented__item--active': modelValue === option.value }"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </view>
  </view>
</template>
