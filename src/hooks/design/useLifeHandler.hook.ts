import { CreateComponentType, CreateComponentGroupType } from '@/design/packages'
import { EventLife } from '@/enums/eventEnum'
import * as echarts from 'echarts'

// 所有图表组件集合对象
const components: { [K in string]?: any } = {}

// 项目提供的npm 包变量
export const npmPkgs = { echarts }

// 组件事件处理 hook
export const useLifeHandler = (chartConfig: CreateComponentType | CreateComponentGroupType) => {
  if (!chartConfig.events) return {}

  // 处理基础事件
  const baseEvent: { [key: string]: any } = {}
  for (const key in chartConfig.events.baseEvent) {
    const fnStr: string | undefined = (chartConfig.events.baseEvent as any)[key]
    // 动态绑定基础事件
    if (fnStr) {
      baseEvent[key] = generateBaseFunc(fnStr)
    }
  }

  // 生成生命周期事件
  const events = chartConfig.events.advancedEvents || {}
  const lifeEvents = {
    [EventLife.VNODE_BEFORE_MOUNT](e: any) {
      // 存储组件
      components[chartConfig.id] = e.component
      const fnStr = (events[EventLife.VNODE_BEFORE_MOUNT] || '').trim()
      generateFunc(fnStr, e)
    },
    [EventLife.VNODE_MOUNTED](e: any) {
      const fnStr = (events[EventLife.VNODE_MOUNTED] || '').trim()
      generateFunc(fnStr, e)
    }
  }
  return { ...baseEvent, ...lifeEvents }
}

/**
 * 基础事件不再执行配置中的脚本，避免 new Function 代码注入
 */
export function generateBaseFunc(_fnStr: string) {
  return () => {}
}

/**
 * 生命周期事件不再执行配置中的脚本
 */
function generateFunc(_fnStr: string, _e: any) {
}
