<template>
  <div class="directory-sidebar">
    <div class="sidebar-tree">
      <div class="tree-header">
        <div class="tree-header-row">
          <span class="tree-header-title">分组</span>
          <a-button
            v-auth="['camera:directory:create']"
            type="text"
            class="add-directory-btn"
            title="添加目录"
            @click="handleAddDirectory"
          >
            <PlusOutlined />
          </a-button>
        </div>
        <a-input
          v-model:value="directorySearchText"
          placeholder="分组名称"
          allow-clear
          style="margin-top: 12px;"
        >
          <template #prefix>
            <Icon icon="ant-design:search-outlined" />
          </template>
        </a-input>
      </div>
      <div class="tree-content">
        <div
          v-for="dir in filteredDirectoryTree"
          :key="dir.id"
          class="tree-node"
        >
          <DirectoryTreeNode
            :directory="dir"
            :level="0"
            :expanded-keys="expandedKeys"
            :selected-id="selectedDirectoryId"
            @toggle="handleToggleNode"
            @select="handleSelectDirectory"
            @edit="handleEditDirectory"
            @delete="handleDeleteDirectory"
          />
        </div>
        <a-empty v-if="filteredDirectoryTree.length === 0" description="暂无目录" />
      </div>
    </div>

    <DirectoryModal
      @register="registerDirectoryModal"
      @success="handleDirectorySuccess"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useMessage } from '@/hooks/web/useMessage';
import { useModal } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { Input as AInput, Empty as AEmpty } from 'ant-design-vue';
import {
  deleteDirectory,
  getDirectoryList,
  type DeviceDirectory,
} from '@/api/device/camera';
import DirectoryModal from '../DirectoryManage/DirectoryModal.vue';
import DirectoryTreeNode from '../DirectoryManage/DirectoryTreeNode.vue';
import { PlusOutlined } from '@ant-design/icons-vue';

const emit = defineEmits<{
  select: [directory: DeviceDirectory | null];
}>();

const { createMessage } = useMessage();
const [registerDirectoryModal, { openModal: openDirectoryModal }] = useModal();

const selectedDirectoryId = ref<number | null>(null);
const directoryTree = ref<DeviceDirectory[]>([]);
const expandedKeys = ref<Set<number>>(new Set());
const directorySearchText = ref<string>('');

const filteredDirectoryTree = computed(() => {
  if (!directorySearchText.value) {
    return directoryTree.value;
  }

  const searchLower = directorySearchText.value.toLowerCase();

  const filterTree = (nodes: DeviceDirectory[]): DeviceDirectory[] => {
    return nodes
      .map((node) => {
        const matches = node.name.toLowerCase().includes(searchLower);
        const filteredChildren = node.children ? filterTree(node.children) : [];

        if (matches || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          };
        }
        return null;
      })
      .filter((node): node is DeviceDirectory => node !== null);
  };

  return filterTree(directoryTree.value);
});

const collectDirectoryIds = (nodes: DeviceDirectory[]): Set<number> => {
  const ids = new Set<number>();
  const traverse = (dirs: DeviceDirectory[]) => {
    dirs.forEach((dir) => {
      ids.add(dir.id);
      if (dir.children && dir.children.length > 0) {
        traverse(dir.children);
      }
    });
  };
  traverse(nodes);
  return ids;
};

const loadDirectoryList = async () => {
  try {
    const response = await getDirectoryList();
    const data = response.code !== undefined ? response.data : response;

    if (data && Array.isArray(data)) {
      const currentExpandedKeys = new Set(expandedKeys.value);
      const isInitialLoad = directoryTree.value.length === 0;

      directoryTree.value = data;

      if (isInitialLoad) {
        expandedKeys.value = new Set();
      }
      else {
        const validIds = collectDirectoryIds(data);
        const newExpandedKeys = new Set<number>();
        currentExpandedKeys.forEach((id) => {
          if (validIds.has(id)) {
            newExpandedKeys.add(id);
          }
        });
        expandedKeys.value = newExpandedKeys;
      }
    }
    else {
      directoryTree.value = [];
      if (directoryTree.value.length === 0) {
        expandedKeys.value = new Set();
      }
    }
  }
  catch (error) {
    console.error('加载目录列表失败', error);
    directoryTree.value = [];
  }
};

