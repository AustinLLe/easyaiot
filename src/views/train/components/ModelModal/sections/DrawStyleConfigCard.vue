<template>
  <div class="style-config-card">
    <div class="card-header">
      <span class="card-title">{{ title }}</span>
      <Switch v-model:checked="config.enabled" size="small" :disabled="disabled" />
    </div>

    <div v-if="showBorderWidth" class="card-row">
      <span class="row-label">边框粗细</span>
      <InputNumber
        v-model:value="config.border_width"
        :min="1"
        :max="8"
        :step="1"
        size="small"
        class="row-input"
        :disabled="disabled || !config.enabled"
      />
    </div>

    <div class="card-row">
      <span class="row-label">颜色</span>
      <Popover
        v-model:open="colorOpen"
        trigger="click"
        placement="bottom"
        :overlay-style="{ padding: 0 }"
      >
        <template #content>
          <ColorPicker
            :init-color="config.color"
            @change-color="handleColorConfirm"
          />
        </template>
        <button
          type="button"
          class="color-swatch"
          :style="{ background: config.color }"
          :disabled="disabled || !config.enabled"
        />
      </Popover>
    </div>

    <div v-if="showBgColor" class="card-row">
      <span class="row-label">背景颜色</span>
      <Popover
        v-model:open="bgColorOpen"
        trigger="click"
        placement="bottom"
        :overlay-style="{ padding: 0 }"
      >
        <template #content>
          <ColorPicker
            :init-color="config.bg_color || '#ff0000'"
            @change-color="handleBgColorConfirm"
          />
        </template>
        <button
          type="button"
          class="color-swatch"
          :style="{ background: config.bg_color || '#ff0000' }"
          :disabled="disabled || !config.enabled"
        />
      </Popover>
    </div>

    <div v-if="showLimbTypes" class="card-row limb-row">
      <span class="row-label">肢体类型</span>
      <CheckboxGroup
        v-model:value="limbTypesModel"
        class="limb-checkbox-group"
        :disabled="disabled || !config.enabled"
      >
        <Checkbox
          v-for="item in limbOptions"
          :key="item"
          :value="item"
        >
          {{ item }}
        </Checkbox>
      </CheckboxGroup>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Checkbox, CheckboxGroup, InputNumber, Popover, Switch } from 'ant-design-vue';
import ColorPicker from '@/components/ColorPicker/ColorPicker.vue';
import type { DrawStyleCardConfig } from '../../../modelDraft.types';
import { LIMB_TYPE_OPTIONS } from '../../../modelDraft.types';

defineOptions({ name: 'DrawStyleConfigCard' });

const props = defineProps<{
  title: string;
  disabled?: boolean;
  showBorderWidth?: boolean;
  showBgColor?: boolean;
  showLimbTypes?: boolean;
}>();

const config = defineModel<DrawStyleCardConfig>('config', { required: true });

const colorOpen = ref(false);
const bgColorOpen = ref(false);
const limbOptions = LIMB_TYPE_OPTIONS;

const limbTypesModel = computed({
  get: () => config.value.limb_types ?? [...LIMB_TYPE_OPTIONS],
  set: (value: string[]) => {
    config.value.limb_types = value;
  },
});

function handleColorConfirm(color: string) {
  config.value.color = color;
  colorOpen.value = false;
}

function handleBgColorConfirm(color: string) {
  config.value.bg_color = color;
  bgColorOpen.value = false;
}
</script>

<style lang="less" scoped>
.style-config-card {
  padding: 12px 14px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;

  &.limb-row {
    align-items: flex-start;
  }
}

.row-label {
  flex-shrink: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.row-input {
  width: 88px !important;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.limb-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}
</style>
