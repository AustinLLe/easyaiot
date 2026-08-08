<template>
  <BasicModal
    @register="register"
    :title="modalTitle"
    :width="1400"
    :canFullscreen="true"
    :showCancelBtn="false"
    :showOkBtn="false"
    @ok="handleSubmit"
  >
    <template #footer>
      <div class="footer-buttons">
        <a-button v-if="!isViewMode" @click="handleReset" class="mr-2">重置</a-button>
        <a-button v-if="!isViewMode" type="primary" :loading="confirmLoading" @click="handleSubmit">提交</a-button>
      </div>
    </template>
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="basic" tab="基础配置">
        <div class="basic-config-content">
          <BasicForm @register="registerForm" @field-value-change="handleFieldValueChange" />
          <div class="defense-schedule-wrapper">
            <DefenseSchedulePicker v-model:modelValue="defenseSchedule" :disabled="isViewMode" />
          </div>
        </div>
      </a-tab-pane>
      <a-tab-pane key="status" tab="服务状态" :disabled="!taskId">
        <ServiceStatusTab v-if="taskId && formValues" :task="formValues" />
        <a-empty v-else description="请先保存基础配置" />
      </a-tab-pane>
    </a-tabs>
  </BasicModal>
</template>

<script lang="ts" setup>
import { ref, computed, h } from 'vue';
import { BasicModal, useModalInner } from '@/components/Modal';
import { BasicForm, useForm } from '@/components/Form';
import { useMessage } from '@/hooks/web/useMessage';
import { QuestionCircleOutlined } from '@ant-design/icons-vue';
import { Switch, Popover, Button } from 'ant-design-vue';
import {
  createAlgorithmTask,
  updateAlgorithmTask,
  type AlgorithmTask,
} from '@/api/device/algorithm_task';
import { getDeviceList } from '@/api/device/camera';
import { getModelPage } from '@/api/device/model';
import DefenseSchedulePicker from '../TaskFormWidgets/DefenseSchedulePicker.vue';
import ServiceStatusTab from '../ServiceManage/ServiceStatusTab.vue';
import {
  buildDefenseScheduleValue,
  createDefaultDefensePickerValue,
  createFullDefenseSchedule,
  getCurrentWeekRange,
  isFullDefenseSchedule,
  type DefenseSchedulePickerValue,
} from '../../utils/taskUtils';

defineOptions({ name: 'AlgorithmTaskModal', inheritAttrs: false });

const { createMessage } = useMessage();
const emit = defineEmits(['success']);

const activeTab = ref('basic');
const taskId = ref<number | null>(null);
const formValues = ref<any>({});
const confirmLoading = ref(false);
const defenseSchedule = ref<DefenseSchedulePickerValue>(createDefaultDefensePickerValue());

function toDefensePickerValue(
  defenseMode?: string,
  defenseScheduleRaw?: string | number[][],
): DefenseSchedulePickerValue {
  const built = buildDefenseScheduleValue(defenseMode, defenseScheduleRaw);
  const [start, end] = getCurrentWeekRange();
  return {
    is_full_day_defense: built.mode === 'full',
    mode: built.mode,
    schedule: built.schedule,
    defense_week_start: start.format('YYYY-MM-DD'),
    defense_week_end: end.format('YYYY-MM-DD'),
    defense_week_schedules: [],
  };
}

const deviceOptions = ref<Array<{ label: string; value: string }>>([]);
const modelOptions = ref<Array<{ label: string; value: number }>>([]);
const modelMap = ref<Map<number, any>>(new Map()); // 存储完整的模型信息

// 占位符列表（包含占位符和说明）
const placeholders = [
  { placeholder: '${object}', description: '检测对象' },
  { placeholder: '${event}', description: '事件类型' },
  { placeholder: '${region}', description: '区域信息' },
  { placeholder: '${information}', description: '详细信息' },
  { placeholder: '${device_id}', description: '设备ID' },
  { placeholder: '${device_name}', description: '设备名称' },
  { placeholder: '${time}', description: '时间' },
  { placeholder: '${image_path}', description: '图片路径' },
  { placeholder: '${record_path}', description: '录像路径' },
];

