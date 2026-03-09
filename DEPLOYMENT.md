# 自托管部署指南

本文档说明如何将项目打包、上传到服务器，并通过 Nginx 对外提供访问。

## 一、部署架构

应用依赖：
- **PostgreSQL** 数据库
- **SMTP** 邮件服务（开发/测试可用 Mailpit）
- **签名证书** `.p12` 文件（文档签名必需）

## 二、方式一：Docker 部署（推荐）

### 1. 本地构建镜像

在项目根目录执行：

```bash
# 构建 Docker 镜像（使用项目自带的 Dockerfile）
docker build -f docker/Dockerfile -t fundconnecthk:latest .

# 可选：指定加密密钥（生产环境务必修改）
docker build -f docker/Dockerfile \
  --build-arg NEXT_PRIVATE_ENCRYPTION_KEY="你的32位以上随机字符串" \
  --build-arg NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="另一个32位以上随机字符串" \
  -t fundconnecthk:latest .
```

### 2. 导出镜像并上传到服务器

```bash
# 导出镜像为 tar 文件
docker save fundconnecthk:latest -o fundconnecthk.tar

# 上传到服务器（替换为你的服务器地址）
scp fundconnecthk.tar user@your-server:/path/to/deploy/
scp -r docker/production user@your-server:/path/to/deploy/
```

### 3. 在服务器上准备部署文件

在服务器创建部署目录，例如 `/opt/fundconnecthk`：

```bash
mkdir -p /opt/fundconnecthk
cd /opt/fundconnecthk
```

将以下文件放到该目录：
- `fundconnecthk.tar`（镜像）
- `compose.yml`（从 `docker/production/compose.yml` 复制并调整）
- `.env`（环境变量）

### 4. 创建 .env 文件

在部署目录创建 `.env`，参考：

```bash
# 数据库（与 compose 中 database 服务对应）
POSTGRES_USER=fundconnecthk
POSTGRES_PASSWORD=你的数据库密码
POSTGRES_DB=fundconnecthk

# 应用 URL（改成你的域名，如 https://doc.yourdomain.com）
NEXT_PUBLIC_WEBAPP_URL=https://doc.yourdomain.com
NEXT_PRIVATE_INTERNAL_WEBAPP_URL=http://localhost:3000

# 数据库连接（database 为 compose 中的服务名）
NEXT_PRIVATE_DATABASE_URL=postgres://fundconnecthk:你的数据库密码@database:5432/fundconnecthk
NEXT_PRIVATE_DIRECT_DATABASE_URL=postgres://fundconnecthk:你的数据库密码@database:5432/fundconnecthk

# 加密密钥（用 openssl rand -hex 32 生成）
NEXTAUTH_SECRET=你的随机密钥
NEXT_PRIVATE_ENCRYPTION_KEY=你的32位以上随机字符串
NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY=另一个32位以上随机字符串

# SMTP（使用 Mailpit 时）
NEXT_PRIVATE_SMTP_TRANSPORT=smtp-auth
NEXT_PRIVATE_SMTP_HOST=mailserver
NEXT_PRIVATE_SMTP_PORT=1025
NEXT_PRIVATE_SMTP_USERNAME=
NEXT_PRIVATE_SMTP_PASSWORD=
NEXT_PRIVATE_SMTP_FROM_NAME=Documenso
NEXT_PRIVATE_SMTP_FROM_ADDRESS=noreply@yourdomain.com

# 签名证书密码（启动后生成证书时使用）
NEXT_PRIVATE_SIGNING_PASSPHRASE=你的证书密码

# 证书路径（与 compose 中 volume 挂载一致）
NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH=/var/lib/fundconnecthk/cert/cert.p12
```

### 5. 修改 compose.yml 中的网络与端口

确保 `fundconnecthk-contract` 服务加入 `database` 和 `mailserver` 所在网络，并暴露 3000 端口。当前 compose 已包含这些配置。

如需通过 Nginx 反向代理，可将端口改为仅监听本地：

```yaml
# 在 fundconnecthk-contract 的 ports 中
ports:
  - '127.0.0.1:3000:3000'  # 仅本机访问，由 Nginx 代理
```

### 6. 加载镜像并启动

```bash
cd /opt/fundconnecthk

# 加载镜像
docker load -i fundconnecthk.tar

# 创建证书目录
mkdir -p /var/lib/fundconnecthk/cert

# 首次启动
docker compose -f compose.yml --env-file .env up -d

# 生成签名证书（首次部署必须执行）
read -s -p "输入证书密码: " CERT_PASS && echo
docker exec -e CERT_PASS="$CERT_PASS" -it fundconnecthk-contract-production-fundconnecthk-contract-1 sh -c "
  apk add --no-cache openssl && \
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /tmp/private.key -out /tmp/certificate.crt \
    -subj '/C=CN/ST=State/L=City/O=Org/CN=localhost' && \
  openssl pkcs12 -export -out /var/lib/fundconnecthk/cert/cert.p12 \
    -inkey /tmp/private.key -in /tmp/certificate.crt \
    -passout env:CERT_PASS && rm /tmp/private.key /tmp/certificate.crt
"

# 重启应用使证书生效
docker compose -f compose.yml restart fundconnecthk-contract
```

> 注意：容器内可能没有 `openssl`，若报错，可在宿主机生成 cert.p12 后挂载进容器。

### 7. Nginx 配置

在 `/etc/nginx/sites-available/documenso` 创建配置：

