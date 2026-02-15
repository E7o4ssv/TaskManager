# Деплой TaskManager на сервер

При пуше в ветку **main** GitHub Actions автоматически деплоит приложение на ваш сервер.

## 1. Однократная настройка сервера

Подключитесь по SSH (пароль у вас есть):

```bash
ssh root@194.67.127.158
```

Выполните на сервере:

```bash
# Обновление и базовые пакеты
apt update && apt install -y git

# Node.js 20 (если ещё не установлен)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2 для запуска приложения
npm install -g pm2

# Папка приложения
mkdir -p /var/www
cd /var/www
git clone https://github.com/E7o4ssv/TaskManager.git taskmanager
cd taskmanager

# Переменные окружения (замените при необходимости)
cp .env.example .env
nano .env   # задайте DATABASE_URL="file:./dev.db" или свой путь

# Первая установка и запуск
npm ci
npx prisma generate
npx prisma db push
npm run db:seed   # опционально: тестовые данные
npm run build
pm2 start npm --name taskmanager -- start
pm2 save
pm2 startup   # автозапуск после перезагрузки сервера
```

Проверьте: откройте в браузере `http://194.67.127.158:3000`. Если порт 3000 закрыт файрволом — откройте его или настройте nginx как прокси.

---

## 2. Настройка GitHub Actions (секреты)

Чтобы workflow мог подключаться к серверу по SSH без пароля, нужен SSH-ключ.

### 2.1 Создать SSH-ключ (на вашем компьютере)

В терминале:

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy_taskmanager -N ""
```

Появятся два файла: `github_deploy_taskmanager` (приватный) и `github_deploy_taskmanager.pub` (публичный).

### 2.2 Добавить публичный ключ на сервер

Скопируйте содержимое **публичного** ключа:

```bash
cat ~/.ssh/github_deploy_taskmanager.pub
```

Подключитесь к серверу и добавьте ключ:

```bash
ssh root@194.67.127.158
mkdir -p ~/.ssh
echo "ВСТАВЬТЕ_СЮДА_СОДЕРЖИМОЕ_.pub_ФАЙЛА" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

Проверьте вход по ключу (с вашего компьютера):

```bash
ssh -i ~/.ssh/github_deploy_taskmanager root@194.67.127.158
```

Если заходит без пароля — всё ок.

### 2.3 Добавить секреты в репозиторий GitHub

1. Откройте репозиторий: https://github.com/E7o4ssv/TaskManager  
2. **Settings** → **Secrets and variables** → **Actions**  
3. **New repository secret** — создайте три секрета:

| Name            | Value              | Описание        |
|-----------------|--------------------|-----------------|
| `SERVER_HOST`   | `194.67.127.158`   | IP сервера      |
| `SERVER_USER`   | `root`             | Пользователь SSH |
| `SSH_PRIVATE_KEY` | содержимое файла `~/.ssh/github_deploy_taskmanager` (весь текст, включая строки `-----BEGIN ...` и `-----END ...`) | Приватный ключ  |

Для `SSH_PRIVATE_KEY` откройте файл и скопируйте всё:

```bash
cat ~/.ssh/github_deploy_taskmanager
```

---

## 3. Как это работает

- Вы делаете `git push origin main` (или мержите PR в **main**).
- GitHub Actions запускает workflow **Deploy to server**.
- Workflow по SSH заходит на сервер, в каталог `/var/www/taskmanager`, подтягивает код из **main**, ставит зависимости, обновляет БД, собирает проект и перезапускает приложение через PM2.

Логи деплоя смотрите во вкладке **Actions** репозитория на GitHub.

---

## 4. Удалить старое и залить только TaskManager

Если на сервере был другой проект и вы хотите оставить только этот:

```bash
ssh root@194.67.127.158
rm -rf /var/www/taskmanager
cd /var/www
git clone https://github.com/E7o4ssv/TaskManager.git taskmanager
cd taskmanager
cp .env.example .env
nano .env   # DATABASE_URL="file:./dev.db"
npm ci
npx prisma generate
npx prisma db push
npm run build
pm2 delete all 2>/dev/null || true
pm2 start npm --name taskmanager -- start
pm2 save
```

Дальше при пуше в **main** будет срабатывать автоматический деплой.
