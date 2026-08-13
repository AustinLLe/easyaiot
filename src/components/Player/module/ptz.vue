<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Slider } from 'ant-design-vue'
import { type PtzMoveCommand, createPtzCommandController } from './ptzControl'
import { Icon } from '@/components/Icon'

const emit = defineEmits(['ptzCamera'])
const speed = ref<number>(30)
const controller = createPtzCommandController((command, commandSpeed) => {
  emit('ptzCamera', command, commandSpeed)
})

function startMovement(command: PtzMoveCommand) {
  controller.start(command, speed.value)
}

const stopMovement = () => controller.stop()

onMounted(() => {
  window.addEventListener('blur', stopMovement)
  window.addEventListener('pointerup', stopMovement)
})

onUnmounted(() => {
  stopMovement()
  window.removeEventListener('blur', stopMovement)
  window.removeEventListener('pointerup', stopMovement)
})

defineExpose({ stopMovement })
</script>

<template>
  <div class="ptz-wrapper" style="display: flex; justify-content: space-around;">
    <div class="control-wrapper">
      <button
        class="control-btn control-top" type="button" aria-label="向上移动"
        @pointerdown.prevent="startMovement('UP')" @pointerup="stopMovement"
        @pointerleave="stopMovement" @pointercancel="stopMovement"
      >
        <Icon icon="material-symbols:arrows-more-up-rounded" />
        <div class="control-inner-btn control-inner" />
      </button>
      <button
        class="control-btn control-left" type="button" aria-label="向左移动"
        @pointerdown.prevent="startMovement('LEFT')" @pointerup="stopMovement"
        @pointerleave="stopMovement" @pointercancel="stopMovement"
      >
        <Icon icon="material-symbols:arrows-more-down" />
        <div class="control-inner-btn control-inner" />
      </button>
      <button
        class="control-btn control-bottom" type="button" aria-label="向下移动"
        @pointerdown.prevent="startMovement('DOWN')" @pointerup="stopMovement"
        @pointerleave="stopMovement" @pointercancel="stopMovement"
      >
        <Icon icon="material-symbols:arrows-more-up-rounded" />
        <div class="control-inner-btn control-inner" />
      </button>
      <button
        class="control-btn control-right" type="button" aria-label="向右移动"
        @pointerdown.prevent="startMovement('RIGHT')" @pointerup="stopMovement"
        @pointerleave="stopMovement" @pointercancel="stopMovement"
      >
        <Icon icon="material-symbols:arrows-more-up-rounded" />
        <div class="control-inner-btn control-inner" />
      </button>
      <button class="control-round" type="button" aria-label="停止移动" @click="stopMovement">
        <div class="control-round-inner">
          <Icon icon="material-symbols:pause-circle" />
        </div>
      </button>
      <button
        class="zoom-control zoom-in" type="button" aria-label="放大"
        @pointerdown.prevent="startMovement('ZOOM_IN')" @pointerup="stopMovement"
        @pointerleave="stopMovement" @pointercancel="stopMovement"
      >
        <i class="el-icon-zoom-in control-zoom-btn" />
      </button>
      <button
        class="zoom-control zoom-out" type="button" aria-label="缩小"
        @pointerdown.prevent="startMovement('ZOOM_OUT')" @pointerup="stopMovement"
        @pointerleave="stopMovement" @pointercancel="stopMovement"
      >
        <i class="el-icon-zoom-out control-zoom-btn" />
      </button>
      <div class="contro-speed" style="position: absolute; top: 7rem; left: 4px; width: 9rem;">
        <Slider v-model:value="speed" :min="1" :max="255" aria-label="云台速度" />
      </div>
    </div>
  </div>
</template>

