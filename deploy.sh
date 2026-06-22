#!/bin/bash
set -e

DOMAIN="os.ekvaar.com"

echo "======================================"
echo "EKVAAR OS - Production Deployment"
echo "======================================"

# 1. Verify Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "[!] Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
fi

if ! docker compose version &> /dev/null; then
    echo "[!] Docker Compose plugin not found. Please install docker-compose-plugin."
    exit 1
fi

# 2. Firewall Rules
echo "[*] Configuring Firewall (iptables)..."
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save || echo "[!] Failed to save iptables, make sure iptables-persistent is installed."

# 3. Request Let's Encrypt Certificate
echo "[*] Setting up Let's Encrypt Certificate for $DOMAIN..."
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    sudo apt-get update
    sudo apt-get install -y certbot
    sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos -m admin@ekvaar.com
else
    echo "[*] Certificate already exists. Attempting renewal..."
    sudo certbot renew
fi

# 5. Build and Deploy Containers
echo "[*] Starting Docker Containers..."
docker compose build
docker compose up -d

echo "[*] Deployment Complete!"
echo "Verify at: https://$DOMAIN"
