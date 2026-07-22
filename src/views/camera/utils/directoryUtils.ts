import type { DeviceDirectory } from '@/api/device/camera';

function findNodeById(nodes: DeviceDirectory[], id: number): DeviceDirectory | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children?.length) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function getSiblingDirectories(parentId: number | null, tree: DeviceDirectory[]): DeviceDirectory[] {
  if (parentId == null) {
    return tree;
  }
  return findNodeById(tree, parentId)?.children ?? [];
}

export function getNextSortOrder(parentId: number | null, tree: DeviceDirectory[]): number {
  const siblings = getSiblingDirectories(parentId, tree);
  if (!siblings.length) {
    return 0;
  }
  return Math.max(...siblings.map(item => item.sort_order ?? 0)) + 1;
}

export function convertDirectoryTreeForSelect(directories: DeviceDirectory[]) {
  return directories.map(dir => ({
    id: dir.id,
    name: dir.name,
    children: dir.children ? convertDirectoryTreeForSelect(dir.children) : [],
  }));
}
