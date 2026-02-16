# Подключение домена к FerretTask

## DNS у Рег.ру

Если у домена прописаны DNS-серверы Рег.ру (бесплатные для VPS/серверов):
- **ns5.hosting.reg.ru**
- **ns6.hosting.reg.ru**

то A-записи нужно добавлять **в панели Рег.ру** → ваш домен → зона DNS (ресурсные записи). Настройки «IP-адреса» в ispmgr привязывают домен к серверу в панели хостинга, но для работы сайта и SSL в самой зоне DNS должны быть записи:
- **A** `@` → IP сервера  
- **A** `www` → IP сервера  

Важно: IP в записях A должен быть **тем сервером, где крутится FerretTask**.  
Если приложение на **91.229.11.58** — укажите в Рег.ру именно этот IP (а не 95.163.244.138). Если, наоборот, приложение перенесено на 95.163.244.138 — тогда оставьте этот IP и настраивайте тот сервер.

Дальше — один раз настроить на сервере **nginx** и **SSL**.

---

## 1. Убедиться, что домен указывает на нужный сервер

В панели Рег.ру в ресурсных записях должно быть:
- **A** `@` → **91.229.11.58** (или IP вашего сервера с FerretTask)
- **A** `www` → **91.229.11.58**

Сохраните, подождите 5–15 минут (распространение DNS).

**Если сайт по домену не открывается, а по IP открывается**

Часто это из‑за того, что ваш провайдер или роутер ещё не «видит» делегирование домена. Что сделать:

1. **Проверить делегирование в Рег.ру**  
   В панели Рег.ру → домен ferrettask.ru → раздел «Делегирование» / «NS-серверы». Должны быть указаны:
   - **ns5.hosting.reg.ru**
   - **ns6.hosting.reg.ru**  
   Если стоят другие NS — замените на эти и подождите до 24–48 часов.

2. **Временно открывать сайт по IP**  
   В браузере введите: **http://91.229.11.58** — сайт должен открыться.

3. **Использовать DNS Google или Cloudflare** (тогда домен начнёт резолвиться сразу):
   - **Google DNS:** 8.8.8.8 и 8.8.4.4  
   - **Cloudflare:** 1.1.1.1 и 1.0.0.1  
   Настройте их в параметрах сети (Wi‑Fi/ Ethernet) на компьютере или в роутере. После этого https://ferrettask.ru должен открываться.

---

## 2. Подключиться к серверу

```bash
ssh root@91.229.11.58
```

(или ваш IP, если другой.)

---

## 3. Установить nginx и Certbot

На сервере:

```bash
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx
```

---

## 4. Создать конфиг nginx для домена

Замените **ВАШ-ДОМЕН.ru** на ваш домен (например `ferrettask.ru` или `tasks.mysite.ru`).

```bash
cat > /etc/nginx/sites-available/ferrettask << 'EOF'
server {
    listen 80;
    server_name ВАШ-ДОМЕН.ru www.ВАШ-ДОМЕН.ru;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

Вставьте свой домен вместо `ВАШ-ДОМЕН.ru` (два раза в файле):

```bash
sed -i 's/ВАШ-ДОМЕН.ru/ваш-реальный-домен.ru/g' /etc/nginx/sites-available/ferrettask
```

Включите сайт и перезапустите nginx:

```bash
ln -sf /etc/nginx/sites-available/ferrettask /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## 5. Получить бесплатный SSL (HTTPS)

На сервере (снова подставьте свой домен):

```bash
certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru --non-interactive --agree-tos -m ваш@email.ru
```

Certbot сам настроит HTTPS в nginx. Для продления раз в 3 месяца можно добавить в cron:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -
```

---

## 6. Указать в приложении URL с доменом

Чтобы ссылки (например приглашения) были с вашим доменом, на сервере в `.env` задайте:

```bash
cd /var/www/ferrettask
# отредактируйте .env, замените NEXT_PUBLIC_APP_URL на ваш домен:
sed -i 's|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL="https://ваш-домен.ru"|' .env
cat .env
pm2 restart ferrettask
```

После этого приложение будет открываться по **https://ваш-домен.ru** и **https://www.ваш-домен.ru**.

---

## Кратко

| Шаг | Действие |
|-----|----------|
| DNS | В Рег.ру: A @ и A www → IP сервера (91.229.11.58 или ваш) |
| Сервер | Установить nginx и certbot |
| Nginx | Создать конфиг с `server_name` вашего домена и `proxy_pass http://127.0.0.1:3000` |
| SSL | Запустить `certbot --nginx -d домен -d www.домен` |
| App | В `/var/www/ferrettask/.env` выставить `NEXT_PUBLIC_APP_URL=https://ваш-домен.ru` и перезапустить PM2 |

Если домен указывает на другой IP (например 95.163.244.138), все команды выполняйте на **том** сервере и в DNS оставьте этот IP.

---

## Если certbot пишет NXDOMAIN (DNS problem)

Ошибка `NXDOMAIN looking up A for ferrettask.ru` значит: в глобальном DNS ещё нет A-записей для домена.

1. **Добавьте A-записи** там, где управляется зона домена (Рег.ру, ispmgr, другой хостинг):
   - **ferrettask.ru** (или запись `@`) → **91.229.11.58**
   - **www.ferrettask.ru** (или запись `www`) → **91.229.11.58**
2. Подождите распространения DNS (5–15 минут или до 24–48 часов). Проверка:
   ```bash
   dig ferrettask.ru A +short
   dig www.ferrettask.ru A +short
   ```
   Оба должны вернуть IP сервера.
3. **Повторно запустите certbot** на сервере:
   ```bash
   certbot --nginx -d ferrettask.ru -d www.ferrettask.ru --non-interactive --agree-tos --register-unsafely-without-email
   ```
   Или с email: `-m ваш@email.ru` вместо `--register-unsafely-without-email`.
