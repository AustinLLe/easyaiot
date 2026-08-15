<template>
  <div class="directory-tree-node">
    <div
      class="node-content"
      :class="{ 'node-selected': isSelected, 'node-level-0': level === 0, 'node-level-1': level === 1, 'node-level-2': level === 2 }"
      @click="handleSelect"
    >
      <div class="node-left">
        <!-- 折叠/展开图标 -->
        <span
          v-if="hasChildren && level < 2"
          class="expand-icon"
          @click.stop="handleToggle"
        >
          <Icon
            :icon="isExpanded ? 'ant-design:down-outlined' : 'ant-design:right-outlined'"
            class="expand-icon-svg"
          />
        </span>
        <span v-else class="expand-placeholder"></span>
        
        <!-- 文件夹图标 -->
        <Icon
          icon="ant-design:folder-outlined"
          class="folder-icon"
        />
        
        <!-- 目录名称 -->
        <span class="node-name">{{ directory.name }}</span>
      </div>
      
      <!-- 操作按钮 -->
      <div class="node-actions" @click.stop>
        <a-button
          v-auth="['camera:directory:update']"
          type="text"
          size="small"
          @click="handleEdit"
          title="编辑"
        >
          <template #icon>
            <Icon icon="ant-design:edit-filled" class="action-icon" />
          </template>
        </a-button>
        <a-popconfirm
          title="确定删除此目录？"
          @confirm="handleDelete"
        >
          <a-button
            v-auth="['camera:directory:delete']"
            type="text"
            size="small"
            danger
            title="删除"
          >
            <template #icon>
              <Icon icon="material-symbols:delete-outline-rounded" />
            </template>
          </a-button>
        </a-popconfirm>
      </div>
    </div>
    
    <!-- 子节点 -->
    <div
      v-if="hasChildren && isExpanded && level < 2"
      class="node-children"
    >
      <DirectoryTreeNode
        v-for="child in directory.children"
        :key="child.id"
        :directory="child"
        :level="level + 1"
        :expanded-keys="expandedKeys"
        :selected-id="selectedId"
        @toggle="$emit('toggle', $event, level + 1)"
        @select="$emit('select', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { Icon } from '@/components/Icon';
import { Button as AButton, Popconfirm as APopconfirm } from 'ant-design-vue';
import type { DeviceDirectory } from '@/api/device/camera';

interface Props {
  directory: DeviceDirectory;
  level: number;
  expandedKeys: Set<number>;
  selectedId: number | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  toggle: [directoryId: number, level: number];
  select: [directory: DeviceDirectory];
  edit: [directory: DeviceDirectory];
  delete: [directory: DeviceDirectory];
}>();

const hasChildren = computed(() => {
  return props.directory.children && props.directory.children.length > 0;
});

const isExpanded = computed(() => {
  return props.expandedKeys.has(props.directory.id);
});

const isSelected = computed(() => {
  return props.selectedId === props.directory.id;
});

const handleToggle = () => {
  emit('toggle', props.directory.id, props.level);
};

const handleSelect = () => {
  emit('select', props.directory);
};

const handleEdit = () => {
  emit('edit', props.directory);
};

const handleDelete = () => {
  emit('delete', props.directory);
};
</script>

<style lang="less" scoped>
.directory-tree-node {
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  border-radius: @mix-menu-radius;
  margin: 2px 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: @mix-rail-text;
  
  &:hover {
    background-color: @mix-highlight-bg;
    
    .node-actions {
      opacity: 1;
    }
  }
  
  &.node-selected {
    color: @mix-brand-color;
    background-color: @mix-highlight-bg;

    .folder-icon {
      color: @mix-brand-color !important;
    }

    .action-icon {
      color: @mix-brand-color !important;
    }
  }
  
  &.node-level-1 {
    padding-left: 32px;
  }
  
  &.node-level-2 {
    padding-left: 56px;
    font-weight: 600;
    color: @mix-rail-text-secondary;
  }

  &.node-selected.node-level-2 {
    color: @mix-brand-color;
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

.expand-placeholder {
  width: 20px;
  margin-right: 4px;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;

  .action-icon {
    color: @mix-brand-color;
  }
  
  :deep(.ant-btn) {
    padding: 0 4px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: @mix-menu-radius;
    transition: all 0.2s;
    
    &:hover {
      background-color: @mix-highlight-bg;
      transform: scale(1.1);
    }
    
    &:active {
      transform: scale(0.95);
    }
  }
}

.node-children {
  margin-left: 0;
}
</style>

