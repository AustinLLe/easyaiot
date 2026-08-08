import type { AlgorithmTaskDraft, PatrolConfigDraft, PatrolGroupDraft } from '../algorithmTaskDraft.types';

export function createDefaultPatrolConfig(): PatrolConfigDraft {
  return {
    group_mode: 'manual',
    cameras_per_group: undefined,
    analysis_duration_sec: undefined,
    groups: [],
  };
}

export function ensurePatrolDefaults(draft: AlgorithmTaskDraft) {
  if (draft.task_type !== 'patrol')
    return;
  if (!draft.patrol_config)
    draft.patrol_config = createDefaultPatrolConfig();
  if (!draft.patrol_config.group_mode)
    draft.patrol_config.group_mode = 'manual';
  if (!Array.isArray(draft.patrol_config.groups))
    draft.patrol_config.groups = [];
}

export function getPatrolAlgorithmCount(draft: AlgorithmTaskDraft): number {
  const ids = new Set<number>();
  draft.camera_bindings.forEach((binding) => {
    binding.model_ids.forEach(id => ids.add(id));
  });
  return ids.size;
}

export function getAllocatedDeviceIds(groups: PatrolGroupDraft[]): Set<string> {
  const allocated = new Set<string>();
  groups.forEach((group) => {
    group.device_ids.forEach(id => allocated.add(id));
  });
  return allocated;
}

export function getUnallocatedDeviceIds(draft: AlgorithmTaskDraft): string[] {
  ensurePatrolDefaults(draft);
  const allIds = draft.camera_bindings.map(binding => binding.device_id);
  const allocated = getAllocatedDeviceIds(draft.patrol_config!.groups);
  return allIds.filter(id => !allocated.has(id));
}

export function buildAutoPatrolGroups(draft: AlgorithmTaskDraft): PatrolGroupDraft[] {
  ensurePatrolDefaults(draft);
  const config = draft.patrol_config!;
  const perGroup = config.cameras_per_group;
  const duration = config.analysis_duration_sec;
  if (!perGroup || perGroup < 1 || !duration || duration < 1)
    return [];

  const bindings = [...draft.camera_bindings];
  const groups: PatrolGroupDraft[] = [];

  for (let index = 0; index < bindings.length; index += perGroup) {
    const chunk = bindings.slice(index, index + perGroup);
    const groupIndex = Math.floor(index / perGroup) + 1;
    groups.push({
      group_id: `patrol_group_${groupIndex}`,
      group_name: `轮巡组 ${groupIndex}`,
      device_ids: chunk.map(item => item.device_id),
      analysis_duration_sec: duration,
    });
  }

  return groups;
}

export function syncAutoPatrolGroups(draft: AlgorithmTaskDraft) {
  ensurePatrolDefaults(draft);
  if (draft.patrol_config!.group_mode !== 'auto')
    return;
  draft.patrol_config!.groups = buildAutoPatrolGroups(draft);
}

export function createEmptyPatrolGroupDraft(): PatrolGroupDraft {
  return {
    group_id: `patrol_group_${Date.now()}`,
    group_name: '',
    device_ids: [],
    analysis_duration_sec: undefined,
  };
}

export function validatePatrolConfig(draft: AlgorithmTaskDraft): string | null {
  if (draft.task_type !== 'patrol')
    return null;

  ensurePatrolDefaults(draft);
  const config = draft.patrol_config!;

  if (config.group_mode === 'auto') {
    if (config.cameras_per_group == null || config.cameras_per_group < 1)
      return '请设置每组摄像头数量';
    if (config.analysis_duration_sec == null || config.analysis_duration_sec < 1)
      return '请设置每组分析时长';
    syncAutoPatrolGroups(draft);
    if (!config.groups.length)
      return '当前摄像头数量不足以生成分组';
    return null;
  }

  if (!config.groups.length)
    return '请至少添加一个轮巡组';

  const unallocated = getUnallocatedDeviceIds(draft);
  if (unallocated.length)
    return `还有 ${unallocated.length} 路摄像头未分配到轮巡组`;

  const unnamedGroup = config.groups.find(group => !group.group_name?.trim());
  if (unnamedGroup)
    return '请填写轮巡组名称';

  const emptyGroup = config.groups.find(group => !group.device_ids.length);
  if (emptyGroup)
    return `「${emptyGroup.group_name}」未分配摄像头`;

  const invalidDuration = config.groups.find(group =>
    group.analysis_duration_sec == null || group.analysis_duration_sec < 1,
  );
  if (invalidDuration)
    return `「${invalidDuration.group_name}」请填写分析时长`;

  return null;
}
