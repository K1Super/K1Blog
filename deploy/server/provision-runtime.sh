#!/usr/bin/env bash
set -euo pipefail

ROOT=/srv/k1blog
ARCHIVE=${1:-/tmp/k1blog-standalone.tar.gz}

mkdir -p "$ROOT/app"
tar -xzf "$ARCHIVE" -C "$ROOT/app"

install -m 644 /tmp/Dockerfile.runtime "$ROOT/Dockerfile"
install -m 644 /tmp/docker-compose.yml "$ROOT/docker-compose.yml"
install -m 644 /tmp/dockerignore "$ROOT/.dockerignore"

mkdir -p "$ROOT/data"
chown -R 1001:1001 "$ROOT/data"
chmod 750 "$ROOT/data"

find "$ROOT/app" -type d -exec chmod 755 {} +
find "$ROOT/app" -type f -exec chmod 644 {} +

# 生产密钥只在目标机生成，不经过本地仓库与传输通道
if [ ! -f "$ROOT/.env" ]; then
    better_auth_secret=$(openssl rand -hex 32)
    comment_email_key=$(openssl rand -base64 32)
    comment_ip_pepper=$(openssl rand -hex 32)
    cat >"$ROOT/.env" <<EOF
APP_ENV=production
SITE_URL=https://k1super.xyz
TRUSTED_ORIGINS=
DATABASE_PATH=/app/data/k1blog.db
BETTER_AUTH_SECRET=$better_auth_secret
COMMENT_EMAIL_KEY=$comment_email_key
COMMENT_IP_PEPPER=$comment_ip_pepper
SMTP_URL=
SMTP_FROM=
ADMIN_EMAIL=
ADMIN_USERNAME=
ADMIN_PASSWORD=
EOF
fi
chmod 600 "$ROOT/.env"

cd "$ROOT"
docker compose config >/dev/null
echo "provisioned: $ROOT"
