#!/usr/bin/env bash

# 修复 Docker 代理设置的脚本
# 使用方法: sudo ./docker/fix-docker-proxy.sh [disable|enable|check]
# disable - 禁用代理
# enable - 启用代理（需要提供代理地址）
# check - 检查当前代理状态

ACTION="${1:-check}"

case "$ACTION" in
    disable)
        echo "正在禁用 Docker 代理..."
        
        # 备份现有配置
        if [ -f /etc/systemd/system/docker.service.d/http-proxy.conf ]; then
            sudo cp /etc/systemd/system/docker.service.d/http-proxy.conf /etc/systemd/system/docker.service.d/http-proxy.conf.backup
            echo "已备份现有配置到 http-proxy.conf.backup"
        fi
        
        # 创建禁用代理的配置
        sudo mkdir -p /etc/systemd/system/docker.service.d
        sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf > /dev/null <<EOF
[Service]
Environment="HTTP_PROXY="
Environment="HTTPS_PROXY="
Environment="NO_PROXY="
EOF
        
        # 重新加载 systemd 配置
        sudo systemctl daemon-reload
        
        # 重启 Docker 服务
        echo "正在重启 Docker 服务..."
        sudo systemctl restart docker
        
        echo "✅ Docker 代理已禁用"
        echo "请等待几秒钟让 Docker 重启完成，然后运行: docker info | grep -i proxy"
        ;;
        
    enable)
        PROXY_URL="${2:-http://192.168.50.41:7890}"
        echo "正在启用 Docker 代理: $PROXY_URL"
        
        # 备份现有配置
        if [ -f /etc/systemd/system/docker.service.d/http-proxy.conf ]; then
            sudo cp /etc/systemd/system/docker.service.d/http-proxy.conf /etc/systemd/system/docker.service.d/http-proxy.conf.backup
            echo "已备份现有配置到 http-proxy.conf.backup"
        fi
        
        # 创建启用代理的配置
        sudo mkdir -p /etc/systemd/system/docker.service.d
        sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf > /dev/null <<EOF
[Service]
Environment="HTTP_PROXY=$PROXY_URL/"
Environment="HTTPS_PROXY=$PROXY_URL/"
Environment="NO_PROXY=localhost,127.0.0.1,.svc,.cluster.local,10.96.0.0/16,10.244.0.0/16"
EOF
        
        # 重新加载 systemd 配置
        sudo systemctl daemon-reload
        
        # 重启 Docker 服务
        echo "正在重启 Docker 服务..."
        sudo systemctl restart docker
        
        echo "✅ Docker 代理已启用: $PROXY_URL"
        ;;
        
    check|*)
        echo "当前 Docker 代理配置:"
        docker info 2>/dev/null | grep -i proxy || echo "未检测到代理配置"
        echo ""
        echo "配置文件位置: /etc/systemd/system/docker.service.d/http-proxy.conf"
        if [ -f /etc/systemd/system/docker.service.d/http-proxy.conf ]; then
            echo ""
            echo "配置文件内容:"
            sudo cat /etc/systemd/system/docker.service.d/http-proxy.conf 2>/dev/null || echo "无法读取（需要 sudo 权限）"
        fi
        echo ""
        echo "使用方法:"
        echo "  禁用代理: sudo ./docker/fix-docker-proxy.sh disable"
        echo "  启用代理: sudo ./docker/fix-docker-proxy.sh enable [代理地址]"
        echo "  检查状态: ./docker/fix-docker-proxy.sh check"
        ;;
esac



