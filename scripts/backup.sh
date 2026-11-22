#!/usr/bin/env bash
# Резервна копія PostgreSQL: pg_dump | gzip у каталог backups/, зберігання 14 днів.
# Запуск:  ./scripts/backup.sh            (із каталогу проєкту)
# Cron:    15 2 * * * cd /opt/reform-monitor && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/reform-monitor-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# --clean --if-exists: дамп можна відновити і в наявну, і в чисту базу
docker compose exec -T db sh -c 'pg_dump --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip -9 > "$FILE.tmp"

# Порожній або пошкоджений архів не повинен замінити справну копію
gzip -t "$FILE.tmp"
if [ "$(gzip -dc "$FILE.tmp" | head -c 2000 | grep -c 'PostgreSQL database dump')" -eq 0 ]; then
  echo "$(date -u +%FT%TZ) ПОМИЛКА: дамп не схожий на pg_dump" >&2
  rm -f "$FILE.tmp"
  exit 1
fi
mv "$FILE.tmp" "$FILE"
chmod 600 "$FILE"

# Завантажені файли (колекція media) — окремим архівом
if docker compose ps --status running --services 2>/dev/null | grep -qx app; then
  docker compose exec -T app tar -C /app -czf - media > "$BACKUP_DIR/media-$STAMP.tar.gz" 2>/dev/null && chmod 600 "$BACKUP_DIR/media-$STAMP.tar.gz" || rm -f "$BACKUP_DIR/media-$STAMP.tar.gz"
fi

find "$BACKUP_DIR" -maxdepth 1 \( -name 'reform-monitor-*.sql.gz' -o -name 'media-*.tar.gz' \) -mtime +"$RETENTION_DAYS" -delete

echo "$(date -u +%FT%TZ) OK $FILE ($(du -h "$FILE" | cut -f1))"

# Копія за межі сервера (необовʼязково): S3-сумісне сховище через rclone
if [ -n "${RCLONE_REMOTE:-}" ] && command -v rclone >/dev/null 2>&1; then
  rclone copy "$FILE" "$RCLONE_REMOTE" && echo "$(date -u +%FT%TZ) OK копія в $RCLONE_REMOTE"
fi
