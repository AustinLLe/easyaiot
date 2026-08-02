<template>
  <div style="width: 100%; height: 100%; background-color: #000c17">
    <div
      ref="container"
      :id="playerId"
      class="player-container"
      :class="{ 'easy-wasm-active': !!easyPlayer }"
      @dblclick="fullscreen"
      @mousemove="mouseenter"
    >
      <transition name="toolBtn">
        <div
          v-if="showToolBtn"
          class="buttons-box"
          id="buttonsBox"
          @mouseenter="keepShowTool"
          @mousemove="
            (e) => {
              e.stopPropagation();
            }
          "
          @mouseleave="mouseenter"
        >
          <div class="buttons-box-left">
            <Icon
              v-if="!playing"
              :size="iconSize"
              class="jessibuca-btn"
              icon="ic:baseline-play-arrow"
              @click="play"
            />
            <Icon
              :size="iconSize"
              v-if="playing"
              class="jessibuca-btn"
              icon="ic:baseline-pause"
              @click="pause"
            />
            <Icon :size="iconSize" icon="ic:baseline-stop" class="jessibuca-btn" @click="destroy" />
            <Icon
              :size="iconSize"
              v-if="!quieting"
              icon="ic:baseline-volume-up"
              class="jessibuca-btn"
              @click="mute"
            />
            <Icon
              :size="iconSize"
              v-if="quieting"
              icon="ic:baseline-volume-off"
              class="jessibuca-btn"
              @click="cancelMute"
            />
          </div>
          <div class="buttons-box-right">
            <span class="jessibuca-btn">{{ kbs }} kb/s</span>
            <Icon
              :size="iconSize"
              icon="ic:baseline-camera"
              class="jessibuca-btn"
              @click="screenShot"
            />
            <Icon
              v-if="!recording"
              :size="iconSize"
              icon="tabler:video"
              class="jessibuca-btn"
              @click="startRecord"
            />
            <Icon
              v-if="recording"
              :size="iconSize"
              icon="fluent-emoji-flat:stop-sign"
              class="jessibuca-btn"
              @click="stopAndSaveRecord"
            />
            <Icon
              :size="iconSize"
              v-if="!isFull"
              icon="ic:baseline-fullscreen"
              class="jessibuca-btn"
              @click="fullscreen"
            />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { Icon } from "@/components/Icon";
import { ref } from "vue";

