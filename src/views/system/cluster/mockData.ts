export type EdgeNodeStatus = 'online' | 'offline' | 'warning'

export interface EdgeNodeTask {
  id: string
  name: string
  taskType: string
  status: 'running' | 'stopped' | 'error'
  cameraCount: number
}

export interface EdgeNodeService {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  detail?: string
}

export interface EdgeNode {
  id: string
  name: string
  ip: string
  webPort: number
  model: string
  status: EdgeNodeStatus
  cpuPercent: number
  memoryPercent: number
  diskPercent: number
  edgeVersion: string
  runningTasks: number
  totalTasks: number
  cameraCount: number
  alertToday: number
  lastHeartbeat: string
  location?: string
  dataMode: 'local-db' | 'cloud-sync'
  tasks: EdgeNodeTask[]
  services: EdgeNodeService[]
}

export interface ClusterSummary {
  totalNodes: number
  onlineNodes: number
  offlineNodes: number
  warningNodes: number
  runningTasks: number
  totalTasks: number
  alertToday: number
}

export const MOCK_CLUSTER_SUMMARY: ClusterSummary = {
  totalNodes: 5,
  onlineNodes: 3,
  offlineNodes: 1,
  warningNodes: 1,
  runningTasks: 7,
  totalTasks: 12,
  alertToday: 46,
}

export const MOCK_EDGE_NODES: EdgeNode[] = [
  {
    id: 'node-001',
    name: 'rk3588-lab-01',
    ip: '192.168.1.101',
    webPort: 8888,
    model: 'RK3588',
    status: 'online',
    cpuPercent: 38,
    memoryPercent: 62,
    diskPercent: 41,
    edgeVersion: 'edge-1.2.0',
    runningTasks: 3,
    totalTasks: 4,
    cameraCount: 8,
    alertToday: 12,
    lastHeartbeat: '2026-08-04 20:18:02',
    location: '实验室 A 区',
    dataMode: 'local-db',
    tasks: [
      { id: 't1', name: '安全帽检测-入口', taskType: 'realtime', status: 'running', cameraCount: 2 },
      { id: 't2', name: '占道识别-通道1', taskType: 'realtime', status: 'running', cameraCount: 1 },
      { id: 't3', name: '夜间轮巡', taskType: 'patrol', status: 'running', cameraCount: 5 },
      { id: 't4', name: '烟雾检测', taskType: 'realtime', status: 'stopped', cameraCount: 0 },
    ],
    services: [
      { name: 'VIDEO', status: 'healthy' },
      { name: 'AI', status: 'healthy' },
      { name: 'SRS', status: 'healthy' },
      { name: 'DEVICE', status: 'healthy' },
    ],
  },
  {
    id: 'node-002',
    name: 'rk3588-lab-02',
    ip: '192.168.1.102',
    webPort: 8888,
    model: 'RK3588',
    status: 'online',
    cpuPercent: 71,
    memoryPercent: 78,
    diskPercent: 55,
    edgeVersion: 'edge-1.2.0',
    runningTasks: 2,
    totalTasks: 3,
    cameraCount: 5,
    alertToday: 18,
    lastHeartbeat: '2026-08-04 20:17:55',
    location: '实验室 B 区',
    dataMode: 'local-db',
    tasks: [
      { id: 't5', name: '违停检测', taskType: 'realtime', status: 'running', cameraCount: 3 },
      { id: 't6', name: '人员聚集', taskType: 'realtime', status: 'running', cameraCount: 2 },
      { id: 't7', name: '消防通道', taskType: 'realtime', status: 'stopped', cameraCount: 0 },
    ],
    services: [
      { name: 'VIDEO', status: 'healthy' },
      { name: 'AI', status: 'degraded', detail: 'GPU 负载偏高' },
      { name: 'SRS', status: 'healthy' },
      { name: 'DEVICE', status: 'healthy' },
    ],
  },
  {
    id: 'node-003',
    name: 'rk3588-field-01',
    ip: '10.0.12.31',
    webPort: 8888,
    model: 'RK3588',
    status: 'warning',
    cpuPercent: 88,
    memoryPercent: 91,
    diskPercent: 83,
    edgeVersion: 'edge-1.1.8',
    runningTasks: 1,
    totalTasks: 2,
    cameraCount: 3,
    alertToday: 9,
    lastHeartbeat: '2026-08-04 20:16:40',
    location: '现场演示柜',
    dataMode: 'local-db',
    tasks: [
      { id: 't8', name: '头盔检测', taskType: 'realtime', status: 'running', cameraCount: 2 },
      { id: 't9', name: '区域入侵', taskType: 'realtime', status: 'error', cameraCount: 1 },
    ],
    services: [
      { name: 'VIDEO', status: 'healthy' },
      { name: 'AI', status: 'degraded', detail: '1 个任务异常' },
      { name: 'SRS', status: 'healthy' },
      { name: 'DEVICE', status: 'healthy' },
    ],
  },
  {
    id: 'node-004',
    name: 'rk3588-field-02',
    ip: '10.0.12.32',
    webPort: 8888,
    model: 'RK3588',
    status: 'online',
    cpuPercent: 22,
    memoryPercent: 44,
    diskPercent: 29,
    edgeVersion: 'edge-1.2.0',
    runningTasks: 1,
    totalTasks: 1,
    cameraCount: 2,
    alertToday: 4,
    lastHeartbeat: '2026-08-04 20:18:00',
    location: '现场演示柜',
    dataMode: 'cloud-sync',
    tasks: [
      { id: 't10', name: '占道识别', taskType: 'realtime', status: 'running', cameraCount: 2 },
    ],
    services: [
      { name: 'VIDEO', status: 'healthy' },
      { name: 'AI', status: 'healthy' },
      { name: 'SRS', status: 'healthy' },
      { name: 'DEVICE', status: 'healthy' },
    ],
  },
  {
    id: 'node-005',
    name: 'rk3588-spare',
    ip: '192.168.1.150',
    webPort: 8888,
    model: 'RK3588',
    status: 'offline',
    cpuPercent: 0,
    memoryPercent: 0,
    diskPercent: 0,
    edgeVersion: 'edge-1.1.5',
    runningTasks: 0,
    totalTasks: 2,
    cameraCount: 0,
    alertToday: 0,
    lastHeartbeat: '2026-08-04 18:02:11',
    location: '备机架',
    dataMode: 'local-db',
    tasks: [
      { id: 't11', name: '测试任务 A', taskType: 'realtime', status: 'stopped', cameraCount: 0 },
      { id: 't12', name: '测试任务 B', taskType: 'patrol', status: 'stopped', cameraCount: 0 },
    ],
    services: [
      { name: 'VIDEO', status: 'down', detail: '节点离线' },
      { name: 'AI', status: 'down', detail: '节点离线' },
      { name: 'SRS', status: 'down', detail: '节点离线' },
      { name: 'DEVICE', status: 'down', detail: '节点离线' },
    ],
  },
]

export function formatRelativeHeartbeat(value: string) {
  const parsed = new Date(value.replaceAll('-', '/'))
  const diffMs = Date.now() - parsed.getTime()
  if (Number.isNaN(diffMs))
    return value
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1)
    return '刚刚'
  if (minutes < 60)
    return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}
