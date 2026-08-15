<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import type { TreeItem } from '@/components/Tree'
import { BasicTree } from '@/components/Tree'
import { listSimpleDept } from '@/api/system/dept'
import { handleTree } from '@/utils/tree'

defineOptions({ name: 'SystemDeptTree' })

const emit = defineEmits(['select'])
const treeRef = ref()
const treeData = ref<TreeItem[]>([])

async function fetch() {
  const res = await listSimpleDept()
  treeData.value = handleTree(res, 'id')
}

function handleSelect(keys) {
  emit('select', keys[0])
}

onMounted(() => {
  fetch()
})
</script>

<style lang="less" scoped>
.user-dept-tree {
  height: 100%;
  min-height: 0;
  padding: 12px;
  background: #fff;
  border: 1px solid #e1e7f0;
  border-radius: 15px;
}
</style>

<template>
  <div class="user-dept-tree overflow-hidden" v-bind="$attrs">
    <BasicTree
      ref="treeRef"
      title="部门列表"
      toolbar
      search
      tree-wrapper-class-name="h-[calc(100%-35px)] overflow-auto"
      :click-row-to-expand="false"
      :tree-data="treeData"
      :field-names="{ key: 'id', title: 'name' }"
      @select="handleSelect"
    />
  </div>
</template>
