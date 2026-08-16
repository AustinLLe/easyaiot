<template>
  <div class="table-wrapper">
    <Table
      aria-label="消息配置"
      :columns="displayColumns"
      :data-source="dataSource"
      bordered
      :pagination="false"
      :scroll="tableScroll"
    >
      <template #bodyCell="{ column, record }">
        <template
          v-if="
            [
              'key_',
              'value',
              'appName',
              'name',
              'agentId',
              'secret',
              'appSecret',
              'appKey',
              'domain',
              'path',
            ].includes(column.dataIndex)
          "
        >
          <label :for="`edit-table-${column.dataIndex}-${record.id}`" class="sr-only">{{ column.title || column.dataIndex }}</label>
          <Input :id="`edit-table-${column.dataIndex}-${record.id}`" v-model:value="record[column.dataIndex]" :disabled="readonly" />
        </template>
        <template v-else-if="column.dataIndex === 'time'">
          <DatePicker
            v-model:value="record[column.dataIndex]"
            allowClear
            showTime
            valueFormat="x"
            :disabled="readonly"
          />
        </template>
        <template v-else-if="column.dataIndex === 'operation' && !readonly">
          <Button type="text" html-type="button" danger @click="handleDelete(record.id)">
            <template #icon>
              <DeleteOutlined />
            </template>
          </Button>
        </template>
      </template>
    </Table>
    <Button v-if="!readonly" type="dashed" html-type="button" @click="handleAdd" style="width: 100%; margin-top: 5px">
      <template #icon>
        <PlusOutlined />
      </template>
      添加
    </Button>
  </div>
</template>

<script setup lang="ts">
  import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue';
  import { PropType, computed } from 'vue';
  import { Table, Input, DatePicker } from 'ant-design-vue';
  import { Button } from '@/components/Button';

  type Emits = {
    (e: 'update:list', data: any[]): void;
  };
  const emit = defineEmits<Emits>();

  const props = defineProps({
    list: {
      type: Array as PropType<any[]>,
      default: () => [],
    },
    columns: {
      type: Array as PropType<any[]>,
      default: () => [],
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  });

  const dataSource = computed({
    get: () => props.list,
    set: (val) => emit('update:list', val),
  });

  const displayColumns = computed(() => {
    if (!props.readonly)
      return props.columns;
    return props.columns.filter(col => col.dataIndex !== 'operation');
  });

  const tableScroll = computed(() => {
    const hasFixed = displayColumns.value.some((col) => col.fixed);
    if (!hasFixed) return undefined;
    const width = displayColumns.value.reduce(
      (sum, col) => sum + (Number(col.width) || 120),
      0,
    );
    return { x: width };
  });

  const handleDelete = (id: number) => {
    const idx = dataSource.value.findIndex((f) => f.id === id);
    dataSource.value.splice(idx, 1);
  };
  const handleAdd = () => {
    const value = props.columns.reduce((p, c) => {
      if (!['operation'].includes(c.dataIndex)) {
        p[c.dataIndex] = '';
      }
      return p;
    }, {});
    dataSource.value.push({
      id: dataSource.value.length,
      ...value,
    });
    // console.log(' dataSource.value ...', dataSource.value);
  };
</script>

<style lang="less" scoped>
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
</style>
