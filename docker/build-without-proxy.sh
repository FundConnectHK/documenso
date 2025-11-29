#!/usr/bin/env bash

# 临时禁用代理构建脚本
# 使用方法: ./docker/build-without-proxy.sh

command -v docker >/dev/null 2>&1 || {
    echo "Docker is not running. Please start Docker and try again."
    exit 1
}

SCRIPT_DIR="$(readlink -f "$(dirname "$0")")"
MONOREPO_ROOT="$(readlink -f "$SCRIPT_DIR/../")"

# Get Git information
APP_VERSION="$(git name-rev --tags --name-only $(git rev-parse HEAD) | head -n 1 | sed 's/\^0//')"
GIT_SHA="$(git rev-parse HEAD)"

echo "Building docker image for monorepo at $MONOREPO_ROOT"
echo "App version: $APP_VERSION"
echo "Git SHA: $GIT_SHA"

# 临时禁用代理并构建
echo "提示: 正在尝试不使用代理构建镜像..."

# 使用环境变量禁用代理
NO_PROXY="*" http_proxy="" https_proxy="" HTTP_PROXY="" HTTPS_PROXY="" \
docker build -f "$SCRIPT_DIR/Dockerfile" \
    --progress=plain \
    -t "fundconnecthk-base" \
    "$MONOREPO_ROOT"

if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查网络连接或代理设置"
    exit 1
fi

# Handle repository tagging
if [ ! -z "$DOCKER_REPOSITORY" ]; then
    echo "Using custom repository: $DOCKER_REPOSITORY"
    
    docker tag "fundconnecthk-base" "$DOCKER_REPOSITORY:latest"
    docker tag "fundconnecthk-base" "$DOCKER_REPOSITORY:$GIT_SHA"

    if [ ! -z "$APP_VERSION" ] && [ "$APP_VERSION" != "undefined" ]; then
        docker tag "fundconnecthk-base" "$DOCKER_REPOSITORY:$APP_VERSION"
    fi
else
    echo "Using default repository: fundconnecthk"
    
    docker tag "fundconnecthk-base" "fundconnecthk:latest"
    docker tag "fundconnecthk-base" "fundconnecthk:$GIT_SHA"

    if [ ! -z "$APP_VERSION" ] && [ "$APP_VERSION" != "undefined" ]; then
        docker tag "fundconnecthk-base" "fundconnecthk:$APP_VERSION"
    fi
fi

# Remove the temporary base tag
docker rmi "fundconnecthk-base" 2>/dev/null

echo "✅ 构建完成!"


