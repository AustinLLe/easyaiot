<template>
  <div class="logic-expression-builder">
    <template v-if="readonly">
      <div class="expr-display expr-display-readonly">
        <span v-if="displayExpression">{{ formatLogicExpressionDisplay(displayExpression) }}</span>
        <span v-else class="expr-placeholder">全部满足（未填写条件关系）</span>
      </div>
    </template>
    <template v-else>
      <div class="expr-display">
        <template v-if="tokens.length">
          <span
            v-for="(token, index) in tokens"
            :key="`${token.type}_${index}`"
            class="expr-chip"
            :class="chipClass(token)"
            draggable="true"
            @dragstart="handleDragStart(index)"
            @dragover.prevent
            @drop="handleDrop(index)"
          >
            {{ chipLabel(token) }}
            <button type="button" class="chip-remove" @click="removeToken(index)">×</button>
          </span>
        </template>
        <span v-else class="expr-placeholder">点击下方按钮构建条件关系，如 (1 且 2) 或 3</span>
      </div>

      <div class="expr-toolbar">
        <span class="toolbar-label">插入：</span>
        <Button
          v-for="seq in availableSeqs"
          :key="`seq_${seq}`"
          size="small"
          @click="appendToken({ type: 'cond', seq })"
        >
          {{ seq }}
        </Button>
        <Button size="small" @click="appendToken({ type: 'op', value: 'AND' })">且</Button>
        <Button size="small" @click="appendToken({ type: 'op', value: 'OR' })">或</Button>
        <Button size="small" @click="appendToken({ type: 'paren', value: '(' })">(</Button>
        <Button size="small" @click="appendToken({ type: 'paren', value: ')' })">)</Button>
        <Button size="small" type="primary" ghost class="btn-compact" @click="handleValidate">检测</Button>
        <Button size="small" danger class="btn-compact" @click="clearTokens">清空</Button>
      </div>

      <div v-if="displayExpression" class="expr-preview">
        预览：{{ formatLogicExpressionDisplay(displayExpression) }}
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { Button } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import type { AlertRuleConditionDraft } from '../../algorithmTaskDraft.types';
import {
  expressionToTokens,
  formatLogicExpressionDisplay,
  tokensToExpression,
  validateLogicExpression,
  type LogicExpressionToken,
} from '../../utils/alertUtils';

defineOptions({ name: 'LogicExpressionBuilder' });

const props = defineProps<{
  conditions: AlertRuleConditionDraft[];
  readonly?: boolean;
}>();

const expression = defineModel<string>('expression', { required: true });

const { createInfoModal, createSuccessModal, createWarningModal } = useMessage();
const dragIndex = ref<number | null>(null);

const tokens = computed({
  get: () => expressionToTokens(expression.value),
  set: (next) => {
    expression.value = tokensToExpression(next);
  },
});

const availableSeqs = computed(() => props.conditions.map(c => c.seq));

const displayExpression = computed(() => expression.value.trim());

function chipLabel(token: LogicExpressionToken) {
  if (token.type === 'cond')
    return String(token.seq);
  if (token.type === 'op')
    return token.value === 'AND' ? '且' : '或';
  return token.value;
}

function chipClass(token: LogicExpressionToken) {
  if (token.type === 'cond')
    return 'chip-cond';
  if (token.type === 'op')
    return 'chip-op';
  return 'chip-paren';
}

function appendToken(token: LogicExpressionToken) {
  tokens.value = [...tokens.value, token];
}

function removeToken(index: number) {
  const next = [...tokens.value];
  next.splice(index, 1);
  tokens.value = next;
}

function clearTokens() {
  expression.value = '';
}

function handleValidate() {
  const trimmed = expression.value.trim();
  const modalBase = {
    centered: true,
    getContainer: () => document.body,
    zIndex: 4100,
  };

  if (!trimmed) {
    createInfoModal({
      ...modalBase,
      title: '提示',
      content: '未填写条件关系，保存时将默认全部满足',
    });
    return;
  }
  const error = validateLogicExpression(trimmed, props.conditions);
  if (error) {
    createWarningModal({
      ...modalBase,
      title: '检测结果',
      content: error,
    });
    return;
  }
  createSuccessModal({
    ...modalBase,
    title: '检测结果',
    content: '条件关系表达式正确',
  });
}

function handleDragStart(index: number) {
  dragIndex.value = index;
}

function handleDrop(index: number) {
  if (dragIndex.value == null || dragIndex.value === index)
    return;
  const next = [...tokens.value];
  const [moved] = next.splice(dragIndex.value, 1);
  next.splice(index, 0, moved);
  tokens.value = next;
  dragIndex.value = null;
}

watch(
  () => props.conditions.map(c => c.seq).join(','),
  () => {
    const valid = new Set(props.conditions.map(c => c.seq));
    const filtered = tokens.value.filter(
      token => token.type !== 'cond' || valid.has(token.seq),
    );
    if (filtered.length !== tokens.value.length)
      tokens.value = filtered;
  },
);
</script>

<style lang="less" scoped>
.logic-expression-builder {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.expr-display {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
}

.expr-display-readonly {
  border-style: solid;
  color: rgba(0, 0, 0, 0.88);
}

.expr-placeholder {
  color: rgba(0, 0, 0, 0.35);
  font-size: 13px;
}

.expr-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  cursor: grab;
  user-select: none;

  &.chip-cond {
    background: #e6f4ff;
    color: #1677ff;
    border: 1px solid #91caff;
  }

  &.chip-op {
    background: #f6ffed;
    color: #389e0d;
    border: 1px solid #b7eb8f;
  }

  &.chip-paren {
    background: #fff7e6;
    color: #d48806;
    border: 1px solid #ffd591;
  }
}

.chip-remove {
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0;
  line-height: 1;

  &:hover {
    opacity: 1;
  }
}

.expr-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.toolbar-label {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.expr-toolbar :deep(.btn-compact.ant-btn-sm) {
  width: fit-content !important;
  min-width: 0 !important;
  padding-inline: 8px !important;
  letter-spacing: 0 !important;
  word-spacing: 0 !important;

  > span {
    letter-spacing: 0 !important;
    word-spacing: 0 !important;
  }
}

.expr-preview {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
