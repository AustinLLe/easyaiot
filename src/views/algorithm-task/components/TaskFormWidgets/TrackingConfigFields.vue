<template>
  <div class="tracking-config-fields">
    <FormItem label="启用目标追踪">
      <Switch
        v-model:checked="config.enable_tracking"
        checked-children="�?
        un-checked-children="�?
      />
    </FormItem>

    <template v-if="config.enable_tracking">
      <FormItem label="追踪相似度阈�?>
        <InputNumber
          v-model:value="config.tracking_similarity_threshold"
          placeholder="0.2"
          :min="0"
          :max="1"
          :step="0.1"
          class="field-control"
        />
      </FormItem>

      <FormItem label="追踪最大存活帧�?>
        <InputNumber
          v-model:value="config.tracking_max_age"
          placeholder="25"
          :min="1"
          class="field-control"
        />
      </FormItem>

      <FormItem label="追踪平滑系数">
        <InputNumber
          v-model:value="config.tracking_smooth_alpha"
          placeholder="0.25"
          :min="0"
          :max="1"
          :step="0.05"
          class="field-control"
        />
      </FormItem>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { watch } from 'vue';
import { FormItem, InputNumber, Switch } from 'ant-design-vue';
import type { DetectionConfigDraft } from '../../algorithmTaskDraft.types';
import {
  clearTrackingParams,
  ensureTrackingDefaults,
} from '../../utils/taskUtils';

defineOptions({ name: 'TrackingConfigFields' });

const config = defineModel<DetectionConfigDraft>('config', { required: true });

watch(
  () => config.value.enable_tracking,
  (enabled) => {
    if (enabled)
      ensureTrackingDefaults(config.value);
    else
      clearTrackingParams(config.value);
  },
);
</script>

<style lang="less" scoped>
.field-control {
  width: 100%;
  max-width: 360px;
}
</style>