<style>
.ptz-wrapper {

  .control-wrapper {
    position: relative;
    float: left;
    width: 6.25rem;
    max-width: 6.25rem;
    height: 6.25rem;
    max-height: 6.25rem;
    margin: 1.5rem;
    border-radius: 100%;

    .control-top {
      top: -8%;
      left: 27%;
      border-radius: 5px 100% 5px 0;
      transform: rotate(-45deg);

      & i {
        border-radius: 5px 100% 5px 0;
        transform: rotate(45deg);
      }

      & .control-inner {
        bottom: 0;
        left: -1px;
        border-top: 1px solid #78aee4;
        border-right: 1px solid #78aee4;
        border-radius: 0 100% 0 0;
      }

      .control-inner-btn {
        position: absolute;
        width: 60%;
        height: 60%;
        background: #fafafa;
      }

      & svg {
        width: 22px;
        height: 22px;
        color: #78aee4;
      }
    }

    .control-left {
      top: 27%;
      left: -8%;
      border-radius: 5px 0 5px 100%;
      transform: rotate(45deg);

      & .control-inner {
        top: -1px;
        right: -1px;
        border-bottom: 1px solid #78aee4;
        border-left: 1px solid #78aee4;
        border-radius: 0 0 0 100%;
      }

      .control-inner-btn {
        position: absolute;
        width: 60%;
        height: 60%;
        background: #fafafa;
      }

      & svg {
        width: 22px;
        height: 22px;
        color: #78aee4;
      }
    }

    .control-bottom {
      bottom: -8%;
      left: 27%;
      border-radius: 0 5px 100%;
      transform: rotate(45deg);

      & span {
        transform: rotate(90deg);
      }

      & i {
        transform: rotate(-45deg);
      }

      & .control-inner {
        top: -1px;
        left: -1px;
        border-right: 1px solid #78aee4;
        border-bottom: 1px solid #78aee4;
        border-radius: 0 0 100%;
      }

      .control-inner-btn {
        position: absolute;
        width: 60%;
        height: 60%;
        background: #fafafa;
      }

      & svg {
        width: 22px;
        height: 22px;
        color: #78aee4;
      }
    }

    .control-right {
      top: 27%;
      right: -8%;
      border-radius: 5px 100% 5px 0;
      transform: rotate(45deg);

      & i {
        transform: rotate(-45deg);
      }

      & .control-inner {
        bottom: -1px;
        left: -1px;
        border-top: 1px solid #78aee4;
        border-right: 1px solid #78aee4;
        border-radius: 0 100% 0 0;
      }

      .control-inner-btn {
        position: absolute;
        width: 60%;
        height: 60%;
        background: #fafafa;
      }

      & svg {
        width: 22px;
        height: 22px;
        color: #78aee4;
      }
    }

    .control-round {
      position: absolute;
      top: 21%;
      left: 21%;
      width: 58%;
      height: 58%;
      padding: 0;
      cursor: pointer;
      background: #fff;
      border: 0;
      border-radius: 100%;

      .control-round-inner {
        position: absolute;
        top: 13%;
        left: 13%;
        display: -webkit-box;
        display: flexbox;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 70%;
        height: 70%;
        font-size: 2.5rem;
        color: #78aee4;
        border: 1px solid #78aee4;
        border-radius: 100%;
        transition: all 0.3s linear;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        -webkit-box-align: center;
        -ms-flex-align: center;

        & svg {
          width: 40px;
          height: 40px;
        }
      }

      .fa {
        display: inline-block;
        font: normal normal normal 14px / 1 FontAwesome, sans-serif;
        font-size: inherit;
        text-rendering: auto;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    }

    .control-btn {
      position: absolute;
      box-sizing: border-box;
      display: -webkit-box;
      display: flexbox;
      display: flex;
      justify-content: center;
      width: 44%;
      height: 44%;
      padding: 0;
      cursor: pointer;
      background: #fff;
      border: 1px solid #78aee4;
      border-radius: 5px;
      transition: all 0.3s linear;
      -webkit-box-pack: center;
      -ms-flex-pack: center;

      & i {
        display: -webkit-box;
        display: flexbox;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        color: #78aee4;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
      }
    }
  }

  .zoom-control {
    position: absolute;
    left: 7.25rem;
    padding: 0;
    font-size: 1.875rem;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .zoom-in {
    top: 1.25rem;
  }

  .zoom-out {
    top: 3.25rem;
  }

  .control-panel {
    position: relative;
    top: 0;
    left: 5rem;
    height: 11rem;
    max-height: 11rem;

    .el-button-group {
      display: inline-block;
      vertical-align: middle;

      &::before {
        display: table;
      }

      .el-tag--medium {
        height: 28px;
        line-height: 26px;
      }

      .el-tag {
        box-sizing: border-box;
        height: 32px;
        padding: 0 10px;
        font-size: 0.75rem;
        line-height: 30px;
        color: #409EFF;
        white-space: nowrap;
        background-color: #ecf5ff;
        border-color: #d9ecff;
        border-style: solid;
        border-width: 1px;
        border-radius: 4px;
      }

      .el-input-number--mini {
        width: 130px;
        line-height: 26px;

        .el-input-number__decrease, .el-input-number--mini .el-input-number__increase {
          width: 28px;
          font-size: 0.75rem;
        }

        .el-input-number__decrease.is-disabled, .el-input-number__increase.is-disabled {
          color: #C0C4CC;
          cursor: not-allowed;
        }

        .el-input-number__decrease {
          left: 1px;
          border-right: 1px solid #DCDFE6;
          border-radius: 4px 0 0 4px;
        }

        .el-input-number__decrease, .el-input-number__increase {
          position: absolute;
          top: 1px;
          z-index: 1;
          width: 40px;
          height: auto;
          font-size: 0.8125rem;
          color: #606266;
          text-align: center;
          cursor: pointer;
          background: #F5F7FA;
        }
      }

      .el-input-number {
        position: relative;
        display: inline-block;
        width: 180px;
        line-height: 38px;

        &.is-controls-right .el-input-number__decrease {
          inset: auto 1px 1px auto;
          border-right: none;
          border-left: 1px solid #DCDFE6;
          border-radius: 0 0 4px;
        }

        &.is-controls-right .el-input-number__increase {
          border-bottom: 1px solid #DCDFE6;
          border-radius: 0 4px 0 0;
        }

        &.is-controls-right .el-input__inner {
          padding-right: 50px;
          padding-left: 15px;
        }

        .el-input {
          display: block;

          .el-input__inner {
            box-sizing: border-box;
            display: inline-block;
            width: 100%;
            height: 32px;
            padding: 0 15px;
            line-height: 32px;
            color: #606266;
            appearance: none;
            background-color: #FFF;
            background-image: none;
            border: 1px solid #DCDFE6;
            border-radius: 4px;
            outline: 0;
            transition: border-color .2s cubic-bezier(.645, .045, .355, 1);
          }
        }

        .el-input--mini {
          font-size: 0.75rem;
        }
      }

      & > .el-button:not(:first-child):not(:last-child) {
        border-radius: 0;
      }

      & > .el-button:not(:last-child), .el-tabs--left .el-tabs__nav-wrap.is-left {
        margin-right: -1px;
      }

      & > .el-button {
        position: relative;
        float: left;
      }

      .el-button--mini {
        font-size: 0.75rem;
        border-radius: 3px;
      }

      .el-button--mini, .el-button--mini.is-round {
        padding: 7px 15px;
      }

      .el-button {
        box-sizing: border-box;
        display: inline-block;
        padding: 12px 20px;
        margin: 0;
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1;
        color: #606266;
        text-align: center;
        white-space: nowrap;
        appearance: none;
        cursor: pointer;
        background: #FFF;
        border: 1px solid #DCDFE6;
        border-radius: 4px;
        outline: 0;
        transition: .1s;

        [class*="el-icon-"] + span {
          margin-left: 5px;
        }
      }
    }
  }
}
</style>
