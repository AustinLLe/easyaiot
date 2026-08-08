# 构建阶段 - WEB 正式站（build context: WEB/）
FROM docker.1ms.run/library/node:22-alpine3.21 AS builder

RUN npm config set registry https://registry.npmmirror.com/
RUN npm install -g pnpm@9.0.4
RUN pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm config set network-timeout 600000 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000

WORKDIR /app
RUN mkdir -p /tmp/web-build-logs

COPY package.json pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile 2>&1 | tee /tmp/web-build-logs/pnpm-install.log; \
    else \
        pnpm install 2>&1 | tee /tmp/web-build-logs/pnpm-install.log; \
    fi

COPY . .
RUN if [ -f env.production ] && [ ! -f .env.production ]; then cp env.production .env.production; fi
RUN set -o pipefail && \
    pnpm build 2>&1 | tee /tmp/web-build-logs/pnpm-build.log && \
    test -f /app/dist/index.html

# 生产阶段
FROM docker.1ms.run/library/nginx:1.29.2-alpine

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

LABEL maintainer="basiclab"

WORKDIR /usr/share/nginx/html

RUN mkdir -p /usr/share/nginx/html /app/logs /opt/web-build-logs

COPY ./conf/nginx.conf /etc/nginx/nginx.conf
COPY ./conf/easyaiot-proxy.conf /etc/nginx/conf.d/easyaiot-proxy.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /tmp/web-build-logs /opt/web-build-logs

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["sh", "-c", "mkdir -p /app/logs && (cp -af /opt/web-build-logs/. /app/logs/ 2>/dev/null || true) && nginx -t && exec nginx -g 'daemon off;'"]
