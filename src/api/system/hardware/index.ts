import { defHttp } from '@/utils/http/axios'

export interface PercentMetric {
  percent: number
}

export interface LoadMetric extends PercentMetric {
  oneMinute: number
  fiveMinutes: number
  fifteenMinutes: number
}

export interface CpuMetric extends PercentMetric {
  cores: number
}

export interface CapacityMetric extends PercentMetric {
  usedBytes: number
  totalBytes: number
  usedGiB: number
  totalGiB: number
}

export interface DiskMetric extends CapacityMetric {
  label: string
  path: string
}

export interface HardwareStatus {
  sampledAt: string
  load: LoadMetric
  cpu: CpuMetric
  memory: CapacityMetric
  rootDisk: DiskMetric
  dataDisk: DiskMetric
}

export function getHardwareStatus() {
  return defHttp.get<HardwareStatus>({ url: '/video/system/status' })
}