const removeChildrenKeys = (parentId: number, keys: Set<number>) => {
  const removeFromNode = (node: DeviceDirectory) => {
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        keys.delete(child.id);
        removeFromNode(child);
      });
    }
  };

  const findNode = (nodes: DeviceDirectory[], targetId: number): DeviceDirectory | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNode(node.children, targetId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  const targetNode = findNode(directoryTree.value, parentId);
  if (targetNode) {
    removeFromNode(targetNode);
  }
};

const findParentDirectory = (childId: number, nodes: DeviceDirectory[]): DeviceDirectory | null => {
  for (const node of nodes) {
    if (node.children) {
      const found = node.children.find(child => child.id === childId);
      if (found) {
        return node;
      }
      const parent = findParentDirectory(childId, node.children);
      if (parent) {
        return parent;
      }
    }
  }
  return null;
};

const handleToggleNode = (directoryId: number, level: number) => {
  const newExpandedKeys = new Set(expandedKeys.value);

  if (newExpandedKeys.has(directoryId)) {
    newExpandedKeys.delete(directoryId);
    removeChildrenKeys(directoryId, newExpandedKeys);
  }
  else {
    if (level === 0) {
      directoryTree.value.forEach((dir) => {
        if (dir.id !== directoryId && newExpandedKeys.has(dir.id)) {
          newExpandedKeys.delete(dir.id);
          removeChildrenKeys(dir.id, newExpandedKeys);
        }
      });
    }
    else {
      const parent = findParentDirectory(directoryId, directoryTree.value);
      if (parent) {
        const siblings = parent.children || [];
        siblings.forEach((sibling) => {
          if (sibling.id !== directoryId && newExpandedKeys.has(sibling.id)) {
            newExpandedKeys.delete(sibling.id);
            removeChildrenKeys(sibling.id, newExpandedKeys);
          }
        });
      }
    }

    newExpandedKeys.add(directoryId);
  }

  expandedKeys.value = newExpandedKeys;
};

const handleSelectDirectory = (directory: DeviceDirectory) => {
  if (selectedDirectoryId.value === directory.id) {
    selectedDirectoryId.value = null;
    emit('select', null);
    return;
  }

  selectedDirectoryId.value = directory.id;
  emit('select', directory);
};

const handleEditDirectory = (directory: DeviceDirectory) => {
  openDirectoryModal(true, {
    type: 'edit',
    record: directory,
  });
};

const handleDeleteDirectory = async (directory: DeviceDirectory) => {
  try {
    const response = await deleteDirectory(directory.id);
    const result = response.code !== undefined ? response : { code: 0, msg: '删除成功' };
    if (result.code === 0) {
      createMessage.success('删除成功');
      loadDirectoryList();
      if (selectedDirectoryId.value === directory.id) {
        selectedDirectoryId.value = null;
        emit('select', null);
      }
      expandedKeys.value.delete(directory.id);
    }
    else {
      createMessage.error(result.msg || '删除失败');
    }
  }
  catch (error) {
    console.error('删除目录失败', error);
    createMessage.error('删除失败');
  }
};

const handleAddDirectory = () => {
  openDirectoryModal(true, {
    type: 'create',
  });
};

const handleDirectorySuccess = () => {
  loadDirectoryList();
};

const clearSelection = () => {
  selectedDirectoryId.value = null;
  emit('select', null);
};

defineExpose({
  refresh: loadDirectoryList,
  loadDirectoryList,
  clearSelection,
  selectedDirectoryId,
});

onMounted(() => {
  loadDirectoryList();
});
</script>

<style lang="less" scoped>
.directory-sidebar {
  width: 260px;
  flex-shrink: 0;
  align-self: stretch;
  min-height: 100%;
  background: #fff;
  border-right: 1px solid #f0f0f0;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .sidebar-tree {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 16px 12px;

    .tree-header {
      margin-bottom: 8px;

      .tree-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .tree-header-title {
        font-size: 14px;
        font-weight: 600;
        color: #050708;
        margin-bottom: 0;
      }

      .add-directory-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        color: #1677ff;

        &:hover {
          color: #4096ff;
          background: rgba(22, 119, 255, 0.08);
        }
      }
    }

    .tree-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;

      .tree-node {
        margin-bottom: 0;
      }
    }
  }
}
</style>
