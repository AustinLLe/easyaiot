<script lang="ts" setup>
defineOptions({ name: 'SystemPlatformProtection' })

interface ProtectionItem {
  key: string
  title: string
  description: string
  enabled: boolean
  state: 'active' | 'deferred'
  scope: string
}

const protections: ProtectionItem[] = [
  {
    key: 'ai-auth',
    title: 'AI 接口统一鉴权',
    description:
      '模型、推理任务、部署服务等 AI 业务接口必须携带主系统有效会话；校验服务不可用时拒绝访问。',
    enabled: true,
    state: 'active',
    scope: '/dev-api/ai/**',
  },
  {
    key: 'developer-stream-auth',
    title: '开发推流管理登录保护',
    description:
      '22300 管理页与流管理 API 使用双账号 HTTP Basic 登录；健康检查保持匿名，便于服务监控。',
    enabled: true,
    state: 'active',
    scope: ':22300 / 与 /api/streams/**',
  },
  {
    key: 'https',
    title: 'HTTPS 入口',
    description: '当前没有可用证书，本轮按管理员决定暂缓；HTTP 22333 与 RTSP 22400 均保持原状。',
    enabled: false,
    state: 'deferred',
    scope: '正式 WEB 入口',
  },
  {
    key: 'secret-rotation',
    title: '历史配置秘密轮换',
    description:
      '仓库为私有仓库，本轮按管理员决定暂缓；后续如扩大共享范围，应先完成密钥迁移和轮换。',
    enabled: false,
    state: 'deferred',
    scope: 'Git 与生产环境配置',
  },
]

const ports = [
  {
    port: '1880',
    service: 'Node-RED',
    necessity: '宿主机公网监听非必需',
    action: '后续可取消宿主机映射；容器网络内访问即可',
  },
  {
    port: '1985',
    service: 'SRS API',
    necessity: '内部必需',
    action: '供 SRS 回调与受控状态查询使用，应仅允许本机和 Docker 网络',
  },
  {
    port: '5000',
    service: 'AI',
    necessity: '内部必需',
    action: 'WEB 代理需要访问，应仅允许本机和 Docker 网络',
  },
  {
    port: '5432',
    service: 'PostgreSQL',
    necessity: '内部必需',
    action: '供主机网络服务与业务容器访问，不需要公网放行',
  },
  {
    port: '6000',
    service: 'VIDEO',
    necessity: '内部必需',
    action: 'WEB 代理与 SRS 回调需要，不需要公网放行',
  },
  {
    port: '6379',
    service: 'Redis',
    necessity: '内部必需',
    action: '会话和缓存依赖，不需要公网放行',
  },
  {
    port: '8080',
    service: 'SRS HTTP-FLV',
    necessity: '内部必需',
    action: 'WEB /live/ 与 /ai/ 代理需要，不需要公网放行',
  },
  {
    port: '48080',
    service: 'DEVICE 网关',
    necessity: '内部必需',
    action: 'WEB /admin-api/ 与 /dev-api/ 代理需要',
  },
  {
    port: '48099',
    service: 'DEVICE 认证服务',
    necessity: '内部必需',
    action: 'AI/VIDEO 会话校验直接使用，不需要公网放行',
  },
]

const changes = [
  {
    time: '2026-08-08',
    title: 'AI 匿名接口收口',
    detail: '鉴权默认开启；生产启用主系统会话校验；缺失校验地址时从跳过校验改为 503 拒绝。',
    status: '已实施',
  },
  {
    time: '2026-08-08',
    title: '22300 双账号登录',
    detail: '为 sylphira 与 admin 两个超级管理员配置独立登录；未登录和错误密码均返回 401。',
    status: '已实施',
  },
  {
    time: '2026-08-08',
    title: '内部端口必要性复核',
    detail: '确认除 Node-RED 1880 外，其余列出端口均为现有内部链路所需；腾讯云继续保持不放行。',
    status: '已评估',
  },
  {
    time: '2026-08-08',
    title: 'HTTPS 与 22400 决策',
    detail: '因无可用证书，本轮不部署 HTTPS；RTSP 22400 测试功能保持不变。',
    status: '暂缓',
  },
]
</script>

