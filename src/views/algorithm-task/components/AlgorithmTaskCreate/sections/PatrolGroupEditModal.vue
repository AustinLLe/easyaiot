<template>
  <Modal
    v-model:open="visible"
    :title="isEdit ? '编辑轮巡组' : '新增轮巡组'"
    :width="760"
    :destroy-on-close="false"
    :body-style="{ padding: '20px 24px' }"
    @cancel="handleCancel"
  >
    <Form layout="vertical" class="patrol-group-form">
      <FormItem label="名称" required html-for="patrol-group-name">
        <Input
          id="patrol-group-name" aria-label="名称"
          v-model:value="formState.group_name"
          :maxlength="100"
          show-count
          placeholder="请输入轮巡组名称"
        />
      </FormItem>

      <FormItem label="选择摄像头" required>
        <CameraPickerPanel
          ref="pickerRef"
          embedded
          embedded-horizontal
          hide-footer
          :open="visible"
          :initial-selected-ids="formState.device_ids"
          :restrict-to-device-ids="allowedDeviceIds"
          :locked-device-ids="lockedDeviceIds"
        />
      </FormItem>

      <FormItem label="分析时长" required html-for="patrol-group-duration">
        <div class="duration-row">
          <InputNumber
            id="patrol-group-duration" aria-label="分析时长"
            v-model:value="formState.analysis_duration_sec"
            :min="1"
            :max="3600"
            :precision="0"
            placeholder="请输入"
            class="duration-input"
          />
          <span class="duration-unit">秒</span>
        </div>
      </FormItem>
    </Form>

    <template #footer>
      <a-button html-type="button" @click="handleCancel">取消</a-button>
      <a-button type="primary" html-type="button" @click="handleSave">保存</a-button>
    </template>
  </Modal>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';
import { Form, FormItem, Input, InputNumber, Modal } from 'ant-design-vue';
import type { DeviceInfo } from '@/api/device/camera';
import CameraPickerPanel from '../../TaskFormWidgets/CameraPickerPanel.vue';
import type { PatrolGroupDraft } from '../../../algorithmTaskDraft.types';
import { createEmptyPatrolGroupDraft } from '../../../utils/patrolUtils';
import { useMessage } from '@/hooks/web/useMessage';
import { normalizeDeviceId } from '../../../utils/taskUtils';

defineOptions({ name: 'PatrolGroupEditModal' });

const props = defineProps<{
  allowedDeviceIds: string[];
  lockedDeviceIds?: string[];
}>();

const emit = defineEmits<{
  save: [group: PatrolGroupDraft];
}>();

const visible = defineModel<boolean>('open', { default: false });
const editingGroup = defineModel<PatrolGroupDraft | null>('group', { default: null });

const { createMessage } = useMessage();
const pickerRef = ref<InstanceType<typeof CameraPickerPanel> | null>(null);

const formState = reactive({
  group_id: '',
  group_name: '',
  device_ids: [] as string[],
  analysis_duration_sec: undefined as number | undefined,
});

const isEdit = computed(() => Boolean(editingGroup.value?.group_id && editingGroup.value.group_name));

const lockedDeviceIds = computed(() => props.lockedDeviceIds ?? []);

function resetForm(source?: PatrolGroupDraft | null) {
  const draft = source ?? createEmptyPatrolGroupDraft();
  formState.group_id = draft.group_id;
  formState.group_name = draft.group_name ?? '';
  formState.device_ids = [...(draft.device_ids ?? [])];
  formState.analysis_duration_sec = draft.analysis_duration_sec;
}

watch(visible, (open) => {
  if (open)
    resetForm(editingGroup.value);
});

function handleCancel() {
  visible.value = false;
  editingGroup.value = null;
}

function handleSave() {
  const name = formState.group_name.trim();
  if (!name) {
    createMessage.warning('请填写轮巡组名称');
    return;
  }

  const selectedDevices: DeviceInfo[] = pickerRef.value?.getSelectedDevices?.() ?? [];
  const deviceIds = selectedDevices.map(device => normalizeDeviceId(device.id)).filter(Boolean);
  if (!deviceIds.length) {
    createMessage.warning('请至少选择一个摄像头');
    return;
  }

  if (formState.analysis_duration_sec == null || formState.analysis_duration_sec < 1) {
    createMessage.warning('请填写分析时长');
    return;
  }

  emit('save', {
    group_id: formState.group_id || `patrol_group_${Date.now()}`,
    group_name: name,
    device_ids: deviceIds,
    analysis_duration_sec: formState.analysis_duration_sec,
  });
  visible.value = false;
  editingGroup.value = null;
}
</script>

<style lang="less" scoped>
.patrol-group-form {
  :deep(.camera-picker-panel.embedded.embeddedHorizontal) {
    width: 100%;
    min-height: 320px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;

    .camera-toolbar {
      padding: 12px 16px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
    }

    .group-panel {
      padding: 8px 4px;
    }

    .group-item {
      padding-right: 8px;
    }

    .device-panel {
      padding: 12px 16px;
    }
  }
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duration-input {
  width: 160px;
}

.duration-unit {
  color: rgba(0, 0, 0, 0.65);
}
</style>
