# 构建阶段
FROM m.daocloud.io/docker.io/library/node:22-alpine3.21 AS builder

# 配置npm国内镜像源（淘宝镜像 - npmmirror.com是淘宝镜像的新地址）
RUN npm config set registry https://registry.npmmirror.com/

# 安装pnpm
RUN npm install -g pnpm@9.0.4

# 配置pnpm国内镜像源（淘宝镜像）
RUN pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm config set network-timeout 600000 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000

# 设置工作目录
WORKDIR /app

# 构建日志目录（用于排查前端依赖安装与打包问题）
RUN mkdir -p /tmp/web-build-logs

# 复制package文件和锁定文件（如果存在，提高安装可靠性）
COPY package.json ./
COPY pnpm-lock.yaml* ./

# 安装依赖（如果存在锁定文件则使用，否则重新生成）
RUN if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile 2>&1 | tee /tmp/web-build-logs/pnpm-install.log; \
    else \
        pnpm install 2>&1 | tee /tmp/web-build-logs/pnpm-install.log; \
    fi

# 复制源代码
COPY . .

# Vite 只自动加载 .env*；仓库使用 env.production，构建前同步一份供 import.meta.env 注入
RUN if [ -f env.production ] && [ ! -f .env.production ]; then cp env.production .env.production; fi

# 构建项目（pipefail 确保构建失败时中断；日志输出到文件便于排查）
RUN set -o pipefail && \
    pnpm build 2>&1 | tee /tmp/web-build-logs/pnpm-build.log && \
    test -f /app/dist/index.html

# 生产阶段
FROM m.daocloud.io/docker.io/library/nginx:1.29.2-alpine

# 配置国内镜像源（如果需要安装额外软件）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 作者信息
MAINTAINER basiclab

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 创建必要的目录
RUN mkdir -p /usr/share/nginx/html /app/logs /opt/web-build-logs

# 复制nginx配置文件
COPY ./conf/nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物到nginx的html目录
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /tmp/web-build-logs /opt/web-build-logs

# 暴露端口（默认80，可通过环境变量修改）
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

# 启动 nginx：先校验配置，避免静默失败导致容器反复重启
CMD ["sh", "-c", "mkdir -p /app/logs && (cp -af /opt/web-build-logs/. /app/logs/ 2>/dev/null || true) && nginx -t && exec nginx -g 'daemon off;'"]