// 加载设备列表
const loadDevices = async () => {
  try {
    // 加载设备列表（推流转发任务和算法任务可以共存，不再检查冲突）
    const deviceResponse = await getDeviceList({ pageNo: 1, pageSize: 1000 });

    deviceOptions.value = (deviceResponse.data || []).map((item) => {
      return {
        label: item.name || item.id,
        value: item.id,
        disabled: false,
      };
    });

    // 更新表单schema，设置禁用选项
    updateSchema({
      field: 'device_ids',
      componentProps: {
        options: deviceOptions.value,
      },
    });
  } catch (error) {
    console.error('加载设备列表失败', error);
  }
};



const initDefaultModels = () => {
  modelMap.value.clear();
};

// 加载模型列表（用于选择模型）
const loadModels = async () => {
  initDefaultModels();

  try {
    const response = await getModelPage({ pageNo: 1, pageSize: 1000 });
    // 处理响应数据：可能是转换后的数组，也可能是包含 code/data 的对象
    let allModels: any[] = [];
    if (Array.isArray(response)) {
      allModels = response;
    } else if (response && response.code === 0 && response.data) {
      allModels = Array.isArray(response.data) ? response.data : [];
    } else if (response && response.data && Array.isArray(response.data)) {
      allModels = response.data;
    }

    // 构建选项列表和完整模型信息映射
    const dbModelOptions = allModels.map((item: any) => {
      // 保存完整的模型信息
      modelMap.value.set(item.id, item);

      return {
        label: `${item.name}${item.version ? ` (v${item.version})` : ''}`,
        value: item.id, // 模型ID
      };
    });

    modelOptions.value = dbModelOptions;
    updateModelSchemaOptions();
  } catch (error) {
    console.error('加载模型列表失败', error);
    modelOptions.value = [];
    updateModelSchemaOptions();
  }
};

