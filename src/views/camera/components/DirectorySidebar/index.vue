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
        <div class="all-root-node">
          <div
            class="all-root-content"
            :class="{ 'node-selected': selectedDirectoryId === null }"
            @click="handleSelectAll"
          >
            <div class="node-left">
              <span
                class="expand-icon"
                @click.stop="handleToggleAll"
              >
                <Icon
                  :icon="isAllExpanded ? 'ant-design:down-outlined' : 'ant-design:right-outlined'"
                  class="expand-icon-svg"
                />
              </span>
              <Icon
                icon="ant-design:folder-outlined"
                class="folder-icon"
              />
              <span class="node-name">全部</span>
            </div>
          </div>

          <div v-if="isAllExpanded" class="all-root-children">
            <div
              v-for="dir in filteredDirectoryTree"
              :key="dir.id"
              class="tree-node"
            >
              <DirectoryTreeNode
                :directory="dir"
                :level="1"
                :expanded-keys="expandedKeys"
                :selected-id="selectedDirectoryId"
                @toggle="handleToggleNode"
                @select="handleSelectDirectory"
                @edit="handleEditDirectory"
                @delete="handleDeleteDirectory"
              />
            </div>
            <a-empty
              v-if="filteredDirectoryTree.length === 0 && directorySearchText"
              description="暂无匹配目录"
            />
          </div>
        </div>
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

/** 虚拟根节点「全部」，用于展开/折叠状态 */
const ALL_DIRECTORY_KEY = -1;

const emit = defineEmits<{
  select: [directory: DeviceDirectory | null];
}>();

const { createMessage } = useMessage();
const [registerDirectoryModal, { openModal: openDirectoryModal }] = useModal();

const selectedDirectoryId = ref<number | null>(null);
const directoryTree = ref<DeviceDirectory[]>([]);
const expandedKeys = ref<Set<number>>(new Set([ALL_DIRECTORY_KEY]));
const directorySearchText = ref<string>('');

const isAllExpanded = computed(() => expandedKeys.value.has(ALL_DIRECTORY_KEY));

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
        expandedKeys.value = new Set([ALL_DIRECTORY_KEY]);
      }
      else {
        const validIds = collectDirectoryIds(data);
        const newExpandedKeys = new Set<number>([ALL_DIRECTORY_KEY]);
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
      expandedKeys.value = new Set([ALL_DIRECTORY_KEY]);
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

const isTopLevelDirectory = (directoryId: number) =>
  directoryTree.value.some(dir => dir.id === directoryId);

const handleToggleAll = () => {
  const newExpandedKeys = new Set(expandedKeys.value);
  if (newExpandedKeys.has(ALL_DIRECTORY_KEY))
    newExpandedKeys.delete(ALL_DIRECTORY_KEY);
  else
    newExpandedKeys.add(ALL_DIRECTORY_KEY);
  expandedKeys.value = newExpandedKeys;
};

const handleToggleNode = (directoryId: number, level: number) => {
  const newExpandedKeys = new Set(expandedKeys.value);

  if (newExpandedKeys.has(directoryId)) {
    newExpandedKeys.delete(directoryId);
    removeChildrenKeys(directoryId, newExpandedKeys);
  }
  else {
    if (level === 1 && isTopLevelDirectory(directoryId)) {
      directoryTree.value.forEach((dir) => {
        if (dir.id !== directoryId && newExpandedKeys.has(dir.id)) {
          newExpandedKeys.delete(dir.id);
          removeChildrenKeys(dir.id, newExpandedKeys);
        }
      });
    }
    else if (level === 0) {
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

const handleSelectAll = () => {
  if (selectedDirectoryId.value === null)
    return
  selectedDirectoryId.value = null
  emit('select', null)
}

const handleSelectDirectory = (directory: DeviceDirectory) => {
  if (selectedDirectoryId.value === directory.id)
    return

  selectedDirectoryId.value = directory.id
  emit('select', directory)
}

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
        handleSelectAll()
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
  handleSelectAll()
}

defineExpose({
  refresh: loadDirectoryList,
  loadDirectoryList,
  clearSelection,
  selectAll: handleSelectAll,
  selectedDirectoryId,
})

onMounted(async () => {
  await loadDirectoryList()
  emit('select', null)
})
</script>

<style lang="less" scoped>
.directory-sidebar {
  width: 260px;
  flex-shrink: 0;
  align-self: stretch;
  min-height: 100vh;
  background: #fff;
  border-right: 1px solid @mix-stroke-color;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

  .sidebar-tree {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 20px 12px 16px;

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
        line-height: 20px;
        color: @mix-rail-text;
        margin-bottom: 0;
      }

      .add-directory-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        color: @mix-brand-color;

        &:hover {
          color: @mix-brand-color;
          background: @mix-highlight-bg;
        }
      }
    }

    .tree-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;

      .all-root-node {
        user-select: none;
      }

      .all-root-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        margin-bottom: 2px;
        cursor: pointer;
        border-radius: @mix-menu-radius;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        color: @mix-rail-text;
        transition: background-color 0.2s, color 0.2s;

        &:hover {
          background-color: @mix-highlight-bg;
        }

        &.node-selected {
          color: @mix-brand-color;
          background-color: @mix-highlight-bg;

          .folder-icon {
            color: @mix-brand-color !important;
          }
        }

        .node-left {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .expand-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          margin-right: 4px;
          cursor: pointer;

          &:hover .expand-icon-svg {
            color: @mix-brand-color !important;
          }
        }

        .expand-icon-svg {
          font-size: 12px;
          color: @mix-rail-text-secondary;
        }

        .folder-icon {
          margin-right: 8px;
          font-size: 16px;
          color: @mix-rail-text-secondary;
        }

        &.node-selected .folder-icon {
          color: @mix-brand-color !important;
        }

        .node-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .all-root-children {
        margin-left: 0;
      }

      .tree-node {
        margin-bottom: 0;
      }
    }
  }
}
</style>
