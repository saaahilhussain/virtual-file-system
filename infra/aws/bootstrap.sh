#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y git nginx ca-certificates curl gnupg unzip python3 python3-boto3 certbot python3-certbot-nginx
install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --batch --yes --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main' > /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs
npm install -g pm2@7.0.4
id -u ubuntu >/dev/null
install -d -o ubuntu -g ubuntu -m 0750 /home/ubuntu/releases
install -d -o root -g root -m 0755 /usr/local/lib/file-shelter
# PM2's systemd unit restores its saved process list after reboot. Deployment
# adds a dependency on the runtime-secret refresh service before enabling it.
pm2 startup systemd -u ubuntu --hp /home/ubuntu
if [ ! -s /home/ubuntu/.pm2/dump.pm2 ]; then
  systemctl disable pm2-ubuntu
fi
systemctl enable --now nginx
if snap list amazon-ssm-agent >/dev/null 2>&1; then
  snap start amazon-ssm-agent
else
  snap install amazon-ssm-agent --classic
  snap start amazon-ssm-agent
fi
# Swap absorbs occasional Node/npm peaks on the small demo host.
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
node --version
pm2 --version
nginx -t
