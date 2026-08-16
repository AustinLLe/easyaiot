<template>
  <div class="class-whitelist-select">
    <label for="class-whitelist-select" class="sr-only">参与检测类别</label>
    <Select
      id="class-whitelist-select"
      v-model:value="modelValue"
      mode="multiple"
      placeholder="选择参与检测类别（不选=保留全部输出）"
      style="width: 100%"
      :allow-clear="!disabled"
      :disabled="disabled"
      :max-tag-count="4"
      :options="classOptions"
      option-filter-prop="label"
      :get-popup-container="getPopupContainer"
      :dropdown-style="{ zIndex: 4100 }"
    />
    <div class="class-hint">下拉多选，支持勾选多个检测类别；不选任何类别 = 保留模型全部输出</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { Select } from 'ant-design-vue';

defineOptions({ name: 'ClassWhitelistSelect' });

const modelValue = defineModel<string[]>('value', { default: () => [] });
const props = defineProps<{
  options?: Array<{ label: string; value: string }>;
  disabled?: boolean;
}>();

const classOptions = computed(() =>
  props.options ?? [],
);

function getPopupContainer() {
  return document.body;
}
</script>

<style lang="less" scoped>
.class-whitelist-select {
  :deep(.ant-select) {
    width: 100%;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.class-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}
</style>
