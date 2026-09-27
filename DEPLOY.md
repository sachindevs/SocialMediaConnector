# Social Media Connector — Complete Deployment Guide

## Prerequisites

- Node.js 20+ and npm
- Git
- A [MongoDB Atlas](https://cloud.mongodb.com) account (free tier works)
- An [Upstash Redis](https://upstash.com) account (free tier works) — OR local Redis
- A [Google Cloud Console](https://console.cloud.google.com) project
- A [Speechmatics](https://www.speechmatics.com) account
- A [Vercel](https://vercel.com) account (for cloud deploy)
- A [Resend](https://resend.com) account (for email)

---

## 1. Local Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/social-media-connector.git
cd social-media-connector

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Generate VAPID keys for web push
npx web-push generate-vapid-keys

# Generate a random NEXTAUTH_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY (32 bytes = 64 hex chars)
openssl rand -hex 32

# Edit .env.local and fill in all values
nano .env.local

# Start development server
npm run dev

# In a separate terminal, start the BullMQ workers
npm run worker
```

The app runs at http://localhost:3000

---

## 2. MongoDB Atlas Setup

### 2.1 Create a Cluster

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a new project → Build a Database → Free (M0 Sandbox)
3. Choose your cloud provider and region closest to your Vercel deployment
4. Create a username and password (save these)
5. Add `0.0.0.0/0` to IP Access List (or restrict to Vercel IPs for production)

### 2.2 Get Connection String

1. Click Connect → Connect your application
2. Select Node.js driver
3. Copy the connection string — it looks like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add `/social-connector` before the `?` to specify the database name:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/social-connector?retryWrites=true&w=majority
   ```

### 2.3 Create Indexes (run once after first deploy)

Connect to your cluster via MongoDB Compass or Atlas Shell and run:

```javascript
// These are created automatically by Mongoose, but verify they exist:
db.conversations.createIndex({ tenantId: 1, status: 1, lastMessageAt: -1 });
db.conversations.createIndex({ tenantId: 1, externalContactId: 1, platform: 1 });
db.messages.createIndex({ conversationId: 1, sentAt: 1 });
db.messages.createIndex({ tenantId: 1, sentAt: -1 });
db.users.createIndex({ tenantId: 1, email: 1 }, { unique: true });
db.auditlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
```

### 2.4 Enable Atlas Search (for full-text search — Phase 5)

1. In Atlas, go to your cluster → Search → Create Search Index
2. Create index on `messages` collection:
   ```json
   {
     "mappings": {
       "fields": {
         "body": [{ "type": "string" }],
         "bodyTranslated": [{ "type": "string" }]
       }
     }
   }
   ```
3. Create index on `conversations` collection:
   ```json
   { "mappings": { "fields": { "contactName": [{ "type": "string" }] } } }
   ```

---

## 3. Redis Setup (Upstash — recommended for Vercel)

1. Go to [upstash.com](https://upstash.com) → Create Database
2. Choose region close to your Vercel deployment
3. Copy the `REDIS_URL` (starts with `rediss://`)
4. Set `REDIS_URL` in your environment variables

For local development, run Redis via Docker:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

---

## 4. Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing
3. APIs & Services → OAuth consent screen:
   - User type: External
   - App name: Social Media Connector
   - Add scopes: `email`, `profile`, `openid`
4. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: Social Connector
   - Authorized JavaScript origins: `https://your-domain.vercel.app` (and `http://localhost:3000` for dev)
   - Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for dev)
5. Copy `Client ID` → `GOOGLE_CLIENT_ID`
6. Copy `Client Secret` → `GOOGLE_CLIENT_SECRET`

---

## 5. Speechmatics Setup

1. Go to [speechmatics.com](https://www.speechmatics.com) → Sign up
2. API Keys → Create API Key
3. Note both the **Language Identification API** and **Translation API** are covered by one key
4. In your platform admin settings (after deploy), enter this key per tenant
5. The key is stored encrypted in MongoDB using AES-256-GCM

---

## 6. WhatsApp Business (Meta Cloud API) Setup

> **Start this in Week 1 — Meta verification takes 1–5 business days.**

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App
2. App type: Business
3. Add WhatsApp product to your app
4. Follow the setup wizard to create a WhatsApp Business Account
5. Under WhatsApp → API Setup:
   - Note your **Phone Number ID**
   - Generate a **Permanent Access Token**
6. Under Webhooks → Configure:
   - Callback URL: `https://your-domain.vercel.app/api/webhooks/whatsapp/{TENANT_ID}`
   - Verify Token: set a random string — this goes into `webhookSecret` in ChannelConfig
   - Subscribe to: `messages`
7. In your platform Channel Config page, enter:
   - Phone Number ID
   - Access Token
   - Webhook Secret (the verify token you set above)

---

## 7. Telegram Bot Setup

> Can be done immediately — no approval required.

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` → follow the prompts
3. Copy the **Bot Token** (e.g. `7123456789:AAFxxx...`)
4. In your platform Channel Config page, enter the Bot Token
5. The platform will automatically call Telegram's `setWebhook` API to register your webhook URL:
   ```
   https://your-domain.vercel.app/api/webhooks/telegram/{TENANT_ID}
   ```

---

## 8. LinkedIn Messaging API Setup

> **Start this in Week 1 — LinkedIn API approval takes 2–6 weeks.**

1. Go to [linkedin.com/developers](https://www.linkedin.com/developers) → Create App
2. Fill in app details, attach to a LinkedIn Company Page
3. Under Products → Request access to **Marketing Developer Platform** and **Sign In with LinkedIn**
4. After approval, go to Auth → Application credentials:
   - Copy `Client ID` → `LINKEDIN_CLIENT_ID`
   - Copy `Client Secret` → `LINKEDIN_CLIENT_SECRET`
5. Add Authorized redirect URLs:
   ```
   https://your-domain.vercel.app/api/auth/linkedin/callback
   ```
6. Under Webhooks, configure:
   ```
   https://your-domain.vercel.app/api/webhooks/linkedin/{TENANT_ID}
   ```
7. In your platform, use the "Connect LinkedIn Page" button to complete OAuth flow

---

## 9. Vercel Deployment (Recommended)

### 9.1 Install Vercel CLI and deploy

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 9.2 Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add all variables from `.env.example`:

| Variable | Value |
|---|---|
| `NEXTAUTH_SECRET` | Run `openssl rand -hex 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Upstash Redis URL |
| `ENCRYPTION_KEY` | Run `openssl rand -hex 32` |
| `SPEECHMATICS_BASE_URL` | `https://translation.api.speechmatics.com` |
| `LINKEDIN_CLIENT_ID` | From LinkedIn Developer Portal |
| `LINKEDIN_CLIENT_SECRET` | From LinkedIn Developer Portal |
| `RESEND_API_KEY` | From resend.com |
| `VAPID_PUBLIC_KEY` | From `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | From `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:admin@yourdomain.com` |

### 9.3 Deploy Workers (BullMQ)

> Vercel serverless functions cannot run long-lived workers. Use one of:

**Option A — Railway.app (Recommended)**
```bash
# Create a Railway project, link to same repo
# Add a separate service with start command:
npm run worker
# Set same environment variables
```

**Option B — Fly.io**
```bash
fly launch --dockerfile Dockerfile.worker
fly deploy
```

**Option C — VPS (DigitalOcean / AWS EC2)**
```bash
# On your server:
git clone https://github.com/your-org/social-media-connector.git
cd social-media-connector
cp .env.example .env.local  # fill in values
npm install
npm run worker

# Use PM2 to keep it running:
npm install -g pm2
pm2 start "npm run worker" --name social-worker
pm2 save
pm2 startup
```

---

## 10. Docker Deployment (Self-Hosted)

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f app
docker-compose logs -f worker

# Stop
docker-compose down

# Update after code change
docker-compose up -d --build app worker
```

The app runs at http://localhost:3000

---

## 11. Webhook URL Reference

After deploying, configure these webhook URLs in each platform's dashboard:

| Platform | Webhook URL |
|---|---|
| WhatsApp | `https://YOUR_DOMAIN/api/webhooks/whatsapp/TENANT_ID` |
| Telegram | Set automatically via `setWebhook` in Channel Config UI |
| LinkedIn | `https://YOUR_DOMAIN/api/webhooks/linkedin/TENANT_ID` |

Replace `TENANT_ID` with your MongoDB Tenant `_id` (visible in browser URL after login).

---

## 12. Post-Deployment Verification Checklist

After deploying, verify these work:

- [ ] **Login**: Visit `/login` → Google Sign-In → redirected to `/dashboard/inbox`
- [ ] **Tenant created**: Check MongoDB Atlas → `tenants` collection has a new document
- [ ] **Telegram**: Connect a bot → send a message → appears in inbox within 3 seconds
- [ ] **WhatsApp**: Configure channel → send a WhatsApp message → appears in inbox
- [ ] **Reply**: Send a reply from inbox → check it arrives in WhatsApp/Telegram
- [ ] **Translation**: Send a non-English message → English version appears within 5 seconds
- [ ] **Outbound translation**: Enable toggle → send a reply → check customer receives translated message
- [ ] **Analytics**: `/dashboard/analytics` loads without error
- [ ] **Workers**: Check BullMQ workers are running — no jobs stuck in `failed` state
- [ ] **SSL**: All HTTPS — webhooks require HTTPS; Vercel handles this automatically

---

## 13. Troubleshooting

### Messages not appearing in inbox
1. Check BullMQ worker is running: `npm run worker`
2. Check Redis connection: `redis-cli ping` should return `PONG`
3. Check webhook is configured correctly — use [webhook.site](https://webhook.site) to debug

### Google OAuth error "redirect_uri_mismatch"
- Add `https://your-domain.vercel.app/api/auth/callback/google` to Google Console → Credentials → Authorized redirect URIs

### WhatsApp webhook verification fails
- Ensure the verify token in your platform Channel Config matches the one set in Meta Developer Console exactly

### Translation not working
- Check `speechmaticsEnabled: true` and `speechmaticsApiKey` is set for the tenant in MongoDB
- Check the circuit breaker state: `redis-cli get circuit:speechmatics:TENANT_ID:state`
- Check translation worker logs for errors

### Socket.io not connecting
- Ensure the custom server (`server.ts`) is being used, not the default Next.js server
- Check `SOCKET_SECRET` env var is set

---

## Environment Variables Quick Reference

```env
NEXTAUTH_SECRET=          # Required — random 32-byte secret
NEXTAUTH_URL=             # Required — your app URL
GOOGLE_CLIENT_ID=         # Required — from Google Console
GOOGLE_CLIENT_SECRET=     # Required — from Google Console
MONGODB_URI=              # Required — MongoDB Atlas connection string
REDIS_URL=                # Required — Upstash or local Redis
ENCRYPTION_KEY=           # Required — 64 hex chars (openssl rand -hex 32)
SPEECHMATICS_BASE_URL=    # Optional — defaults to Speechmatics API URL
LINKEDIN_CLIENT_ID=       # Required for LinkedIn integration
LINKEDIN_CLIENT_SECRET=   # Required for LinkedIn integration
RESEND_API_KEY=           # Required for email (invites, alerts)
VAPID_PUBLIC_KEY=         # Required for browser push notifications
VAPID_PRIVATE_KEY=        # Required for browser push notifications
VAPID_SUBJECT=            # Required — mailto:admin@yourdomain.com
SOCKET_SECRET=            # Required for Socket.io auth
```
