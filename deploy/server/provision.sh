#!/usr/bin/env bash
set -euo pipefail

ROOT=/srv/k1blog
ARCHIVE=${1:-/tmp/k1blog-src.tar.gz}

# Next.js 构建在 1.6G 内存的实例上会触顶，用交换区兜底而不是让构建被 OOM 杀掉
if ! swapon --show=NAME | grep -qx '/swapfile'; then
    if [ ! -f /swapfile ]; then
        fallocate -l 4G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile >/dev/null
    fi
    swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || printf '/swapfile none swap sw 0 0\n' >>/etc/fstab

mkdir -p "$ROOT"
tar -xzf "$ARCHIVE" -C "$ROOT"

mkdir -p "$ROOT/data"
chown -R 1001:1001 "$ROOT/data"
chmod 750 "$ROOT/data"

# 生产密钥只在目标机生成，不经过本地仓库与传输通道
if [ ! -f "$ROOT/.env" ]; then
    better_auth_secret=$(openssl rand -hex 32)
    comment_ip_pepper=$(openssl rand -hex 32)
    cat >"$ROOT/.env" <<EOF
APP_ENV=production
SITE_URL=https://k1super.xyz
TRUSTED_ORIGINS=
DATABASE_PATH=/app/data/k1blog.db
BETTER_AUTH_SECRET=$better_auth_secret
COMMENT_IP_PEPPER=$comment_ip_pepper
SMTP_URL=
SMTP_FROM=
ADMIN_EMAIL=
ADMIN_USERNAME=
ADMIN_PASSWORD=
EOF
    chmod 600 "$ROOT/.env"
fi

chmod 600 "$ROOT/.env"
echo "provisioned: $ROOT"