<template>
  <div class="protection-page">
    <header class="hero">
      <div>
        <div class="eyebrow">
          SYSTEM SECURITY
        </div>
        <h2>平台防护</h2>
        <p>记录平台已经实施的防线、暂缓项目与内部端口边界。当前页面仅超级管理员可见。</p>
      </div>
      <div class="hero-state">
        <span class="state-dot" />
        2 项核心防护已启用
      </div>
    </header>

    <section class="panel">
      <div class="section-title">
        <div>
          <h3>核心防护策略</h3>
          <p>安全基线由运行配置强制执行；页面中的复选框用于展示实际实施状态，不能在前端绕过。</p>
        </div>
      </div>
      <div class="protection-grid">
        <article
          v-for="item in protections"
          :key="item.key"
          class="protection-card"
          :class="item.state"
        >
          <div class="card-head">
            <a-checkbox :checked="item.enabled" disabled>
              <strong>{{ item.title }}</strong>
            </a-checkbox>
            <a-tag :color="item.state === 'active' ? 'green' : 'orange'">
              {{ item.state === "active" ? "已启用" : "暂缓" }}
            </a-tag>
          </div>
          <p>{{ item.description }}</p>
          <div class="scope">
            保护范围：{{ item.scope }}
          </div>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <div>
          <h3>内部监听端口评估</h3>
          <p>这些端口当前未被腾讯云安全组放行；“内部必需”不代表允许公网访问。</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>端口</th>
              <th>服务</th>
              <th>必要性</th>
              <th>处理意见</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in ports" :key="item.port">
              <td>
                <code>{{ item.port }}</code>
              </td>
              <td>{{ item.service }}</td>
              <td>
                <span class="necessity" :class="{ optional: item.port === '1880' }">{{
                  item.necessity
                }}</span>
              </td>
              <td>{{ item.action }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <div>
          <h3>防护变更记录</h3>
          <p>记录已执行动作和管理员明确的暂缓决定，便于后续审计与接手。</p>
        </div>
      </div>
      <div class="timeline">
        <article v-for="item in changes" :key="`${item.time}-${item.title}`" class="timeline-item">
          <div class="timeline-marker" />
          <div class="timeline-body">
            <div class="timeline-head">
              <div>
                <time>{{ item.time }}</time><strong>{{ item.title }}</strong>
              </div>
              <a-tag
                :color="
                  item.status === '已实施' ? 'green' : item.status === '已评估' ? 'blue' : 'orange'
                "
              >
                {{ item.status }}
              </a-tag>
            </div>
            <p>{{ item.detail }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style lang="less" scoped>
.protection-page {
  min-height: 100%;
  padding: 24px;
  color: #1f2937;
  background: #f4f7f5;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 32px;
  margin-bottom: 18px;
  color: #f8fafc;
  background: linear-gradient(130deg, #15392b, #1f6248 65%, #297458);
  border-radius: 16px;
  box-shadow: 0 12px 30px rgb(21 57 43 / 18%);
}

.hero h2 {
  margin: 4px 0 6px;
  font-size: 28px;
  color: #fff;
}

.hero p {
  max-width: 760px;
  margin: 0;
  color: rgb(255 255 255 / 76%);
}

.eyebrow {
  font-size: 11px;
  font-weight: 800;
  color: #91e2bc;
  letter-spacing: 0.2em;
}

.hero-state {
  display: flex;
  gap: 9px;
  align-items: center;
  padding: 10px 14px;
  font-weight: 700;
  white-space: nowrap;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 17%);
  border-radius: 999px;
}

.state-dot {
  width: 9px;
  height: 9px;
  background: #5ee69a;
  border-radius: 50%;
  box-shadow: 0 0 0 5px rgb(94 230 154 / 16%);
}

.panel {
  padding: 24px;
  margin-bottom: 18px;
  background: #fff;
  border: 1px solid #e8eeea;
  border-radius: 14px;
  box-shadow: 0 5px 18px rgb(24 39 30 / 5%);
}

.section-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
}

.section-title h3 {
  margin: 0;
  font-size: 18px;
}

.section-title p {
  margin: 5px 0 0;
  color: #758079;
}

.protection-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.protection-card {
  padding: 18px;
  background: #fbfdfc;
  border: 1px solid #e7ece9;
  border-left: 4px solid #3a9b6b;
  border-radius: 12px;
}

.protection-card.deferred {
  background: #fffdf8;
  border-left-color: #d89a35;
}

.card-head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.protection-card p {
  min-height: 44px;
  margin: 13px 0;
  line-height: 1.6;
  color: #5f6b64;
}

.scope {
  padding-top: 11px;
  font-size: 12px;
  color: #7d8881;
  border-top: 1px dashed #dce4df;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-spacing: 0;
  border-collapse: separate;
  border: 1px solid #e7ece9;
  border-radius: 10px;
}

th,
td {
  padding: 13px 15px;
  text-align: left;
  border-bottom: 1px solid #edf1ef;
}

th {
  font-size: 12px;
  color: #69756e;
  background: #f7f9f8;
}

tr:last-child td {
  border-bottom: 0;
}

code {
  padding: 3px 7px;
  color: #17663f;
  background: #eaf6ef;
  border-radius: 5px;
}

.necessity {
  font-weight: 700;
  color: #17663f;
}

.necessity.optional {
  color: #a66316;
}

.timeline {
  position: relative;
  padding-left: 6px;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 18px;
}

.timeline-item:not(:last-child)::before {
  position: absolute;
  top: 12px;
  bottom: -2px;
  left: 5px;
  width: 2px;
  content: "";
  background: #dce8e1;
}

.timeline-marker {
  z-index: 1;
  width: 12px;
  height: 12px;
  margin-top: 5px;
  background: #2e9b65;
  border: 3px solid #dff4e8;
  border-radius: 50%;
}

.timeline-body {
  padding: 15px 17px;
  background: #f8faf9;
  border: 1px solid #e9eeeb;
  border-radius: 10px;
}

.timeline-head {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
}

.timeline-head time {
  margin-right: 14px;
  color: #7a857e;
}

.timeline-body p {
  margin: 8px 0 0;
  color: #68736d;
}

@media (max-width: 860px) {
  .protection-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
    gap: 18px;
    align-items: flex-start;
  }
}

@media (max-width: 560px) {
  .protection-page {
    padding: 14px;
  }

  .hero,
  .panel {
    padding: 19px;
  }

  .timeline-head {
    align-items: flex-start;
  }
}
</style>
