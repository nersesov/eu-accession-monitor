#!/usr/bin/env bash
# Відновлення бази з резервної копії.
#   ./scripts/restore.sh backups/reform-monitor-20261122T021500Z.sql.gz
# УВАГА: поточний вміст бази буде замінено вмістом копії.
set -euo pipefail

cd "$(dirname "$0")/.."
FILE="${1:?Вкажіть файл копії: ./scripts/restore.sh backups/<файл>.sql.gz}"
[ -f "$FILE" ] || { echo "Файл не знайдено: $FILE" >&2; exit 1; }
gzip -t "$FILE"

if [ "${FORCE:-}" != "1" ]; then
  read -r -p "Базу буде ПЕРЕЗАПИСАНО вмістом $FILE. Продовжити? [y/N] " answer
  [ "$answer" = "y" ] || [ "$answer" = "Y" ] || { echo "Скасовано."; exit 1; }
fi

START=$(date +%s)
echo "1/4 Зупинка застосунку…"
docker compose stop app

echo "2/4 Очищення схеми…"
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'

echo "3/4 Відновлення даних…"
gzip -dc "$FILE" | docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null

echo "4/4 Запуск застосунку…"
docker compose start app
for _ in $(seq 1 60); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)" 2>/dev/null)" = "healthy" ] && break
  sleep 2
done

echo "Готово за $(( $(date +%s) - START )) с. Стан:"
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
docker compose exec -T db sh -c 'psql -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select '\''measures='\''||count(*) from measures union all select '\''audit_log='\''||count(*) from audit_log union all select '\''users='\''||count(*) from users"'
