#!/bin/bash
# Запускать на сервере под root (скопировать и вставить в SSH-сессию)
set -e
apt update && apt install -y git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
mkdir -p /var/www
cd /var/www
rm -rf taskmanager
git clone https://github.com/E7o4ssv/TaskManager.git taskmanager
cd taskmanager
cp .env.example .env
sed -i 's|^DATABASE_URL=.*|DATABASE_URL="file:./dev.db"|' .env
npm ci
npx prisma generate
npx prisma db push
npm run db:seed
npm run build
pm2 delete taskmanager 2>/dev/null || true
pm2 start npm --name taskmanager -- start
pm2 save
pm2 startup
echo "Готово. Приложение: http://$(curl -s ifconfig.me):3000"