const [registerForm, { setFieldsValue, validate, resetFields, updateSchema, getFieldsValue }] = useForm({
  transformDateToString: false,
  labelWidth: 150,
  baseColProps: { span: 24 },
  schemas: [
    {
      field: 'task_name',
      label: '任务名称',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '请输入任务名称',
      },
    },
    {
      field: 'task_type',
      label: '任务类型',
      component: 'Select',
      required: true,
      componentProps: {
        placeholder: '请选择任务类型',
        options: [
          { label: '实时算法任务', value: 'realtime' },
          { label: '抓拍算法任务', value: 'snap' },
          { label: '轮巡算法任务', value: 'patrol' },
        ],
      },
    },
    {
      field: 'device_ids',
      label: '关联摄像头',
      component: 'Select',
      required: true,
      componentProps: {
        placeholder: '请选择摄像头（可多选）',
        options: deviceOptions,
        mode: 'multiple',
        showSearch: true,
        allowClear: true,
        filterOption: (input: string, option: any) => {
          return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
        },
      },
    },
    {
      field: 'model_ids',
      label: '关联模型',
      component: 'Select',
      required: true,
      componentProps: {
        placeholder: '请选择模型（可多选）',
        options: modelOptions,
        mode: 'multiple',
        showSearch: true,
        allowClear: true,
        filterOption: (input: string, option: any) => {
          return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
        },
      },
      helpMessage: '选择要使用的模型列表，模型文件本地没有会自动下载',
      ifShow: ({ values }) => ['realtime', 'snap', 'patrol'].includes(values.task_type),
    },
    {
      field: 'cron_expression',
      label: 'Cron表达式',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '例如: 0 */5 * * * * (每5分钟)',
      },
      helpMessage: '标准Cron表达式，例如: 0 */5 * * * * 表示每5分钟执行一次',
      ifShow: ({ values }) => values.task_type === 'snap',
    },
    {
      field: 'frame_skip',
      label: '抽帧间隔',
      component: 'InputNumber',
      componentProps: {
        placeholder: '每N帧抓一次',
        min: 1,
      },
      helpMessage: '抽帧模式下，每N帧抓一次（默认25）',
      ifShow: ({ values }) => values.task_type === 'snap',
    },
    {
      field: 'extract_interval',
      label: '抽帧间隔',
      component: 'InputNumber',
      componentProps: {
        placeholder: '每N帧抽一次',
        min: 1,
      },
      helpMessage: '实时/轮巡算法任务中，每N帧抽一次进行检测（默认25）',
      ifShow: ({ values }) =>
        values.task_type === 'patrol'
        || (values.task_type === 'realtime' && !values.tracking_enabled),
    },
    {
      field: 'tracking_enabled',
      label: '启用目标追踪',
      component: 'Switch',
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
      ifShow: ({ values }) => values.task_type === 'realtime',
    },
    {
      field: 'tracking_similarity_threshold',
      label: '追踪相似度阈值',
      component: 'InputNumber',
      componentProps: {
        placeholder: '0.2',
        min: 0,
        max: 1,
        step: 0.1,
      },
      ifShow: ({ values }) => values.task_type === 'realtime' && values.tracking_enabled,
    },
    {
      field: 'tracking_max_age',
      label: '追踪最大存活帧数',
      component: 'InputNumber',
      componentProps: {
        placeholder: '25',
        min: 1,
      },
      ifShow: ({ values }) => values.task_type === 'realtime' && values.tracking_enabled,
    },
    {
      field: 'tracking_smooth_alpha',
      label: '追踪平滑系数',
      component: 'InputNumber',
      componentProps: {
        placeholder: '0.25',
        min: 0,
        max: 1,
        step: 0.05,
      },
      ifShow: ({ values }) => values.task_type === 'realtime' && values.tracking_enabled,
    },
    {
      field: 'alert_event_enabled',
      label: '启用告警事件',
      component: 'Input',
      render: ({ model }) => {
        return h('div', { class: 'alert-event-enabled-wrapper' }, [
          h(Switch, {
            checked: model.alert_event_enabled,
            checkedChildren: '是',
            unCheckedChildren: '否',
            disabled: isViewMode.value,
            onChange: async (checked: boolean) => {
              model.alert_event_enabled = checked;
              const currentValues = await getFieldsValue();
              formValues.value = { ...currentValues, alert_event_enabled: checked };
            },
          }),
          h(Popover, {
            title: '算法任务占位符',
            trigger: 'hover',
            placement: 'rightTop',
            getPopupContainer: (triggerNode) => triggerNode.parentElement || document.body,
          }, {
            content: () => h('div', { class: 'placeholder-box-small' },
              placeholders.map((item) =>
                h('div', { class: 'placeholder-item-small' }, [
                  h('span', { class: 'placeholder-text' }, item.placeholder),
                  h('span', { class: 'placeholder-separator' }, ': '),
                  h('span', { class: 'placeholder-desc' }, item.description),
                ])
              )
            ),
            default: () => h(Button, {
              type: 'text',
              size: 'small',
              class: 'placeholder-trigger-btn',
            }, {
              icon: () => h(QuestionCircleOutlined),
            }),
          }),
        ]);
      },
      helpMessage: '是否启用告警事件，启用后会记录告警信息',
      ifShow: ({ values }) => ['realtime', 'snap', 'patrol'].includes(values.task_type),
    },
  ],
  showActionButtonGroup: false,
});

const updateModelSchemaOptions = (disabled?: boolean) => {
  updateSchema({
    field: 'model_ids',
    componentProps: {
      options: modelOptions.value,
      ...(disabled !== undefined ? { disabled } : {}),
    },
  });
};

const modalData = ref<{ type?: string; record?: AlgorithmTask }>({});

const modalTitle = computed(() => {
  if (modalData.value.type === 'view') return '查看算法任务';
  if (modalData.value.type === 'edit') return '编辑算法任务';
  return '新建算法任务';
});

const isViewMode = computed(() => modalData.value.type === 'view');

