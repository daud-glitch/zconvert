# Vercel (website) + Oracle Free (conversion worker)

Site **Vercel** par, bari files + **audio (ffmpeg)** **Oracle Always Free VM** par.

---

## Architecture

```
Browser  →  Vercel (UI, login, formats)
         →  Oracle VM https://YOUR_IP:3000/api/convert/...  (40–100 MB, WAV→MP3)
```

Vercel env:

```env
NEXT_PUBLIC_CONVERT_API_URL=https://convert.yourdomain.com
NEXT_PUBLIC_MAX_UPLOAD_MB=100
NEXT_PUBLIC_MEDIA_ENABLED=1
NEXT_PUBLIC_AUDIO_ENABLED=1
NEXT_PUBLIC_VIDEO_ENABLED=1
```

Oracle / self-hosted worker env:

```env
ALLOWED_ORIGIN=https://your-app.vercel.app
MAX_UPLOAD_SIZE_MB=100
NEXT_PUBLIC_MAX_UPLOAD_MB=100
EXTERNAL_TOOLCHAIN_ENABLED=1
ADMIN_SETUP_SECRET=long-random-secret
# Optional toolchain paths
FFMPEG_BIN=
SOFFICE_BIN=
CALIBRE_EBOOK_CONVERT_BIN=
RAR_BIN=
```

**Note:** On Vercel alone (no worker), upload is capped ~4.5 MB and ffmpeg audio/video is off unless `FORCE_FFMPEG=1` or `NEXT_PUBLIC_CONVERT_API_URL` points at a worker.

---

## Part 1 — Oracle Cloud (Always Free VM)

### 1. Account

1. [cloud.oracle.com](https://cloud.oracle.com) → Sign up (card verify).
2. **Home region** choose karein (e.g. `uk-london-1`) — baad mein change mushkil.
3. **Paid resources enable mat karein** jab tak trial/paid na chaho.

### 2. VM create (Ampere A1)

1. **Compute → Instances → Create instance**
2. Name: `zconvert-worker`
3. Image: **Ubuntu 22.04** (aarch64)
4. Shape: **Ampere** → `VM.Standard.A1.Flex` → **2 OCPU, 12 GB RAM** (ya 4 OCPU / 24 GB agar quota ho)
5. Boot volume: **50 GB**
6. **Public IPv4** assign karein
7. Download **SSH private key** (.key file)
8. Create

### 3. Firewall (Oracle + Ubuntu)

**Oracle Security List (VCN):**

- Ingress: TCP **22** (SSH — sirf apna IP agar ho sake)
- Ingress: TCP **80**, **443** (web)
- Optional: TCP **3000** testing ke liye (baad mein band kar dein)

**Ubuntu (SSH ke baad):**

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

### 4. Server setup

SSH (Windows PowerShell):

```powershell
ssh -i "C:\path\to\ssh-key.key" ubuntu@YOUR_PUBLIC_IP
```

Server par:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker ubuntu
newgrp docker
```

### 5. Deploy zconvert worker

```bash
git clone https://github.com/YOUR_USER/zconvert.git
cd zconvert
```

`.env` file:

```bash
cat > .env << 'EOF'
ALLOWED_ORIGIN=https://your-app.vercel.app
MAX_UPLOAD_SIZE_MB=100
DATABASE_URL=
EOF
```

Build & run:

```bash
export DOCKER_BUILD=1
docker compose build
docker compose up -d
docker compose logs -f
```

Test:

```bash
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/ready
```

Browser: `http://YOUR_PUBLIC_IP:3000` (sirf test — production mein HTTPS domain use karein)

---

## Part 2 — HTTPS domain (recommended)

### Option A — Cloudflare Tunnel (free, no port 443 on VM)

1. [Cloudflare](https://dash.cloudflare.com) → Zero Trust → Tunnels
2. Connector install on Oracle VM
3. Public hostname: `convert.yourdomain.com` → `http://localhost:3000`

### Option B — Caddy + domain DNS

Point `convert.yourdomain.com` A record → Oracle public IP, phir Caddy reverse proxy (port 443).

---

## Part 3 — Vercel configuration

Vercel project → **Settings → Environment Variables**:

| Variable | Value | Environment |
|----------|--------|-------------|
| `NEXT_PUBLIC_CONVERT_API_URL` | `https://convert.yourdomain.com` | Production |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | `100` | Production |
| `ALLOWED_ORIGIN` | `https://your-app.vercel.app` | Production |

**Redeploy** Vercel after saving.

Ab browser convert requests **Oracle** par jayengi; baaki site Vercel par.

---

## Part 4 — Verify WAV → MP3

1. Vercel site open karein
2. ~40 MB `.wav` upload → target **MP3**
3. Network tab: request URL `https://convert.yourdomain.com/api/convert/other` honi chahiye
4. Success → MP3 download

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error | Oracle `ALLOWED_ORIGIN` = exact Vercel URL (no trailing `/`) |
| Connection refused | Security list + `docker compose ps` |
| Audio still blocked | `NEXT_PUBLIC_CONVERT_API_URL` set? Redeploy Vercel |
| `ffmpeg` missing | Rebuild image: `docker compose build --no-cache` |
| DOMMatrix / pdf | Worker image mein latest `pdf-parse-node` code hona chahiye |

---

## Costs

- Oracle **Always Free** = $0 agar paid resources enable na kiye
- Vercel free tier = UI hosting
- Cloudflare Tunnel = $0

---

## Optional: worker-only (lighter VM)

Agar sirf API chahiye, same Docker image chalta hai — UI bhi worker par khulega lekin users Vercel use karenge. Baad mein alag `convert-only` service split ho sakti hai.

---

## Quick reference

```bash
# Oracle par update
cd zconvert && git pull
export DOCKER_BUILD=1
docker compose build && docker compose up -d
```

```env
# Vercel
NEXT_PUBLIC_CONVERT_API_URL=https://convert.yourdomain.com
```
