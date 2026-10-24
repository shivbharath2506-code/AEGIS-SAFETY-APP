# AEGIS — Deployment and Production Runbook

### 1. Docker Compose Deployment
To launch the full AEGIS backend with PostgreSQL and PostGIS on a production server:

1. **Clone repository:**
   ```bash
   git clone <repo-url> aegis
   cd aegis
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with production credentials:
   # Set NODE_ENV=production
   # Set DEV_MOCK_AUTH=false
   # Provide FIREBASE_PRIVATE_KEY and SMS_API_KEY
   ```

3. **Start containers:**
   ```bash
   docker compose up -d --build
   ```

4. **Verify container health:**
   ```bash
   docker compose ps
   curl http://localhost:5000/health
   ```

---

### 2. Standalone Node.js Deployment (e.g. Render, Railway, AWS EC2)
1. **Build TypeScript bundle:**
   ```bash
   cd backend
   npm ci
   npm run build
   ```

2. **Run migrations against managed PostgreSQL:**
   ```bash
   npm run migrate
   npm run seed
   ```

3. **Start production server:**
   ```bash
   npm run start
   ```

---

### 3. Production Security Checklist
- [ ] Set `NODE_ENV=production` in environment variables.
- [ ] Ensure `DEV_MOCK_AUTH` is set to `false`.
- [ ] Supply valid Firebase Admin SDK Service Account credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
- [ ] Configure real SMS gateway API keys (`SMS_PROVIDER=fast2sms` or `twilio`).
- [ ] Restrict `CORS_ORIGIN` to the deployed client domains instead of wildcard `*`.
- [ ] Enable TLS/HTTPS reverse proxy via NGINX, Cloudflare, or Caddy.
- [ ] Ensure PostGIS extensions are enabled on your database instance.