const [register, { setModalProps, closeModal }] = useModalInner(async (data) => {
  modalData.value = data || {};
  taskId.value = null;
  confirmLoading.value = false;
  resetFields();

  // 确保默认模型已初始化（在加载前）
  initDefaultModels();

  // 加载选项数据
  await Promise.all([loadDevices(), loadModels()]);

  if (modalData.value.record) {
    const record = modalData.value.record;
    taskId.value = record.id;
    // 从 model_ids 中提取模型ID列表（用于回显）
    const modelIds: number[] = [];
    if (record.model_ids && Array.isArray(record.model_ids)) {
      modelIds.push(...record.model_ids);
    } else if (record.model_ids && typeof record.model_ids === 'string') {
      try {
        const parsed = JSON.parse(record.model_ids);
        if (Array.isArray(parsed)) {
          modelIds.push(...parsed);
        }
      } catch (e) {
        console.error('解析model_ids失败', e);
      }
    }

    defenseSchedule.value = toDefensePickerValue(
      record.defense_mode,
      record.defense_schedule,
    );

    await setFieldsValue({
      task_name: record.task_name,
      task_type: record.task_type || 'realtime',
      device_ids: record.device_ids || [],
      cron_expression: record.cron_expression,
      frame_skip: record.frame_skip || 25,
      model_ids: modelIds,
      extract_interval: record.extract_interval || 25,
      tracking_enabled: record.tracking_enabled || false,
      tracking_similarity_threshold: record.tracking_similarity_threshold || 0.2,
      tracking_max_age: record.tracking_max_age || 25,
      tracking_smooth_alpha: record.tracking_smooth_alpha || 0.25,
      alert_event_enabled: record.alert_event_enabled !== undefined ? record.alert_event_enabled : false,
    });

    formValues.value = { ...formValues.value, ...await getFieldsValue() };

    // 查看模式禁用表单和按钮
    if (modalData.value.type === 'view') {
      updateSchema([
        { field: 'task_name', componentProps: { disabled: true } },
        { field: 'task_type', componentProps: { disabled: true } },
        { field: 'device_ids', componentProps: { disabled: true } },
        { field: 'cron_expression', componentProps: { disabled: true } },
        { field: 'frame_skip', componentProps: { disabled: true } },
        { field: 'model_ids', componentProps: { disabled: true, options: modelOptions.value } },
        { field: 'extract_interval', componentProps: { disabled: true } },
        { field: 'tracking_enabled', componentProps: { disabled: true } },
        { field: 'tracking_similarity_threshold', componentProps: { disabled: true } },
        { field: 'tracking_max_age', componentProps: { disabled: true } },
        { field: 'tracking_smooth_alpha', componentProps: { disabled: true } },
        { field: 'alert_event_enabled', componentProps: { disabled: true } },
      ]);
      setModalProps({ showOkBtn: false });
    } else {
      // 编辑模式，确保所有字段可编辑
      updateSchema([
        { field: 'task_name', componentProps: { disabled: false } },
        { field: 'task_type', componentProps: { disabled: false } },
        { field: 'device_ids', componentProps: { disabled: false } },
        { field: 'cron_expression', componentProps: { disabled: false } },
        { field: 'frame_skip', componentProps: { disabled: false } },
        { field: 'model_ids', componentProps: { disabled: false, options: modelOptions.value } },
        { field: 'extract_interval', componentProps: { disabled: false } },
        { field: 'tracking_enabled', componentProps: { disabled: false } },
        { field: 'tracking_similarity_threshold', componentProps: { disabled: false } },
        { field: 'tracking_max_age', componentProps: { disabled: false } },
        { field: 'tracking_smooth_alpha', componentProps: { disabled: false } },
        { field: 'alert_event_enabled', componentProps: { disabled: false } },
      ]);
      setModalProps({ showOkBtn: true });
    }
  } else {
    // 新建模式，设置默认值，并确保所有字段可编辑
    // 先重置所有字段为可编辑状态，避免之前查看模式的disabled状态影响
    updateSchema([
      { field: 'task_name', componentProps: { disabled: false } },
      { field: 'task_type', componentProps: { disabled: false } },
      { field: 'device_ids', componentProps: { disabled: false } },
      { field: 'cron_expression', componentProps: { disabled: false } },
      { field: 'frame_skip', componentProps: { disabled: false } },
      { field: 'model_ids', componentProps: { disabled: false, options: modelOptions.value } },
      { field: 'extract_interval', componentProps: { disabled: false } },
      { field: 'tracking_enabled', componentProps: { disabled: false } },
      { field: 'tracking_similarity_threshold', componentProps: { disabled: false } },
      { field: 'tracking_max_age', componentProps: { disabled: false } },
      { field: 'tracking_smooth_alpha', componentProps: { disabled: false } },
      { field: 'alert_event_enabled', componentProps: { disabled: false } },
    ]);
    await setFieldsValue({
      task_type: 'realtime',
      frame_skip: 25,
      extract_interval: 25,
      tracking_enabled: false,
      tracking_similarity_threshold: 0.2,
      tracking_max_age: 25,
      tracking_smooth_alpha: 0.25,
      alert_event_enabled: false,
    });
    formValues.value = { ...formValues.value, ...await getFieldsValue() };
    defenseSchedule.value = createDefaultDefensePickerValue();
    setModalProps({ showOkBtn: true });
  }
});

