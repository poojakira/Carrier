# Production Deployment Guide

## HTTPS Configuration

Careerly OS requires HTTPS in production for:
- Secure session cookies (`Secure` flag is set when `NODE_ENV=production`)
- OAuth callbacks (Google requires HTTPS redirect URIs in production)
- HSTS enforcement via `Strict-Transport-Security` header

### Option 1: Reverse Proxy (Recommended for self-hosting)

Use Nginx or Caddy in front of the Node.js container:

```nginx
# /etc/nginx/sites-available/careerly
server {
    listen 443 ssl http2;
    server_name careerly.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/careerly.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/careerly.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name careerly.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

For automatic Let's Encrypt certificates with Caddy:

```
careerly.yourdomain.com {
    reverse_proxy localhost:3000
}
```

### Option 2: Cloud Platform

Deploy to Vercel, Railway, or Render — HTTPS is automatic:

```bash
# Vercel
npx vercel --prod

# Railway
railway up

# Docker on any cloud with a load balancer
docker compose -f docker-compose.yml up -d
```

Cloud load balancers (AWS ALB, GCP LB, Azure App Gateway) handle TLS termination automatically when you attach a certificate.

### Option 3: Docker Compose with Traefik

Add Traefik as a reverse proxy with automatic Let's Encrypt:

```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports: ["80:80", "443:443"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt

  web:
    build: .
    labels:
      - "traefik.http.routers.careerly.rule=Host(`careerly.yourdomain.com`)"
      - "traefik.http.routers.careerly.tls.certresolver=letsencrypt"
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_APP_URL: https://careerly.yourdomain.com
      # ... other env vars

volumes:
  letsencrypt:
```

## Environment Variables for Production

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://careerly.yourdomain.com
DATABASE_URL=postgresql://user:password@db-host:5432/careerly?schema=public&sslmode=require
AUTH_SECRET=<64-char-random-hex>
APP_ENCRYPTION_KEY=<32-byte-base64-key>
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
GOOGLE_REDIRECT_URI=https://careerly.yourdomain.com/api/integrations/google/callback
RESEND_API_KEY=<from-resend.com-dashboard>
```

## Security Checklist

- [ ] HTTPS enabled with valid TLS certificate
- [ ] `NEXT_PUBLIC_APP_URL` set to the HTTPS URL
- [ ] `AUTH_SECRET` is a unique 64-character random hex string
- [ ] `APP_ENCRYPTION_KEY` is a unique 32-byte base64 key
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] Google OAuth redirect URI uses HTTPS
- [ ] RESEND_API_KEY configured for email notifications
- [ ] Session cookies have `Secure` flag (automatic in production)
- [ ] HSTS header is served (configured in next.config.ts)
- [ ] Database credentials are not the defaults
- [ ] Firewall restricts Postgres port to the application server only

## Why "Not Secure" Appears in Development

Browsers show "Not Secure" for any HTTP connection. This is expected at `http://localhost:3000`. In production, once HTTPS is configured, the browser will show the lock icon. The security headers in `next.config.ts` will also enforce HSTS, preventing protocol downgrade attacks.
