# Direct EC2 Deployment Script (Bypasses GitHub Actions)
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\deploy-direct.ps1

$EC2_HOST = "98.130.17.227"
$EC2_USER = "ubuntu"
$KEY_PATH = "C:\Users\zomat\.ssh\ekvaar-ec2"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " EKVAAR OS - Direct Server Deployment " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Write-Host "[1/4] Pushing latest local git commits to origin/main..." -ForegroundColor Yellow
git push origin main --tags

Write-Host "[2/4] Connecting to EC2 ($EC2_HOST) via SSH..." -ForegroundColor Yellow

$scriptContent = @'
set -e
cd ~/Ekvaar 2>/dev/null || cd ~/EKVAAR 2>/dev/null || { echo '[x] Repo directory not found'; exit 1; }
echo "[i] Server working directory: $(pwd)"
git fetch origin
git reset --hard origin/main
echo "[i] Now at commit: $(git rev-parse --short HEAD)"

if [ $(swapon --show | wc -l) -eq 0 ]; then
  echo '[i] Enabling 2GB swap space...'
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile || true
  sudo swapon /swapfile || true
fi

mkdir -p db apps/frontend/db
sudo chmod -R 777 db apps/frontend/db 2>/dev/null || true

echo '[i] Reclaiming Docker storage...'
sudo docker image prune -f || true
sudo docker container prune -f || true

echo '[i] Building Docker containers...'
sudo docker compose build --progress=plain

echo '[i] Starting Docker containers...'
sudo docker compose up -d --remove-orphans

echo '[i] Verifying health check on localhost...'
for i in $(seq 1 36); do
  STATUS=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -H "Host: os.ekvaar.com" https://localhost/api/health || echo 000)
  if [ "$STATUS" = "200" ]; then
    echo "[ok] Health check PASSED (HTTP 200) on attempt $i!"
    exit 0
  fi
  echo "[i] Waiting for app... attempt $i (HTTP $STATUS)"
  sleep 5
done

if [ "$STATUS" != "200" ]; then
  echo "[x] App health check failed (HTTP $STATUS). Container logs:"
  sudo docker compose logs --tail 50
  exit 1
fi
'@

$scriptFile = [System.IO.Path]::GetTempFileName() + ".sh"
[System.IO.File]::WriteAllText($scriptFile, $scriptContent)

Get-Content $scriptFile -Raw | ssh -i $KEY_PATH -o StrictHostKeyChecking=no "${EC2_USER}@${EC2_HOST}" "bash -s"

Remove-Item -Path $scriptFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] EKVAAR OS Deployed & Verified Live!" -ForegroundColor Green
    Write-Host " URL: https://os.ekvaar.com" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Write-Host "[!] Deployment finished with code $LASTEXITCODE." -ForegroundColor Yellow
}