// 处理表单字段值变化
const handleFieldValueChange = async (key: string, value: any) => {
  if (key === 'alert_event_enabled') {
    const currentValues = await getFieldsValue();
    formValues.value = { ...currentValues, alert_event_enabled: value };
  } else {
    // 其他字段变化时，也同步更新 formValues
    const currentValues = await getFieldsValue();
    formValues.value = { ...currentValues, [key]: value };
  }
};

const handleSubmit = async () => {
  try {
    const values = await validate();
    confirmLoading.value = true;
    setModalProps({ confirmLoading: true });

    // 新建任务时，默认设置为未启用状态（需要通过启动按钮来启动）
    if (modalData.value.type !== 'edit') {
      values.is_enabled = 0;
    }
    // 编辑任务时，不修改 is_enabled 状态（保持原值，通过启动/停止按钮控制）

    const pickerValue = defenseSchedule.value;
    if (!pickerValue.is_full_day_defense) {
      const savedWeeks = pickerValue.defense_week_schedules ?? [];
      if (!savedWeeks.length) {
        createMessage.error('请至少保存一个周的布防配置');
        confirmLoading.value = false;
        setModalProps({ confirmLoading: false });
        return;
      }
      const hasValidWeek = savedWeeks.some(entry =>
        entry.schedule.some(day => day.some(hour => hour === 1)),
      );
      if (!hasValidWeek) {
        createMessage.error('已保存的周配置中至少应包含一个布防时段');
        confirmLoading.value = false;
        setModalProps({ confirmLoading: false });
        return;
      }
    }

    const schedule = pickerValue.is_full_day_defense
      ? createFullDefenseSchedule()
      : (pickerValue.defense_week_schedules?.[0]?.schedule ?? pickerValue.schedule);
    values.defense_mode = pickerValue.is_full_day_defense || isFullDefenseSchedule(schedule)
      ? 'full'
      : pickerValue.mode;
    values.defense_schedule = JSON.stringify(schedule);

    // 确保 model_ids 是数组格式
    if (values.model_ids && !Array.isArray(values.model_ids)) {
      values.model_ids = [values.model_ids];
    }

    // 算法任务（实时和抓拍）必须指定模型ID列表
    if (['realtime', 'snap', 'patrol'].includes(values.task_type) && (!values.model_ids || values.model_ids.length === 0)) {
      createMessage.error('算法任务必须选择至少一个模型');
      confirmLoading.value = false;
      setModalProps({ confirmLoading: false });
      return;
    }

    if (modalData.value.type === 'edit' && modalData.value.record) {
      const response = await updateAlgorithmTask(modalData.value.record.id, values);
      // 由于 isTransformResponse: true，成功时返回的是任务对象，而不是包含 code 的响应对象
      if (response && response.id) {
        createMessage.success('更新成功');
        taskId.value = modalData.value.record.id;
        emit('success');
        closeModal();
      } else {
        // 如果返回的不是任务对象，可能是错误响应（包含 code 和 msg）
        createMessage.error((response as any)?.msg || '更新失败');
      }
    } else {
      const response = await createAlgorithmTask(values);
      // 由于 isTransformResponse: true，成功时返回的是任务对象，而不是包含 code 的响应对象
      if (response && response.id) {
        taskId.value = response.id;
        createMessage.success('创建成功');
        emit('success');
        closeModal();
      } else {
        // 如果返回的不是任务对象，可能是错误响应（包含 code 和 msg）
        createMessage.error((response as any)?.msg || '创建失败');
      }
    }
  } catch (error: any) {
    console.error('提交失败', error);
    // 尝试从错误对象中提取错误消息
    let errorMsg = '提交失败';
    if (error?.response?.data?.msg) {
      errorMsg = error.response.data.msg;
    } else if (error?.data?.msg) {
      errorMsg = error.data.msg;
    } else if (error?.msg) {
      errorMsg = error.msg;
    } else if (typeof error === 'string') {
      errorMsg = error;
    } else if (error?.message) {
      errorMsg = error.message;
    }
    createMessage.error(errorMsg);
  } finally {
    confirmLoading.value = false;
    setModalProps({ confirmLoading: false });
  }
};


