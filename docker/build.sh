#!/usr/bin/env bash

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

# Check if --no-cache flag is provided
NO_CACHE_FLAG=""
if [ "$1" == "--no-cache" ] || [ "$NO_CACHE" == "1" ]; then
    NO_CACHE_FLAG="--no-cache"
    echo "⚠️  使用 --no-cache 选项，将重新构建所有层（不使用缓存）"
fi

# Build with temporary base tag
docker build -f "$SCRIPT_DIR/Dockerfile" \
    --progress=plain \
    $NO_CACHE_FLAG \
    -t "fundconnecthk-base" \
    "$MONOREPO_ROOT"

# Handle repository tagging
if [ ! -z "$DOCKER_REPOSITORY" ]; then
    echo "Using custom repository: $DOCKER_REPOSITORY"
    
    # Add tags for custom repository
    docker tag "fundconnecthk-base" "$DOCKER_REPOSITORY:latest"
    docker tag "fundconnecthk-base" "$DOCKER_REPOSITORY:$GIT_SHA"

    # Add version tag if available
    if [ ! -z "$APP_VERSION" ] && [ "$APP_VERSION" != "undefined" ]; then
        docker tag "fundconnecthk-base" "$DOCKER_REPOSITORY:$APP_VERSION"
    fi
else
    echo "Using default repository: fundconnecthk"
    
    # Add tags for default repository
    docker tag "fundconnecthk-base" "fundconnecthk:latest"
    docker tag "fundconnecthk-base" "fundconnecthk:$GIT_SHA"

    # Add version tags if available
    if [ ! -z "$APP_VERSION" ] && [ "$APP_VERSION" != "undefined" ]; then
        docker tag "fundconnecthk-base" "fundconnecthk:$APP_VERSION"
    fi
fi

# Remove the temporary base tag
docker rmi "fundconnecthk-base"
