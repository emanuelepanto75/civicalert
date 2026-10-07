#!/bin/sh
# Backup di CivicAlert su server Linux: database + foto/video.
# Uso:  ./scripts/backup.sh          (dalla cartella del progetto)
# Ogni notte alle 3:  crontab -e  →  0 3 * * * cd /opt/civicalert && ./scripts/backup.sh >> /var/log/civicalert-backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
DEST=/var/backups/civicalert/$(date +%Y-%m-%d_%H%M)
KEEP_DAYS=${KEEP_DAYS:-30}
mkdir -p "$DEST"

docker compose exec -T db pg_dump -U civicalert -Fc civicalert > "$DEST/database.dump"
docker compose exec -T app tar -C /data -czf - uploads > "$DEST/uploads.tar.gz"

find /var/backups/civicalert -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +
echo "Backup completato in $DEST"