```nginx
server {
    listen 80;
    server_name doc.yourdomain.com;

    # 若使用 HTTPS，取消下面注释并配置证书
    # listen 443 ssl http2;
    # ssl_certificate /path/to/fullchain.pem;
    # ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

启用配置并重载 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/documenso /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 三、方式二：本地构建部署（无 Docker，推荐）

无需 Docker，直接在本地或服务器上构建，速度更快。

### 1. 本地构建

在项目根目录执行：

```bash
npm ci
npm run build
```

构建完成后，产物在 `apps/remix/build/`（包含 `client/` 和 `server/`）。

### 2. 打包上传

**方式 A：上传整个项目（最简单）**

```bash
# 排除 node_modules、.git 等，在服务器上重新安装
rsync -avz --exclude node_modules --exclude .git --exclude .turbo \
  ./ user@服务器:/opt/fundconnecthk/
```

**方式 B：只上传必要文件（体积更小）**

保持项目目录结构，只打包运行时需要的文件：

```bash
# 在项目根目录执行，创建 deploy 目录（保持 monorepo 结构）
mkdir -p deploy/apps/remix deploy/packages
cp -r apps/remix/build deploy/apps/remix/
cp -r apps/remix/public deploy/apps/remix/
cp apps/remix/package.json deploy/apps/remix/
cp -r packages deploy/
cp package.json package-lock.json deploy/
# .env 到服务器后单独配置，不要打包进 deploy

# 打包上传
tar czf deploy.tar.gz deploy
scp deploy.tar.gz user@服务器:/opt/fundconnecthk/
# 服务器上解压: cd /opt/fundconnecthk && tar xzf deploy.tar.gz && cp -r deploy/* . && rm -rf deploy
```

### 3. 服务器上安装依赖

```bash
cd /opt/fundconnecthk

# 完整安装（推荐，确保 start 脚本可用）
npm ci

# 或仅生产依赖（体积更小，需用下方「启动方式 B」）
npm ci --omit=dev
```

### 4. 环境变量

在项目根目录创建 `.env`（参考 `.env.example`），至少配置：

```bash
NEXTAUTH_SECRET=你的随机密钥
NEXT_PRIVATE_ENCRYPTION_KEY=32位以上随机字符串
NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY=32位以上随机字符串
NEXT_PUBLIC_WEBAPP_URL=https://你的域名
NEXT_PRIVATE_INTERNAL_WEBAPP_URL=http://localhost:3000
NEXT_PRIVATE_DATABASE_URL=postgres://用户:密码@数据库地址:5432/数据库名
NEXT_PRIVATE_DIRECT_DATABASE_URL=同上
NEXT_PRIVATE_SMTP_TRANSPORT=smtp-auth
NEXT_PRIVATE_SMTP_HOST=你的SMTP地址
NEXT_PRIVATE_SMTP_PORT=587
NEXT_PRIVATE_SMTP_FROM_NAME=Documenso
NEXT_PRIVATE_SMTP_FROM_ADDRESS=noreply@你的域名
NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH=/path/to/cert.p12
NEXT_PRIVATE_SIGNING_PASSPHRASE=证书密码
```

### 5. 数据库迁移

```bash
npm run prisma:migrate-deploy
```

### 6. 生成签名证书（首次部署）

```bash
# 在服务器上生成 cert.p12
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /tmp/private.key -out /tmp/certificate.crt \
  -subj '/C=CN/ST=State/L=City/O=Org/CN=localhost'

openssl pkcs12 -export -out /opt/fundconnecthk/cert.p12 \
  -inkey /tmp/private.key -in /tmp/certificate.crt \
  -passout pass:你的证书密码

rm /tmp/private.key /tmp/certificate.crt
```

### 7. 启动应用

**方式 A：从项目根目录启动**（需完整 `npm ci`，会自动加载 `.env`）：

```bash
npm run start
```

**方式 B：直接运行 Node**（适用于 `npm ci --omit=dev`，不依赖 dotenv-cli）：

```bash
cd /opt/fundconnecthk
# 加载 .env 后启动
(set -a; [ -f .env ] && . ./.env; [ -f .env.local ] && . ./.env.local; set +a; cd apps/remix && NODE_ENV=production node build/server/main.js)
```

或写成启动脚本 `start.sh`：

```bash
#!/bin/bash
cd "$(dirname "$0")"
set -a
[ -f .env ] && . ./.env
[ -f .env.local ] && . ./.env.local
set +a
cd apps/remix && exec node build/server/main.js
```

**使用 pm2 守护进程**：

```bash
cd /opt/fundconnecthk
# 若使用 start.sh
chmod +x start.sh
pm2 start start.sh --name fundconnecthk --interpreter bash
# 或若用完整 npm ci：pm2 start "npm run start" --name fundconnecthk
pm2 save && pm2 startup
```

**使用 systemd**：创建 `/etc/systemd/system/fundconnecthk.service`：

```ini
[Unit]
Description=FundConnectHK
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/fundconnecthk
# 使用 start.sh 或直接运行 node
ExecStart=/opt/fundconnecthk/start.sh
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
chmod +x /opt/fundconnecthk/start.sh
sudo systemctl daemon-reload
sudo systemctl enable fundconnecthk
sudo systemctl start fundconnecthk
```

### 8. Nginx 配置

与 Docker 方式相同，将 `proxy_pass` 指向 `http://127.0.0.1:3000`。

---

## 四、健康检查

```bash
# 基础健康
curl http://localhost:3000/api/health

# 证书状态
curl http://localhost:3000/api/certificate-status
```

---

## 五、常见问题

1. **证书错误**：确认 `cert.p12` 路径正确、权限可读，且 `NEXT_PRIVATE_SIGNING_PASSPHRASE` 正确。
2. **数据库连接失败**：检查 `NEXT_PRIVATE_DATABASE_URL`、数据库是否启动、网络是否可达。
3. **邮件发送失败**：检查 SMTP 配置；使用 Mailpit 时确保 `NEXT_PRIVATE_SMTP_HOST` 指向 mailserver 服务名。
