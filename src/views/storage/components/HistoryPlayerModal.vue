<template>
  <BasicModal
    v-bind="$attrs"
    @register="register"
    title="录像回放"
    :width="960"
    :footer="null"
    :destroy-on-close="true"
    @cancel="resetPlayer"
  >
    <div class="history-player">
      <div class="video-shell">
        <video
          v-if="state.url"
          ref="videoRef"
          :key="state.url"
          :src="state.url"
          controls
          autoplay
          preload="metadata"
          playsinline
          @loadstart="state.loading = true"
          @canplay="state.loading = false"
          @playing="state.loading = false"
          @error="handleVideoError"
        />
        <div v-else class="video-empty">暂无可播放地址</div>
        <div v-if="state.loading" class="video-loading">
          <LoadingOutlined spin />
          <span>正在准备录像点播…</span>
        </div>
      </div>

      <div class="record-meta">
        <div>
          <span>摄像头</span>
          <b>{{ state.deviceName || '--' }}</b>
        </div>
        <div>
          <span>录像时间</span>
          <b>{{ state.eventTime || '--' }}</b>
        </div>
        <div>
          <span>文件大小</span>
          <b>{{ state.sizeText || '--' }}</b>
        </div>
        <div>
          <span>录像来源</span>
          <b>{{ state.sourceText || '--' }}</b>
        </div>
      </div>
    </div>
  </BasicModal>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { LoadingOutlined } from '@ant-design/icons-vue';
import { BasicModal, useModalInner } from '@/components/Modal';
import { useMessage } from '@/hooks/web/useMessage';

defineOptions({ name: 'HistoryPlayerModal' });

const { createMessage } = useMessage();
const videoRef = ref<HTMLVideoElement | null>(null);
const state = reactive({
  url: '',
  deviceName: '',
  eventTime: '',
  sizeText: '',
  sourceText: '',
  loading: false,
});

defineEmits(['register']);
const [register] = useModalInner((record: Record<string, string>) => {
  state.url = record.url || '';
  state.deviceName = record.deviceName || '';
  state.eventTime = record.eventTime || '';
  state.sizeText = record.sizeText || '';
  state.sourceText = record.sourceText || '';
  state.loading = Boolean(state.url);
});

function handleVideoError() {
  state.loading = false;
  createMessage.error('录像加载失败，请刷新历史列表后重试');
}

function resetPlayer() {
  if (videoRef.value) {
    videoRef.value.pause();
    videoRef.value.removeAttribute('src');
    videoRef.value.load();
  }
  state.url = '';
  state.loading = false;
}
</script>

<style lang="less" scoped>
.history-player { padding: 2px 0 8px; }
.video-shell {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 480px;
  overflow: hidden;
  border-radius: 10px;
  background: #07111d;
}
.video-shell video { display: block; width: 100%; max-height: 68vh; background: #07111d; }
.video-empty { color: #98a2b3; }
.video-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  background: rgba(7, 17, 29, .72);
  font-size: 15px;
}
.video-loading :deep(svg) { font-size: 30px; }
.record-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.record-meta div { min-width: 0; padding: 11px 13px; border-radius: 8px; background: #f6f8fb; }
.record-meta span, .record-meta b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.record-meta span { color: #8a94a6; font-size: 12px; }
.record-meta b { margin-top: 4px; color: #263445; font-size: 14px; }
@media (max-width: 760px) {
  .video-shell { min-height: 260px; }
  .record-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
