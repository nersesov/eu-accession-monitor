# Розгортання з нуля

Покрокова інструкція: від чистого VPS до робочого сайту з HTTPS, даними й резервними копіями. Розрахована на людину, яка не знайома з проєктом. Усі команди на сервері виконуються по SSH.

**Що потрібно:** VPS з Ubuntu 24.04 (достатньо 4 ГБ RAM, з запасом — 6 ГБ), публічна IPv4-адреса, SSH-ключ на вашому компʼютері.

Позначення: `<IP>` — адреса сервера, `<OWNER>/<REPO>` — репозиторій на GitHub.

---

## 1. Сервер: користувач, SSH, фаєрвол

Увійдіть як `root` (доступ видає хостинг) і створіть окремого користувача:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/     # або вставте свій публічний ключ
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/deploy && chmod 440 /etc/sudoers.d/deploy
```

**Не закриваючи поточну сесію**, перевірте вхід у новому терміналі: `ssh deploy@<IP>`. Якщо працює — вимкніть пароль і вхід для root:

```bash
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf >/dev/null <<'CONF'
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
CONF
sudo sshd -t && sudo systemctl restart ssh
```

Фаєрвол і автоматичні оновлення безпеки:

```bash
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw --force enable && sudo ufw status
sudo apt-get update && sudo apt-get install -y unattended-upgrades
```

## 2. Docker Engine + Compose

З офіційного репозиторію Docker:

```bash
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```

Вийдіть і зайдіть знову (щоб застосувалася група), перевірте: `docker compose version`.

> Docker публікує порти в обхід `ufw`. У цьому проєкті назовні відкриті лише 80 і 443 (Caddy); застосунок слухає `127.0.0.1:3000`, PostgreSQL портів не публікує.

## 3. Каталог проєкту

```bash
sudo mkdir -p /opt/reform-monitor && sudo chown deploy:deploy /opt/reform-monitor
cd /opt/reform-monitor
```

На сервері потрібні лише `docker-compose.yml`, `Caddyfile`, `.env` і `scripts/`. Скопіюйте їх зі свого компʼютера (з каталогу репозиторію):

```bash
scp docker-compose.yml Caddyfile .env.example deploy@<IP>:/opt/reform-monitor/
scp -r scripts deploy@<IP>:/opt/reform-monitor/
```

## 4. Файл `.env`

```bash
cd /opt/reform-monitor
cp .env.example .env && chmod 600 .env
nano .env
```

| Змінна | Значення |
|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -hex 16` |
| `PAYLOAD_SECRET` | `openssl rand -hex 32` |
| `DOMAIN` | `reform-monitor.<IP>.sslip.io` (IP через крапки) |
| `SITE_URL` | `https://reform-monitor.<IP>.sslip.io` — **точно** як у браузері, без `/` в кінці |
| `ACME_EMAIL` | ваша пошта (для Let's Encrypt) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | перший адміністратор; пароль — довгий і унікальний |
| `APP_IMAGE` | `ghcr.io/<owner>/<repo>:latest` (малими літерами) |
| `SEED_ON_START` | `true` — наповнити порожню базу демонстраційними даними |
| `GOOGLE_SHEET_ID` | ID таблиці або порожньо (див. [data-import.md](data-import.md)) |
| `REPO_URL` | адреса репозиторію (посилання в підвалі сайту) |

`.env` не потрапляє в git і має права `600`.

## 5. Образ застосунку

**Варіант А — готовий образ із GHCR** (після налаштування CI, розділ 9). Якщо пакет приватний:

```bash
echo <GITHUB_TOKEN з правом read:packages> | docker login ghcr.io -u <github-user> --password-stdin
```

**Варіант Б — зібрати на сервері** (без CI): склонуйте репозиторій у `/opt/reform-monitor` замість копіювання окремих файлів, залиште `APP_IMAGE=reform-monitor:local` і виконайте `docker compose build app`.

## 6. Запуск

```bash
cd /opt/reform-monitor
docker compose --profile prod pull          # варіант А
docker compose --profile prod up -d
docker compose --profile prod ps
```

Очікуваний результат: `db` і `app` у стані `healthy`, `caddy` — `Up`. При першому старті застосунок сам:

1. виконує міграції бази (зокрема тригер незмінності журналу аудиту);
2. створює ролі `admin`, `editor`, `analyst` і першого адміністратора;
3. імпортує демонстраційні дані (якщо `SEED_ON_START=true`).

Caddy автоматично отримує сертифікат Let's Encrypt (порти 80 і 443 мають бути відкриті). Перевірка:

```bash
curl -sI https://reform-monitor.<IP>.sslip.io | head -5
curl -s https://reform-monitor.<IP>.sslip.io/api/healthz      # {"status":"ok","db":"ok",...}
docker compose logs app --tail 30                              # JSON-логи
```

Відкрийте сайт і `/admin`, увійдіть під адміністратором і **змініть пароль** («Користувачі» → свій запис).

Усі сервіси мають `restart: unless-stopped`: після перезавантаження сервера вони стартують самі. Перевірка: `sudo reboot`, за хвилину — `docker compose --profile prod ps`.

### Варіант для спільного сервера (порти 80/443 уже зайняті)

Якщо на сервері вже працює інший сайт зі своїм Caddy, другий Caddy не запускайте — буде конфлікт портів. Тоді:

1. У `.env`: `APP_BIND=0.0.0.0`, `APP_PORT=<вільний порт>`, `SITE_URL=http://<IP>:<порт>`.
2. Запуск без профілю `prod`: `docker compose up -d` (стартують лише `db` і `app`).
3. Образ без CI можна зібрати на своїй машині та передати на сервер без реєстру:

```bash
docker buildx build --platform linux/amd64 -t reform-monitor:local --load .
docker save reform-monitor:local | gzip | ssh root@<IP> 'gunzip | docker load'
```

Сайт у такому режимі працює по HTTP, тож пароль адміністратора передається відкрито. Щоб увімкнути HTTPS через наявний Caddy:

1. Дізнайтеся адресу шлюзу мережі, в якій працює наявний Caddy: `docker inspect <caddy-контейнер> --format '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}'` (наприклад, `172.18.0.1`).
2. Допишіть блок у його Caddyfile. Якщо файл змонтовано в контейнер як окремий файл, дописуйте через `cat >>`, а не редактором, що створює новий файл, — інакше контейнер не побачить змін:

```
reform-monitor.<IP>.sslip.io {
	encode zstd gzip
	header Strict-Transport-Security "max-age=31536000"
	reverse_proxy <шлюз>:<порт>
}
```

3. Перевірте й застосуйте: `docker exec <caddy-контейнер> caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`, далі те саме з `reload`.
4. У `.env` застосунку: `SITE_URL=https://reform-monitor.<IP>.sslip.io`, `APP_BIND=<шлюз>` (порт перестає бути доступним ззовні), потім `docker compose up -d`.

## 7. Дані

- Демонстраційні дані вже імпортовано при старті.
- Власна таблиця Google Sheets: [data-import.md](data-import.md), далі кнопка «Синхронізувати» в адмінці.
- Щоденна синхронізація о 03:00 увімкнена за замовчуванням (`ENABLE_JOBS=true`).

## 8. Резервні копії

```bash
cd /opt/reform-monitor && chmod +x scripts/*.sh
./scripts/backup.sh                         # перевірка вручну → backups/reform-monitor-<дата>.sql.gz
crontab -e
```

Додайте рядок (щодня о 02:15, зберігання 14 днів):

```cron
15 2 * * * cd /opt/reform-monitor && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Копія за межами сервера — один із варіантів:

- завантажити на свій компʼютер: `scp deploy@<IP>:/opt/reform-monitor/backups/reform-monitor-*.sql.gz ./`
- S3-сумісне сховище: встановіть `rclone`, налаштуйте `rclone config` і додайте в cron змінну `RCLONE_REMOTE=<remote>:<bucket>/reform-monitor` перед командою.

Відновлення і результати перевірки: [restore.md](restore.md).

## 9. CI/CD (GitHub Actions)

Файл `.github/workflows/ci.yml`. На кожен push у `main`:

1. **check** — lint, typecheck, unit-тести, gitleaks;
2. **e2e** — збірка образу, запуск стеку, Playwright + axe, Lighthouse CI, Trivy;
3. **publish** — образ у GHCR з тегами `sha-<коміт>` і `latest`;
4. **deploy** — SSH на VPS: `docker compose pull app && docker compose up -d --wait`.

Кожен наступний крок залежить від попереднього (`needs`): **якщо тест упав, образ не публікується і деплой не виконується.**

Налаштування в репозиторії (Settings → Secrets and variables → Actions):

| Тип | Назва | Значення |
|---|---|---|
| Secret | `VPS_HOST` | `<IP>` |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | приватний ключ **окремої** пари лише для деплою (`ssh-keygen -t ed25519 -f deploy_key`; публічну частину додайте в `/home/deploy/.ssh/authorized_keys`) |
| Variable | `DEPLOY_ENABLED` | `true` (без неї крок deploy пропускається) |

### Оновлення без тривалого простою і відкат

`docker compose up -d --wait` перестворює контейнер `app` і чекає на `healthy`. Caddy перевіряє `/api/healthz` і повертає трафік, щойно застосунок готовий; перерва — кілька секунд на старт контейнера.

Попередній тег зберігається у файлі `.previous-image`. Відкат:

```bash
cd /opt/reform-monitor
cat .previous-image                                   # PREVIOUS_APP_IMAGE=ghcr.io/...:sha-xxxxxxx
sed -i "s|^APP_IMAGE=.*|APP_IMAGE=ghcr.io/<owner>/<repo>:sha-xxxxxxx|" .env
docker compose --profile prod up -d --wait
```

Якщо нова версія містила міграцію бази, перед відкатом відновіть базу з резервної копії, зробленої до оновлення.

## 10. Контрольний список після розгортання

- [ ] `https://…` відкривається, сертифікат дійсний; працюють `/` і `/en`
- [ ] `docker compose --profile prod ps` — `healthy`; після `sudo reboot` сервіси стартують самі
- [ ] пароль адміністратора змінено; `.env` має права `600`
- [ ] `./scripts/backup.sh` створює файл; cron додано; відновлення перевірено ([restore.md](restore.md))
- [ ] у підвалі кожної сторінки є дисклеймер
- [ ] `curl -sI https://…` показує `strict-transport-security`, `content-security-policy`, `x-frame-options`

## Типові проблеми

| Симптом | Причина і рішення |
|---|---|
| Caddy не отримує сертифікат | Закриті порти 80/443 або `DOMAIN` не відповідає IP. `docker compose logs caddy` |
| Не вдається увійти в адмінку (форма повертається без помилки) | `SITE_URL` не збігається з адресою в браузері (схема, домен). Виправте `.env`, `docker compose --profile prod up -d` |
| `app` у стані `unhealthy` | `docker compose logs app --tail 100`; найчастіше — неправильний пароль БД у `.env` після зміни (пароль задається лише при створенні тому `pgdata`) |
| Сайт порожній | `SEED_ON_START=false` при першому старті: натисніть «Синхронізувати» в адмінці |
