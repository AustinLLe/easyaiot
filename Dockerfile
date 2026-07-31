# 构建阶段 - WEB 正式站
FROM m.daocloud.io/docker.io/library/node:22-alpine3.21 AS builder-web

RUN npm config set registry https://registry.npmmirror.com/
RUN npm install -g pnpm@9.0.4
RUN pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm config set network-timeout 600000 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000

WORKDIR /app
RUN mkdir -p /tmp/web-build-logs

COPY WEB/package.json WEB/pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile 2>&1 | tee /tmp/web-build-logs/pnpm-install.log; \
    else \
        pnpm install 2>&1 | tee /tmp/web-build-logs/pnpm-install.log; \
    fi

COPY WEB/ .
RUN if [ -f env.production ] && [ ! -f .env.production ]; then cp env.production .env.production; fi
RUN set -o pipefail && \
    pnpm build 2>&1 | tee /tmp/web-build-logs/pnpm-build.log && \
    test -f /app/dist/index.html

# 构建阶段 - WEB-test 测试站
FROM m.daocloud.io/docker.io/library/node:22-alpine3.21 AS builder-web-test

RUN npm config set registry https://registry.npmmirror.com/
RUN npm install -g pnpm@9.0.4
RUN pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm config set network-timeout 600000 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000

WORKDIR /app
RUN mkdir -p /tmp/web-test-build-logs

COPY WEB-test/package.json WEB-test/pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile 2>&1 | tee /tmp/web-test-build-logs/pnpm-install.log; \
    else \
        pnpm install 2>&1 | tee /tmp/web-test-build-logs/pnpm-install.log; \
    fi

COPY WEB-test/ .
RUN if [ -f env.production ] && [ ! -f .env.production ]; then cp env.production .env.production; fi
RUN set -o pipefail && \
    pnpm build 2>&1 | tee /tmp/web-test-build-logs/pnpm-build.log && \
    test -f /app/dist/index.html

# 生产阶段
FROM m.daocloud.io/docker.io/library/nginx:1.29.2-alpine

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

MAINTAINER basiclab

WORKDIR /usr/share/nginx/html

RUN mkdir -p /usr/share/nginx/html /usr/share/nginx/html-test /app/logs /opt/web-build-logs

COPY WEB/conf/nginx.conf /etc/nginx/nginx.conf
COPY WEB/conf/easyaiot-proxy.conf /etc/nginx/conf.d/easyaiot-proxy.conf

COPY --from=builder-web /app/dist /usr/share/nginx/html
COPY --from=builder-web-test /app/dist /usr/share/nginx/html-test
COPY --from=builder-web /tmp/web-build-logs /opt/web-build-logs
COPY --from=builder-web-test /tmp/web-test-build-logs /opt/web-test-build-logs

EXPOSE 80 81

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["sh", "-c", "mkdir -p /app/logs && (cp -af /opt/web-build-logs/. /app/logs/ 2>/dev/null || true) && (cp -af /opt/web-test-build-logs/. /app/logs/ 2>/dev/null || true) && nginx -t && exec nginx -g 'daemon off;'"]