export default {
  name: "Player",
  components: { Icon },
  props: {
    playUrl: {
      type: String,
      required: true,
    },
    hasAudio: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      jessibuca: null,
      version: "",
      wasm: false,
      vc: "ff",
      playing: false,
      quieting: true,
      loaded: false, // mute
      showOperateBtns: false,
      showBandwidth: false,
      err: "",
      speed: 0,
      performance: "",
      volume: 1,
      rotate: 0,
      useWCS: false,
      // Chromium 新版本的 MSE 路径会在部分 HTTP-FLV 流上启动后立即断开。
      // 默认使用 Jessibuca 的 WASM 解码路径，兼容性更稳定。
      useMSE: false,
      useOffscreen: false,
      recording: false,
      recordType: "mp4",
      scale: 0,
      iconSize: 16,
      showToolBtnTimer: 0,
      showToolBtn: false,
      kbs: 0,
      isFull: false,
      easyPlayer: null,
      playerId: `easyaiot-player-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    };
  },
  mounted() {
    this.create();
    // 首次挂载时 playUrl 已经存在不会触发 watch，等播放器容器完成渲染后主动启动播放。
    this.$nextTick(() => this.play());
    window.onerror = (msg) => (this.err = msg);
  },
  watch: {
    playUrl() {
      if (this.playUrl) {
        this.play();
      }
    },
  },
  async unmounted() {
    await this.destroyPlayer();
  },
  methods: {
    isHttpFlvUrl(url) {
      return /\/(live|ai)\/.+\.flv($|\?)/i.test(url || "");
    },
    useEasyWasmPlayer() {
      return this.isHttpFlvUrl(this.normalizedPlayUrl()) && window.WasmPlayer;
    },
    destroyEasyPlayer() {
      if (this.easyPlayer) {
        this.easyPlayer.destroy();
        this.easyPlayer = null;
      }
    },
    async destroyJessibuca() {
      if (this.jessibuca) {
        await this.jessibuca.destroy();
        this.jessibuca = null;
      }
    },
    async destroyPlayer() {
      this.destroyEasyPlayer();
      await this.destroyJessibuca();
      this.playing = false;
    },
    create(options) {
      if (this.useEasyWasmPlayer()) {
        return;
      }
      options = options || {};
      this.jessibuca = new window.Jessibuca(
        Object.assign(
          {
            container: this.$refs.container,
            decoder: "/static/js/jessibuca/decoder.js",
            videoBuffer: 0.2, // 缓存时长
            // 等比放大并裁切溢出区域，让画面填满播放器且不产生黑边。
            isResize: true,
            isFullResize: true,
            useWCS: this.useWCS,
            useMSE: this.useMSE,
            text: "",
            // background: "bg.jpg",
            loadingText: "疯狂加载中...",
            // 首页需要自动播放。浏览器只允许静音自动播放，是否输出声音必须由调用方决定。
            hasAudio: this.hasAudio,
            debug: false,
            supportDblclickFullscreen: true,
            showBandwidth: this.showBandwidth, // 显示网速
            operateBtns: {
              fullscreen: this.showOperateBtns,
              screenshot: this.showOperateBtns,
              play: this.showOperateBtns,
              audio: this.showOperateBtns,
            },
            vod: this.vod,
            forceNoOffscreen: !this.useOffscreen,
            isNotMute: this.hasAudio,
            timeout: 10,
          },
          options,
        ),
      );
      var _this = this;
      this.jessibuca.on("load", function () {
        console.log("on load");
      });
      this.jessibuca.on("log", function (msg) {
        console.log("on log", msg);
      });
      this.jessibuca.on("record", function (msg) {
        console.log("on record:", msg);
      });
      this.jessibuca.on("pause", function () {
        console.log("on pause");
        _this.playing = false;
      });
      this.jessibuca.on("play", function () {
        console.log("on play");
        _this.playing = true;
      });
      this.jessibuca.on("fullscreen", function (msg) {
        console.log("on fullscreen", msg);
      });
      this.jessibuca.on("mute", function (msg) {
        console.log("on mute", msg);
        _this.quieting = msg;
      });
      this.jessibuca.on("mute", function (msg) {
        console.log("on mute2", msg);
      });
      this.jessibuca.on("audioInfo", function (msg) {
        console.log("audioInfo", msg);
      });
      // this.jessibuca.on("bps", function (bps) {
      //   // console.log('bps', bps);
      // });
      // let _ts = 0;
      // this.jessibuca.on("timeUpdate", function (ts) {
      //     console.log('timeUpdate,old,new,timestamp', _ts, ts, ts - _ts);
      //     _ts = ts;
      // });
      this.jessibuca.on("videoInfo", function (info) {
        console.log("videoInfo", info);
        // 视频尺寸可用后再次应用 cover 模式。
        _this.jessibuca.setScaleMode(2);
      });
      this.jessibuca.on("error", function (error) {
        console.log("error", error);
      });
      this.jessibuca.on("timeout", function () {
        console.log("timeout");
      });
      this.jessibuca.on("start", function () {
        console.log("frame start");
      });
      this.jessibuca.on("performance", function (performance) {
        var show = "卡顿";
        if (performance === 2) {
          show = "非常流畅";
        } else if (performance === 1) {
          show = "流畅";
        }
        _this.performance = show;
      });
      this.jessibuca.on("buffer", function (buffer) {
        console.log("buffer", buffer);
      });
      this.jessibuca.on("stats", function (stats) {
        console.log("stats", stats);
      });
      this.jessibuca.on("kBps", function (kBps) {
        _this.kbs = Math.round(kBps);
      });
      this.jessibuca.on("play", () => {
        this.playing = true;
        this.loaded = true;
        this.quieting = this.jessibuca.isMute();
      });
      this.jessibuca.on("recordingTimestamp", (ts) => {
        console.log("recordingTimestamp", ts);
      });
      // console.log(this.jessibuca);
    },
    normalizedPlayUrl() {
      if (!this.playUrl) {
        return "";
      }

      if (this.playUrl.startsWith("/live/") || this.playUrl.startsWith("/ai/")) {
        return `${window.location.origin}${this.playUrl}`;
      }

      return this.playUrl;
    },
    play() {
      // this.jessibuca.onPlay = () => (this.playing = true);

      const playUrl = this.normalizedPlayUrl();
      if (playUrl) {
        if (this.useEasyWasmPlayer()) {
          this.playEasyPlayer(playUrl);
          return;
        }

        if (!this.jessibuca) {
          this.create();
        }
        this.jessibuca.play(playUrl);
      }
    },
    playEasyPlayer(playUrl) {
      this.destroyEasyPlayer();
      if (this.jessibuca) {
        this.destroyJessibuca();
      }
      this.easyPlayer = new window.WasmPlayer(null, this.playerId, this.easyPlayerEvent, {
        Height: false,
      });
      this.easyPlayer.play(playUrl, this.hasAudio ? 0 : 1);
      this.playing = true;
      this.loaded = true;
      this.quieting = !this.hasAudio;
    },
    easyPlayerEvent(type, message) {
      if (type === "error") {
        console.log("easyPlayer error", message);
        this.playing = false;
      }
    },
    mute() {
      if (this.easyPlayer) {
        this.quieting = true;
        return;
      }
      this.jessibuca.mute();
    },
    cancelMute() {
      if (this.easyPlayer) {
        this.quieting = false;
        return;
      }
      this.jessibuca.cancelMute();
    },
    pause() {
      if (this.easyPlayer) {
        this.destroyEasyPlayer();
        this.playing = false;
        return;
      }
      this.jessibuca.pause();
      this.playing = false;
      this.err = "";
      this.performance = "";
    },
    volumeChange() {
      this.jessibuca.setVolume(this.volume);
    },
    rotateChange() {
      this.jessibuca.setRotate(this.rotate);
    },
    async destroy() {
      await this.destroyPlayer();
      this.create();
      this.playing = false;
      this.loaded = false;
      this.performance = "";
    },
    fullscreen() {
      if (this.easyPlayer) {
        this.$refs.container?.requestFullscreen?.();
        return;
      }
      this.jessibuca.setFullscreen(true);
    },
    clearView() {
      if (!this.jessibuca) {
        return;
      }
      this.jessibuca.clearView();
    },
    startRecord() {
      if (!this.jessibuca) {
        return;
      }
      this.recording = !this.recording;
      const time = new Date().getTime();
      this.jessibuca.startRecord(time, this.recordType);
    },
    stopAndSaveRecord() {
      if (!this.jessibuca) {
        return;
      }
      this.recording = !this.recording;
      this.jessibuca.stopRecordAndSave();
    },
    screenShot() {
      if (!this.jessibuca) {
        return;
      }
      this.jessibuca.screenshot();
    },
    mouseenter() {
      this.showToolBtn = true;
      if (this.showToolBtnTimer) {
        window.clearTimeout(this.showToolBtnTimer);
      }
      this.showToolBtnTimer = window.setTimeout(() => {
        this.showToolBtn = false;
      }, 4000);
    },
    keepShowTool() {
      console.log("keepShowToolkeepShowToolkeepShowTool");
      this.showToolBtn = true;
      window.clearTimeout(this.showToolBtnTimer);
    },
    isFullscreen() {
      return document.fullscreenElement || false;
    },
    async restartPlay(type) {
      if (type === "mse") {
        this.useWCS = false;
        this.useOffscreen = false;
      } else if (type === "wcs") {
        this.useMSE = false;
      } else if (type === "offscreen") {
        this.useMSE = false;
      }
      await this.destroy();
      setTimeout(() => {
        this.play();
      }, 100);
    },
    changeBuffer() {
      if (!this.jessibuca) {
        return;
      }
      this.jessibuca.setBufferTime(Number(0.2));
    },
    scaleChange() {
      if (!this.jessibuca) {
        return;
      }
      this.jessibuca.setScaleMode(this.scale);
    },
  },
};
</script>

<style>
.buttons-box {
  width: 100%;
  height: 28px;
  background-color: rgba(43, 51, 63, 0.7);
  position: absolute;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  left: 0;
  bottom: 0;
  user-select: none;
  z-index: 10;
  transition: opacity 1s ease;
}

.jessibuca-btn {
  width: 20px;
  color: rgb(255, 255, 255);
  line-height: 28px;
  margin: 0px 10px;
  padding: 0px 2px;
  cursor: pointer;
  text-align: center;
  font-size: 1rem !important;
}

.buttons-box-right {
  position: absolute;
  right: 0;
}

.toolBtn-enter-active {
  transition: all 0.1s;
  overflow: hidden;
}

.toolBtn-leave-active {
  transition: all 0.5s;
  overflow: hidden;
}

.toolBtn-enter-from,
.toolBtn-leave-to {
  height: 0px !important;
  opacity: 0;
}

.player-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.player-container video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}

.player-container.easy-wasm-active canvas {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}
</style>
