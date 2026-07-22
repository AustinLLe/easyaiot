<template>
  <div class="class-whitelist-select">
    <Select
      v-model:value="modelValue"
      mode="multiple"
      placeholder="选择参与检测类别（不选=保留全部输出）"
      style="width: 100%"
      allow-clear
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
import { MOCK_RECOGNIZABLE_CLASSES } from '../../utils/paramUtils';

defineOptions({ name: 'ClassWhitelistSelect' });

const modelValue = defineModel<string[]>('value', { default: () => [] });

const classOptions = computed(() =>
  MOCK_RECOGNIZABLE_CLASSES.map(cls => ({ label: cls, value: cls })),
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

.class-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}
</style>
