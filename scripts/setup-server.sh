#!/bin/bash
# Запускать на НОВОМ сервере после: ssh root@91.229.11.58
# Настраивает Node 20, PM2, клонирует репозиторий и запускает FerretTask

set -e
APP_DIR="/var/www/ferrettask"
REPO="git@github.com:E7o4ssv/TaskManager.git"

echo "===> Установка Node.js 20 и PM2..."
apt-get update -qq
apt-get install -y -qq curl git > /dev/null
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs
npm install -g pm2

echo "===> Настройка SSH для GitHub..."
mkdir -p /root/.ssh
chmod 700 /root/.ssh
if [ ! -f /root/.ssh/id_ed25519_github ]; then
  ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519_github -N "" -C "server-deploy"
fi
# Чтобы git clone использовал этот ключ для GitHub
if [ ! -f /root/.ssh/config ] || ! grep -q 'Host github.com' /root/.ssh/config; then
  touch /root/.ssh/config
  chmod 600 /root/.ssh/config
  cat >> /root/.ssh/config << 'SSHCONF'

Host github.com
  IdentityFile /root/.ssh/id_ed25519_github
  IdentitiesOnly yes
SSHCONF
fi
echo ""
echo ">>> Добавьте этот ключ в GitHub: Repo -> Settings -> Deploy keys -> Add (Read-only):"
cat /root/.ssh/id_ed25519_github.pub
echo ""
read -p "После добавления ключа нажмите Enter..."

echo "===> Клонирование репозитория..."
ssh-keyscan -H github.com >> /root/.ssh/known_hosts 2>/dev/null
rm -rf "$APP_DIR"
git clone "$REPO" "$APP_DIR"
cd "$APP_DIR"

echo "===> Создание .env..."
if [ ! -f .env ]; then
  cat > .env << 'ENVFILE'
DATABASE_URL="file:./prod.db"
NEXT_PUBLIC_APP_URL="http://91.229.11.58:3000"
ENVFILE
  echo "Создан .env (при желании замените NEXT_PUBLIC_APP_URL на свой домен)."
else
  echo ".env уже есть, не трогаем."
fi

echo "===> Установка зависимостей и сборка..."
npm ci
npx prisma generate
npx prisma db push
npm run build

echo "===> Запуск через PM2..."
pm2 delete ferrettask 2>/dev/null || true
pm2 start npm --name ferrettask -- start
pm2 save
pm2 startup | tail -1 | bash || true

echo ""
echo ">>> Готово. Приложение: http://91.229.11.58:3000"
echo ">>> Для автодеплоя при push в main добавьте в GitHub Secrets: SERVER_HOST=91.229.11.58, SERVER_USER=root, SSH_PRIVATE_KEY=(приватный ключ для входа на этот сервер)."
