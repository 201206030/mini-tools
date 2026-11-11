<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label: string
    hint?: string
    disabled?: boolean
  }>(),
  { hint: '', disabled: false }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function toggle() {
  if (!props.disabled) emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <view class="switch-row" @click="toggle">
    <view>
      <view class="switch-row__label">{{ label }}</view>
      <view v-if="hint" class="switch-row__hint">{{ hint }}</view>
    </view>
    <view class="switch-box" :class="{ 'switch-box--on': modelValue && !disabled, 'btn--disabled': disabled }">
      <view class="switch-dot"></view>
    </view>
  </view>
</template>
