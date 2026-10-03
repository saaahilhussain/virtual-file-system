#!/bin/bash
# SSM deploys the tested Git commit, with a private .env inside each backend.
set -euo pipefail
RELEASE_ID="$1"
[[ "$RELEASE_ID" =~ ^[0-9a-f]{40}$ ]] || exit 2
APP_DIR=/home/ubuntu/file-shelter
RELEASE_DIR="/home/ubuntu/releases/$RELEASE_ID-$(date -u +%Y%m%dT%H%M%S)-$$"
PREVIOUS=$(readlink -f "$APP_DIR" 2>/dev/null || true)
ARCHIVE=$(mktemp /var/tmp/file-shelter-backend.XXXXXX.tar.gz)
SWITCHED=0
finish() {
  status=$?
  trap - EXIT
  rm -f "$ARCHIVE"
  if [[ "$status" -ne 0 && "$SWITCHED" -eq 1 && -n "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "$APP_DIR.rollback"
    mv -Tf "$APP_DIR.rollback" "$APP_DIR"
    systemctl daemon-reload
    sudo -Hu ubuntu pm2 delete file-shelter-api >/dev/null 2>&1 || true
    sudo -Hu ubuntu pm2 start "$APP_DIR/infra/aws/ecosystem.config.cjs" --update-env
    sudo -Hu ubuntu pm2 save
    echo 'Deployment failed; restored previous PM2 release.'
  fi
  exit "$status"
}
trap finish EXIT
install -d -o ubuntu -g ubuntu -m 0750 /home/ubuntu/releases
sudo -Hu ubuntu env GIT_TERMINAL_PROMPT=0 git clone --no-checkout https://github.com/saaahilhussain/virtual-file-system.git "$RELEASE_DIR"
sudo -Hu ubuntu git -C "$RELEASE_DIR" cat-file -e "$RELEASE_ID^{commit}"
sudo -Hu ubuntu git -C "$RELEASE_DIR" merge-base --is-ancestor "$RELEASE_ID" origin/main
sudo -Hu ubuntu git -C "$RELEASE_DIR" checkout -B main "$RELEASE_ID"
sudo -Hu ubuntu git -C "$RELEASE_DIR" branch --set-upstream-to=origin/main main
sudo -Hu ubuntu git -C "$RELEASE_DIR" config pull.ff only
sudo -Hu ubuntu git -C "$RELEASE_DIR" config core.fileMode false
python3 - "$RELEASE_ID" "$ARCHIVE" <<'PY'
import boto3, sys
client = boto3.Session(region_name='ap-south-1').client('s3')
client.download_file('file-shelter-artifacts-821656895501-mumbai', f'releases/{sys.argv[1]}/backend.tar.gz', sys.argv[2])
PY
tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"
chown -R ubuntu:ubuntu "$RELEASE_DIR"
# Reject an artifact that differs from the server code whose tests passed.
sudo -Hu ubuntu git -C "$RELEASE_DIR" diff --exit-code -- server
sudo -Hu ubuntu bash -c 'cd "$1/server" && npm ci --omit=dev --no-audit --no-fund' -- "$RELEASE_DIR"
sudo -Hu ubuntu python3 "$RELEASE_DIR/infra/aws/refresh-runtime-env.py" --target "$RELEASE_DIR/server/.env"
sudo -Hu ubuntu git -C "$RELEASE_DIR" check-ignore server/.env
sudo -Hu ubuntu node --env-file="$RELEASE_DIR/server/.env" "$RELEASE_DIR/infra/aws/preflight.mjs"
install -d -o root -g root -m 0755 /usr/local/lib/file-shelter
install -o root -g root -m 0755 "$RELEASE_DIR/infra/aws/refresh-runtime-env.py" /usr/local/lib/file-shelter/refresh-runtime-env.py
install -m 0644 "$RELEASE_DIR/infra/aws/file-shelter-secrets.service" /etc/systemd/system/file-shelter-secrets.service
install -d /etc/systemd/system/pm2-ubuntu.service.d
install -m 0644 "$RELEASE_DIR/infra/aws/pm2-systemd-override.conf" /etc/systemd/system/pm2-ubuntu.service.d/override.conf
install -m 0644 "$RELEASE_DIR/infra/aws/pm2-logrotate.conf" /etc/logrotate.d/file-shelter-pm2
ln -sfn "$RELEASE_DIR" "$APP_DIR.next"
mv -Tf "$APP_DIR.next" "$APP_DIR"
SWITCHED=1
systemctl daemon-reload
systemctl enable file-shelter-secrets.service
systemctl restart file-shelter-secrets.service
# Re-create the process so PM2 drops absolute paths saved for the old release.
sudo -Hu ubuntu pm2 delete file-shelter-api >/dev/null 2>&1 || true
sudo -Hu ubuntu pm2 start "$APP_DIR/infra/aws/ecosystem.config.cjs" --update-env
sudo -Hu ubuntu pm2 save
systemctl enable pm2-ubuntu
# On a fresh host, move a manually started daemon into the startup service.
if ! systemctl is-active --quiet pm2-ubuntu; then
  sudo -Hu ubuntu pm2 kill >/dev/null 2>&1 || true
  systemctl reset-failed pm2-ubuntu
  systemctl start pm2-ubuntu
fi
# Preserve Certbot's existing HTTPS configuration.
if [[ ! -e /etc/nginx/sites-available/file-shelter ]]; then
  install -m 0644 "$RELEASE_DIR/infra/aws/nginx-api.conf" /etc/nginx/sites-available/file-shelter
fi
ln -sfn /etc/nginx/sites-available/file-shelter /etc/nginx/sites-enabled/file-shelter
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
curl --fail --silent --retry 10 --retry-connrefused --retry-delay 2 --retry-max-time 40 http://127.0.0.1:4000/
echo
echo "Backend commit $RELEASE_ID deployed under PM2; API health check passed."
