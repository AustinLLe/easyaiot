<template>
  <div class="section-panel">
    <div class="section-header">
      <div class="header-row">
        <h3>算法阈值</h3>
        <Segmented
          v-model:value="payload.param_config_mode"
          :options="paramModeOptions"
          @change="handleParamModeChange"
        />
      </div>
    </div>

    <div class="threshold-panel">
      <div class="table-toolbar">
        <Input.Search
          v-if="payload.param_config_mode === 'combo'"
          v-model:value="cameraSearchText"
          placeholder="搜索摄像头名称"
          allow-clear
          class="toolbar-search"
        />
        <Input.Search
          v-model:value="modelSearchText"
          placeholder="搜索算法名称"
          allow-clear
          class="toolbar-search"
        />
      </div>

      <Table
        class="threshold-table"
        :columns="tableColumns"
        :data-source="filteredRows"
        :pagination="false"
        :locale="{ emptyText: emptyDescription }"
        row-key="key"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Button type="link" size="small" @click="openEdit(record as ThresholdTableRow)">
              编辑
            </Button>
          </template>
        </template>
      </Table>
    </div>

    <AlgorithmThresholdEditModal
      v-model:open="editVisible"
      :row="editingRow"
      :config="editingConfig"
      :global-detection-config="payload.detection_config"
      @save="handleEditSave"
      @cancel="handleEditClose"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { Button, Input, Segmented, Table } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { getModelPage } from '@/api/device/model';
import AlgorithmThresholdEditModal from '../../TaskFormWidgets/AlgorithmThresholdEditModal.vue';
import type {
  AlgorithmParamConfigDraft,
  AlgorithmTaskDraft,
  ParamConfigMode,
  ThresholdTableRow,
} from '../../../algorithmTaskDraft.types';
import {
  buildModelNameMapFromDraft,
  ensureParamConfigs,
  getParamConfigForRow,
  getThresholdTableRows,
  handleParamConfigModeChange,
  saveParamConfigForRow,
} from '../../../utils/paramUtils';
import { handleRegionConfigModeChange } from '../../../utils/paramUtils';

defineOptions({ name: 'ModelDetectionSection' });

const payload = defineModel<AlgorithmTaskDraft>('payload', { required: true });

const modelSearchText = ref('');
const cameraSearchText = ref('');
const editVisible = ref(false);
const editingRow = ref<ThresholdTableRow | null>(null);
const editingConfig = ref<AlgorithmParamConfigDraft | null>(null);

const paramModeOptions = [
  { label: '组合', value: 'combo' },
  { label: '算法', value: 'algorithm' },
];

const modelNameMap = computed(() => buildModelNameMapFromDraft(payload.value));

const bindingStats = computed(() => {
  const bindings = payload.value.camera_bindings ?? [];
  const pairCount = bindings.reduce((sum, binding) => sum + (binding.model_ids?.length ?? 0), 0);
  return {
    cameraCount: bindings.length,
    pairCount,
  };
});

const tableRows = computed(() =>
  getThresholdTableRows(payload.value, modelNameMap.value),
);

const filteredRows = computed(() => {
  const modelKeyword = modelSearchText.value.trim().toLowerCase();
  const cameraKeyword = cameraSearchText.value.trim().toLowerCase();

  return tableRows.value.filter((row) => {
    const modelMatch = !modelKeyword
      || row.model_name.toLowerCase().includes(modelKeyword);
    const cameraMatch = payload.value.param_config_mode !== 'combo'
      || !cameraKeyword
      || (row.device_name ?? '').toLowerCase().includes(cameraKeyword);
    return modelMatch && cameraMatch;
  });
});

const tableColumns = computed<ColumnsType<ThresholdTableRow>>(() => {
  const columns: ColumnsType<ThresholdTableRow> = [];

  if (payload.value.param_config_mode === 'combo') {
    columns.push({
      title: '摄像头名称',
      dataIndex: 'device_name',
      key: 'device_name',
      width: 160,
      ellipsis: true,
    });
  }

  columns.push({
    title: '算法名称',
    dataIndex: 'model_name',
    key: 'model_name',
    width: 200,
    ellipsis: true,
  });

  columns.push({
    title: '操作',
    key: 'action',
    width: 72,
    align: 'center',
  });

  return columns;
});

const emptyDescription = computed(() => {
  const { cameraCount, pairCount } = bindingStats.value;
  if (!cameraCount)
    return '请先在「摄像头与算法」步骤添加摄像头并绑定算法';
  if (!pairCount)
    return '已选择摄像头，但尚未绑定算法，请返回上一步为每个摄像头添加算法';
  if (tableRows.value.length && !filteredRows.value.length)
    return '没有符合搜索条件的记录，请调整搜索关键词';
  return '暂无可配置的算法阈值项';
});

function syncParamConfigs() {
  ensureParamConfigs(payload.value, modelNameMap.value);
}

function handleParamModeChange(mode: ParamConfigMode) {
  handleParamConfigModeChange(payload.value, mode, modelNameMap.value);
  handleRegionConfigModeChange(payload.value, mode, modelNameMap.value);
}

function openEdit(row: ThresholdTableRow) {
  syncParamConfigs();
  editingRow.value = row;
  editingConfig.value = getParamConfigForRow(payload.value, row);
  editVisible.value = true;
}

function handleEditSave(config: AlgorithmParamConfigDraft) {
  if (!editingRow.value)
    return;
  saveParamConfigForRow(payload.value, editingRow.value, config);
  handleEditClose();
}

function handleEditClose() {
  editVisible.value = false;
  editingRow.value = null;
  editingConfig.value = null;
}

async function enrichModelNamesFromApi() {
  try {
    const response = await getModelPage({ pageNo: 1, pageSize: 1000 });
    let allModels: any[] = [];
    if (Array.isArray(response))
      allModels = response;
    else if (response?.data && Array.isArray(response.data))
      allModels = response.data;

    const map = { ...payload.value.model_name_map };
    for (const item of allModels) {
      if (item?.id != null && item?.name)
        map[item.id] = item.name;
    }
    map[-1] = map[-1] || 'yolo11n.pt';
    map[-2] = map[-2] || 'yolov8n.pt';
    payload.value.model_name_map = map;
  }
  catch {
    // keep draft names from previous step
  }
  syncParamConfigs();
}

watch(
  () => payload.value.camera_bindings,
  () => syncParamConfigs(),
  { deep: true, immediate: true },
);

watch(
  () => payload.value.model_name_map,
  () => syncParamConfigs(),
  { deep: true },
);

watch(
  () => payload.value.param_config_mode,
  () => syncParamConfigs(),
);

enrichModelNamesFromApi();
</script>

<style lang="less" scoped>
.section-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-header {
  flex-shrink: 0;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.threshold-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.table-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.toolbar-search {
  width: 220px;
}

.threshold-table {
  flex: 1;
  min-height: 0;

  :deep(.ant-table) {
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    overflow: hidden;
    table-layout: fixed;
  }

  :deep(.ant-table-content table) {
    width: auto !important;
    min-width: 100%;
  }

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 600;
  }

  :deep(.ant-table-tbody > tr > td) {
    background: #fff;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: #fafafa;
  }

  :deep(.ant-table-placeholder) {
    min-height: 200px;
  }
}
</style>
