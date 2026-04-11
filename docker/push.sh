#!/usr/bin/env bash

# 推送到 Docker Hub 的脚本
# 使用方法: DOCKER_USERNAME=yourusername ./docker/push.sh

if [ -z "$DOCKER_USERNAME" ]; then
    echo "错误: 请设置 DOCKER_USERNAME 环境变量"
    echo "使用方法: DOCKER_USERNAME=yourusername ./docker/push.sh"
    exit 1
fi

REPOSITORY="$DOCKER_USERNAME/fundconnecthk"

echo "准备推送镜像到 Docker Hub: $REPOSITORY"
echo "提示: 如果推送失败，请先运行 'docker login'"

# 获取 Git 信息
GIT_SHA="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
APP_VERSION="$(git name-rev --tags --name-only $(git rev-parse HEAD 2>/dev/null) 2>/dev/null | head -n 1 | sed 's/\^0//')"

echo "Git SHA: $GIT_SHA"
if [ ! -z "$APP_VERSION" ] && [ "$APP_VERSION" != "undefined" ]; then
    echo "App version: $APP_VERSION"
fi

# 标记镜像
echo "标记镜像..."
docker tag fundconnecthk:latest "$REPOSITORY:latest"
docker tag fundconnecthk:latest "$REPOSITORY:$GIT_SHA"

if [ ! -z "$APP_VERSION" ] && [ "$APP_VERSION" != "undefined" ]; then
    docker tag fundconnecthk:latest "$REPOSITORY:$APP_VERSION"
fi

# 推送镜像
echo "推送镜像到 Docker Hub..."
docker push "$REPOSITORY:latest"
docker push "$REPOSITORY:$GIT_SHA"

if [ ! -z "$APP_VERSION" ] && [ "$APP_VERSION" != "undefined" ]; then
    docker push "$REPOSITORY:$APP_VERSION"
fi

echo "✅ 推送完成!"
echo "镜像地址: https://hub.docker.com/r/$REPOSITORY"

