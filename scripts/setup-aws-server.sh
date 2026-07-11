#!/bin/bash
set -e

echo "======================================"
echo "EKVAAR OS - Initial Server Setup"
echo "======================================"

DOMAIN="os.ekvaar.com"

if [ -z "$1" ]; then
  echo "Usage: $0 <email-for-certbot>"
  echo "Example: $0 admin@ekvaar.com"
  exit 1
fi

EMAIL="$1"

echo "[*] Updating system packages..."
sudo apt-get update

echo "[*] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
fi

echo "[*] Installing Docker Compose..."
sudo apt-get install -y docker-compose-plugin

echo "[*] Configuring firewall..."
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 22 -j ACCEPT
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save 2>/dev/null || echo "[!] iptables-persistent not available"

echo "[*] Setting up SSL certificate..."
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

echo "[*] Moving certificates..."
sudo mkdir -p /etc/ssl/ekvaar
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/ssl/ekvaar/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/ssl/ekvaar/
sudo chmod 644 /etc/ssl/ekvaar/fullchain.pem
sudo chmod 600 /etc/ssl/ekvaar/privkey.pem

echo "[*] Cloning repository..."
cd ~
if [ ! -d "EKVAAR" ]; then
  git clone https://github.com/KashinathTilagul/Ekvaar.git
fi

cd ~/EKVAAR

echo "[*] Creating .env file..."
if [ ! -f ".env" ]; then
  cat > .env << ENVEOF
DATABASE_URL=file:/app/db/custom.db
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://$DOMAIN
JWT_SECRET=$(openssl rand -base64 32)
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0
ENVEOF
  echo "[!] Please edit .env to add your API keys (COMPOSIO_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY)"
fi

echo "[*] Building and starting containers..."
docker compose build
docker compose up -d

echo "[*] Setting up certificate renewal cron..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/ssl/ekvaar/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/ssl/ekvaar/ && docker restart ekvaar-nginx-1") | crontab -

echo ""
echo "======================================"
echo "[✓] Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit ~/EKVAAR/.env to add your API keys"
echo "2. Restart containers: docker compose restart"
echo "3. Verify at: https://$DOMAIN"
echo ""