// 重置表单
const handleReset = () => {
  resetFields();
  if (!modalData.value.record) {
    setFieldsValue({
      task_type: 'realtime',
      frame_skip: 25,
      extract_interval: 25,
      tracking_enabled: false,
      tracking_similarity_threshold: 0.2,
      tracking_max_age: 25,
      tracking_smooth_alpha: 0.25,
      alert_event_enabled: false,
    });
    defenseSchedule.value = createDefaultDefensePickerValue();
  } else {
    const record = modalData.value.record;
    const modelIds: number[] = [];
    if (record.model_ids && Array.isArray(record.model_ids)) {
      modelIds.push(...record.model_ids);
    } else if (record.model_ids && typeof record.model_ids === 'string') {
      try {
        const parsed = JSON.parse(record.model_ids);
        if (Array.isArray(parsed))
          modelIds.push(...parsed);
      } catch (e) {
        console.error('解析model_ids失败', e);
      }
    }

    setFieldsValue({
      task_name: record.task_name,
      task_type: record.task_type || 'realtime',
      device_ids: record.device_ids || [],
      cron_expression: record.cron_expression,
      frame_skip: record.frame_skip || 25,
      model_ids: modelIds,
      extract_interval: record.extract_interval || 25,
      tracking_enabled: record.tracking_enabled || false,
      tracking_similarity_threshold: record.tracking_similarity_threshold || 0.2,
      tracking_max_age: record.tracking_max_age || 25,
      tracking_smooth_alpha: record.tracking_smooth_alpha || 0.25,
      alert_event_enabled: record.alert_event_enabled !== undefined ? record.alert_event_enabled : false,
    });

    defenseSchedule.value = toDefensePickerValue(
      record.defense_mode,
      record.defense_schedule,
    );
  }
};
</script>

<style lang="less" scoped>
.basic-config-content {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .defense-schedule-wrapper {
    margin-top: 8px;
  }
}

:deep(.ant-tabs-content-holder) {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

:deep(.ant-tabs-tabpane) {
  padding: 0;
}

.footer-buttons {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.alert-event-enabled-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.full-day-defense-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.defense-tip-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 280px;
  line-height: 1.6;
  color: #fff;

  .tip-item {
    font-size: 13px;
  }
}

.placeholder-trigger-btn {
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;

  &:hover {
    color: #1890ff;
  }
}

.placeholder-box-small {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #000;
  padding: 12px;
  border-radius: 4px;
  min-width: 200px;
}

.placeholder-item-small {
  display: flex;
  align-items: center;
  line-height: 1.5;
  font-size: 12px;
  color: #fff;
  font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
}

.placeholder-text {
  color: #52c41a;
  font-weight: 500;
}

.placeholder-separator {
  color: #fff;
  margin: 0 4px;
}

.placeholder-desc {
  color: #fff;
}

// Popover 样式覆盖
:deep(.ant-popover-inner) {
  background-color: #000;
}

:deep(.ant-popover-inner-content) {
  background-color: #000;
  color: #fff;
}

:deep(.ant-popover-title) {
  background-color: #000;
  color: #fff;
  border-bottom-color: #333;
}
</style>
