<!-- cSpell:disable -->
<!-- markdownlint-disable -->

# KnowYourMail — Complete Project Documentation

> **Version:** 1.0 · **Last updated:** June 2026
> **Author:** VP of Engineering · **Status:** Production-ready for 100-user launch



## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Service Breakdown](#3-service-breakdown)
4. [Email Delivery Pipeline (End-to-End)](#4-email-delivery-pipeline-end-to-end)
5. [Technology Stack](#5-technology-stack)
6. [API Surface](#6-api-surface)
7. [Database Schema Overview](#7-database-schema-overview)
8. [DNS & Email Authentication](#8-dns--email-authentication)
9. [Infrastructure & Deployment Guide](#9-infrastructure--deployment-guide)
10. [Cost Analysis (100 Users)](#10-cost-analysis-100-users)
11. [Scaling Roadmap](#11-scaling-roadmap)



## 1. Product Overview

**KnowYourMail** is a multi-tenant email infrastructure SaaS platform that gives businesses full control over their email sending pipeline. Unlike traditional email marketing tools, KnowYourMail operates as a **white-label SMTP relay** — customers bring their own domains, authenticate them (SPF, DKIM, DMARC), and send emails through our infrastructure while maintaining full brand identity.

### Core Value Proposition

| Capability | Description |
|:---|:---|
| **Custom Domain Email Sending** | Customers send from their own domains (e.g., `campaign@promptbook.co.in`), not from a shared domain |
| **DKIM Signing** | Automatic per-domain DKIM key generation and signing — emails pass authentication |
| **Real-Time Tracking** | Open/click tracking with Apple Mail Privacy Protection (MPP) detection and bot filtering |
| **Campaign Management** | Create campaigns, upload recipients via CSV, segment audiences, and schedule dispatch |
| **Webhook Events** | Real-time delivery/open/click/bounce events pushed to customer endpoints via HMAC-signed webhooks |
| **Multi-Provider Relay** | Failover routing across Mailgun, Amazon SES, and Postmark with automatic health-based selection |
| **Analytics Dashboard** | Daily aggregates, campaign-level insights, conversion tracking |
| **Billing & Payments** | Razorpay-integrated subscription billing with webhook-driven state machine |
| **AI Email Generation** | AI-powered email copy generation, rewriting, spam scoring, and deliverability analysis |

### Target Market

- Startups and SMBs needing branded transactional/marketing email infrastructure
- Marketing agencies managing multiple client domains
- SaaS companies needing white-label email sending capabilities



## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            KnowYourMail Architecture                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐     ┌──────────────────┐     ┌──────────────────────────┐       │
│  │  React SPA   │────▶│  Laravel API      │────▶│  PostgreSQL (Supabase)   │       │
│  │  (Vite +     │     │  (Campaign Mgmt,  │     │  - Campaigns, Recipients │       │
│  │   Tailwind)  │     │   Auth, RBAC,     │     │  - RBAC, Payments        │       │
│  │              │     │   Billing, AI)    │     │  - Send Logs, Analytics  │       │
│  └─────────────┘     └──────────────────┘     │  - SMTP Configs          │       │
│                             │                  │  - Domain/DKIM Keys      │       │
│                             │ Dispatch         └──────────────────────────┘       │
│                             ▼                           ▲                         │
│  ┌──────────────────────────────────────────┐           │                         │
│  │         SMTP Relay Services (Node.js)     │           │                         │
│  │                                            │           │                         │
│  │  ┌──────────┐  ┌────────┐  ┌───────────┐ │           │                         │
│  │  │  Haraka   │─▶│ Redis  │─▶│  Worker   │─┼───────────┘                         │
│  │  │  (SMTP    │  │(BullMQ)│  │ (DKIM     │ │                                     │
│  │  │  Server)  │  │        │  │  Sign +   │ │    ┌────────────────────────┐       │
│  │  │  Port 25  │  │        │  │  Deliver) │─┼───▶│  Email Providers       │       │
│  │  │  Port 587 │  │        │  │           │ │    │  ├─ Mailgun (MIME API) │       │
│  │  └──────────┘  └────────┘  └───────────┘ │    │  ├─ Amazon SES          │       │
│  │                                │           │    │  └─ Postmark            │       │
│  │  ┌──────────────────────────────┘          │    └────────────────────────┘       │
│  │  │                                         │                                     │
│  │  │  ┌──────────┐                           │    ┌────────────────────────┐       │
│  │  └─▶│ Tracker  │──────────────────────────┼───▶│  Webhook Endpoints     │       │
│  │     │ (Fastify │                           │    │  (Customer servers)    │       │
│  │     │  :3001)  │                           │    └────────────────────────┘       │
│  │     └──────────┘                           │                                     │
│  └──────────────────────────────────────────┘                                     │
│                                                                                    │
│  ┌─────────────────┐                                                               │
│  │ Landing Page     │  ← Cloudflare Pages (Static Vite build)                      │
│  │ (knowyourmail.in)│                                                               │
│  └─────────────────┘                                                               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Separation of Concerns** — Campaign management (Laravel) is completely decoupled from email relay (Node.js). They communicate only through the shared PostgreSQL database and Redis job queue.
2. **Queue-Driven Delivery** — All email sending is asynchronous via BullMQ, enabling retry logic, backoff, and provider failover.
3. **Multi-Tenant by Default** — Every resource is scoped to an `organization_id`. No data leaks between tenants.
4. **Custom DKIM at the Application Layer** — We sign emails with per-domain DKIM keys using Nodemailer before handing them to the relay provider, ensuring full authentication alignment.



## 3. Service Breakdown

### 3.1 — `mail-tracker` (Laravel Application)

**Role:** Campaign management platform, frontend, auth, billing, and analytics.

| Component | Technology | Description |
|:---|:---|:---|
| Backend | Laravel 13 + PHP 8.3 | REST API, Sanctum auth, queue workers, scheduled commands |
| Frontend | React 18 + Vite + Tailwind CSS 4 | Single-page application with Zustand state management |
| Template Builder | GrapesJS | Drag-and-drop email template editor |
| AI Module | Prism PHP + Laravel AI | Email generation, rewriting, spam scoring |
| Payments | Razorpay API | Order creation, checkout verification, webhook processing |
| Server | Nginx + PHP-FPM | Serves both API and SPA |

**Key Features:**
- User registration, login, RBAC with role/permission middleware
- Campaign CRUD with variant-based segmentation
- CSV bulk recipient import with column auto-detection
- Segment assignment (AND/OR filter groups)
- Scheduled campaign dispatch (every-minute cron)
- Open/click tracking endpoints (1x1 pixel + redirect)
- SMTP configuration management (org-scoped)
- Sender domain management with DNS verification
- SMTP credential management with test-send functionality
- Suppression list management (bounces/complaints)
- Billing dashboard with plans, history, and subscription renewals



### 3.2 — `kym-relay-services` (Node.js Monorepo)

**Role:** SMTP ingestion, DKIM signing, email delivery via relay providers, and engagement tracking.

#### 3.2.1 — Haraka SMTP Server

| Detail | Value |
|:---|:---|
| Port | 25 (SMTP), 587 (Submission) |
| Runtime | Haraka SMTP framework (Node.js) |
| Auth | Custom `auth_backend.js` — validates SMTP credentials against PostgreSQL |

**Plugin Pipeline (in order):**

```
1. auth_backend.js     → Authenticates SMTP user against DB credentials
2. validate_domain.js  → Verifies sender domain belongs to the authenticated org
3. rate_limit.js       → Per-org and per-credential rate limiting via Redis
4. abuse_detection.js  → Content-based abuse detection (spam patterns)
5. store_message.js    → Saves message metadata + recipients to PostgreSQL
6. route_relay.js      → Queues email delivery jobs to BullMQ (Redis)
```

#### 3.2.2 — BullMQ Worker

| Detail | Value |
|:---|:---|
| Queue | `email-delivery` |
| Technology | BullMQ + ioredis |
| DKIM | Nodemailer `streamTransport` with per-domain key signing |

**Delivery Flow:**
1. Fetch provider via health-based routing (`selectRelayProvider`)
2. Inject tracking pixels/links into HTML body
3. Compile MIME message with DKIM signature using Nodemailer
4. Send via Mailgun MIME API / SES `SendRawEmail` / Postmark API
5. Update `message_recipients` status to `delivered`
6. Queue webhook events for customer endpoints

**Provider Support:**

| Provider | Method | DKIM Handling |
|:---|:---|:---|
| Mailgun | MIME API (`messages.mime`) | `o:dkim=no` — we handle signing |
| Amazon SES | `SendRawEmailCommand` | Pre-signed MIME passed directly |
| Postmark | JSON API | Standard API integration |

#### 3.2.3 — Tracker Server (Fastify)

| Detail | Value |
|:---|:---|
| Port | 3001 |
| Technology | Fastify + PostgreSQL + BullMQ |

**Endpoints:**
- `GET /track/open/:recipientId` — Returns 1x1 transparent GIF, logs open event
- `GET /track/click/:linkId/:recipientId` — Logs click, 302 redirects to original URL

**Smart Classification:**
- **Human opens** — Real user interactions
- **Bot opens** — Crawler/spider detection via User-Agent
- **Proxy prefetches** — Apple Mail Privacy Protection (MPP), Google Image Proxy, Yahoo proxy detection



### 3.3 — Landing Page

| Detail | Value |
|:---|:---|
| Technology | Vanilla JS + Vite |
| Hosting | Cloudflare Pages |
| Domain | `knowyourmail.in` |



## 4. Email Delivery Pipeline (End-to-End)

```
Campaign Created (Laravel)
         │
         ▼
Scheduled Dispatch (artisan campaigns:dispatch, every minute)
         │
         ▼
Segment Assignment (AssignSegmentsJob — assigns recipients to variants)
         │
         ▼
Send Logs Created (pending status, one per recipient)
         │
         ▼
Laravel SMTP Send (SendCampaignEmailJob → BulkMail Mailable)
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    Haraka SMTP Server (Port 25)                │
│                                                                │
│  1. auth_backend     → SMTP LOGIN verified against DB          │
│  2. validate_domain  → Sender domain belongs to org?           │
│  3. rate_limit       → Within quota?                           │
│  4. abuse_detection  → Content ok?                             │
│  5. store_message    → INSERT into messages + message_recipients│
│  6. route_relay      → Queue BullMQ job (email-delivery)       │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    BullMQ Worker                               │
│                                                                │
│  1. selectRelayProvider()     → Health-based provider selection │
│  2. injectTracking()         → Open pixel + click link rewrite │
│  3. compileMessageWithDKIM() → Nodemailer DKIM signing         │
│  4. deliverEmail()           → Mailgun MIME API / SES / PM     │
│  5. updateRecipientStatus()  → DB: status → 'delivered'        │
│  6. queueWebhookEvent()      → Customer webhook dispatch       │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
Email arrives in recipient's inbox
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    Tracker Server (Port 3001)                  │
│                                                                │
│  Open Pixel Hit  → classifyRequest() → log event → webhook    │
│  Click Link Hit  → log event → webhook → 302 redirect         │
│  Daily Analytics → Aggregate counters (org + domain + date)    │
└────────────────────────────────────────────────────────────────┘
```



## 5. Technology Stack

### Backend

| Layer | Technology | Version |
|:---|:---|:---|
| Campaign Manager | Laravel | 13.x |
| Language | PHP | 8.3 |
| SMTP Server | Haraka | Latest |
| API/Worker/Tracker | Node.js + TypeScript | 22.x |
| HTTP Framework | Fastify | 4.x |
| Job Queue | BullMQ | 5.x |
| DKIM Signing | Nodemailer | 6.x |
| Authentication | Laravel Sanctum | 4.x |
| Input Validation | Zod | 3.x |
| Email Provider SDK | AWS SDK (SES) | 3.x |

### Frontend

| Layer | Technology | Version |
|:---|:---|:---|
| Framework | React | 18.x |
| Build Tool | Vite | 8.x |
| CSS | Tailwind CSS | 4.x |
| State | Zustand | 4.x |
| HTTP Client | Axios | 1.x |
| Icons | Lucide React | 0.4x |
| Charts | Recharts | 2.x |
| Drag-and-Drop | dnd-kit | 6.x |
| Template Editor | GrapesJS | 0.22 |
| Animations | Framer Motion | 11.x |
| XSS Protection | DOMPurify | 3.x |

### Infrastructure

| Layer | Technology |
|:---|:---|
| Database | PostgreSQL (via Supabase) |
| Cache/Queue | Redis 7 (Alpine) |
| Reverse Proxy | Nginx |
| Containerization | Docker + Docker Compose |
| DNS/CDN | Cloudflare |
| Payments | Razorpay |



## 6. API Surface

### 6.1 — Laravel API (`/api`)

| Category | Endpoints | Auth |
|:---|:---|:---|
| **Auth** | `POST /auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password` | Public (throttled) |
| **User** | `GET /user` | Sanctum |
| **Campaigns** | `GET/POST /campaigns`, `GET/PATCH /campaigns/{id}`, `GET /campaigns/{id}/insights`, `POST /campaigns/preview`, `POST /campaigns/extract-variables` | Sanctum |
| **Recipients** | `POST /recipients/bulk-upload` | Sanctum |
| **Segmentation** | `GET /insights/org`, `POST /campaigns/segments/validate-count/{campaign?}` | Sanctum |
| **Templates** | `GET/POST /email-templates`, `GET/PATCH/DELETE /email-templates/{id}`, `POST /{id}/duplicate`, `POST /{id}/render`, `POST /{id}/test-send` | Sanctum |
| **SMTP Config** | `GET/POST /smtp-configurations`, `PUT/DELETE /{id}`, `POST /{id}/activate` | Sanctum |
| **Domains** | `GET/POST /domains`, `DELETE/POST verify/POST cloudflare /{id}` | Sanctum |
| **SMTP Credentials** | `GET/POST /smtp-credentials`, `PUT/DELETE /{id}`, `POST /{id}/test-send` | Sanctum |
| **Suppressions** | `GET/POST /suppressions`, `DELETE /{id}` | Sanctum |
| **Analytics** | `GET /analysis/dashboard`, `/hierarchical`, `/campaign/{id}`, `/template/{id}`, `POST /analysis/conversion` | Sanctum |
| **Payments** | `POST /payments/orders`, `/verify`, `GET /{transaction}/status`, `POST /payments/webhooks/razorpay` | Sanctum (webhook is public) |
| **Billing** | `GET /billing/summary`, `/plans`, `/history` | Sanctum |
| **RBAC** | `GET/POST/PUT/DELETE /roles`, `/permissions`, `/roles/{role}/permissions` | Sanctum + Permission middleware |
| **AI** | `POST /v1/spam/check`, `/email/generate`, `/email/rewrite`, `/email/score`, `GET /v1/health` | Public |
| **Tracking** | `GET /track/open/{sendLog}`, `/track/click/{sendLog}`, `/o/{id}`, `/c/{id}` | Public |

### 6.2 — Relay API (Fastify, `:3000`)

| Category | Endpoints | Auth |
|:---|:---|:---|
| **Auth** | `POST /auth/register`, `/login` | Public |
| **Domains** | `GET/POST /domains`, `POST /{id}/verify`, `GET /{id}/dns-records` | JWT |
| **Credentials** | `GET/POST /credentials`, `PUT/DELETE /{id}`, `POST /{id}/rotate` | JWT |
| **Messages** | `GET /messages`, `GET /{id}` | JWT |
| **Send** | `POST /send` | JWT |
| **Analytics** | `GET /analytics/overview`, `/daily`, `/domains/{id}` | JWT |
| **Events** | `GET /events`, `GET /{id}` | JWT |
| **Webhooks** | `GET/POST /webhooks`, `PUT/DELETE /{id}` | JWT |
| **Suppressions** | `GET/POST /suppressions`, `DELETE /{email}` | JWT |
| **Admin** | `GET /admin/organizations`, `/relay-providers`, `POST /admin/relay-providers` | JWT (Admin) |
| **Health** | `GET /health` | Public |



## 7. Database Schema Overview

### Core Tables

```
organizations
├── users (with role_id, creator hierarchy)
├── campaigns
│   ├── campaign_variants (segment-specific content)
│   ├── segment_filter_groups
│   │   └── segment_filters
│   └── campaign_csv_insights
├── recipients
│   └── recipient_segment_assignments
├── messages
│   └── message_recipients (status, delivery tracking)
├── events (open/click/bounce/complaint logs)
├── daily_analytics (aggregate counters by org+domain+date)
├── send_logs (legacy tracking - opens, clicks, conversions)
├── smtp_configurations (org-level SMTP settings)
├── smtp_credentials (relay SMTP auth credentials)
├── sender_domains (domain + DKIM keys + verification status)
├── tracked_links (rewritten URLs for click tracking)
├── suppressions (bounced/complained email suppression list)
├── webhooks
│   └── webhook_logs (dispatch attempt history)
├── relay_providers (Mailgun/SES/Postmark config + health)
├── email_templates (GrapesJS templates)
├── payment_transactions
│   └── payment_provider_events (Razorpay webhooks)
├── organization_subscriptions (billing periods)
├── ai_logs (AI generation history)
└── roles / permissions / role_permissions / user_permissions
```



## 8. DNS & Email Authentication

For each customer domain, the following DNS records must be configured:

### Required Records

| Record Type | Name | Value | Purpose |
|:---|:---|:---|:---|
| TXT | `@` | `v=spf1 include:mailgun.org include:amazonses.com ~all` | SPF — authorize sending IPs |
| TXT | `kym._domainkey` | `v=DKIM1; k=rsa; p=<public_key>` | DKIM — cryptographic email signing |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@domain.com` | DMARC — alignment policy |
| CNAME | `tracking` | `track.knowyourmail.in` | Tracking domain for open/click links |

### Authentication Flow

1. **SPF**: Return-Path domain (`knowyourmail.in`) includes relay provider IPs → PASS
2. **DKIM**: Worker signs with customer's private key using customer's domain → PASS with alignment
3. **DMARC**: DKIM-aligned signature ensures DMARC PASS (even if SPF alignment fails due to relay Return-Path)

> **Critical Lesson Learned:** When using Mailgun as a relay, always disable their tracking (`o:tracking=no`) and DKIM signing (`o:dkim=no`) to prevent body modification that breaks our custom DKIM signature. Also, DMARC requires exactly ONE `_dmarc` TXT record — duplicate records cause immediate DMARC FAIL.



## 9. Infrastructure & Deployment Guide

### Current Architecture (Development)

```
Single VPS (159.135.228.62)
├── Docker Compose: kym-relay-services
│   ├── Haraka (Port 25, 587)
│   ├── Redis (Port 6379)
│   ├── Worker (BullMQ consumer)
│   └── Tracker (Port 3001)
├── Docker Compose: mail-tracker
│   ├── Laravel App (PHP-FPM)
│   ├── Nginx (Port 8000)
│   └── Redis (Port 6379)
└── Database: Supabase (managed PostgreSQL, external)
```

### Recommended Production Architecture (100 Users)

**Single VPS + Managed Database + Coolify**

```
Hetzner CX23 (2 vCPU, 4GB RAM, 40GB SSD)
├── Coolify (Self-hosted PaaS — Docker management)
│   ├── Laravel App + Nginx
│   ├── Haraka SMTP Server
│   ├── BullMQ Worker
│   ├── Tracker Server
│   └── Redis 7
├── Database: Supabase Free/Pro (managed PostgreSQL)
├── DNS/CDN: Cloudflare (free tier)
└── Email Relay: Mailgun Foundation or Amazon SES
```

### Why This Architecture?

1. **Hetzner CX23** — Best price-to-performance ratio in the industry. €3.99/mo for 2 vCPU + 4GB RAM is unbeatable. All 4 services (Laravel, Haraka, Worker, Tracker) fit comfortably.
2. **Coolify** — Free, open-source PaaS. Gives you Vercel-like push-to-deploy on your own VPS. Manages Docker containers, SSL certs (Let's Encrypt), and provides a visual dashboard.
3. **Supabase** — You're already using it. Free tier gives 500MB, which is enough for 100 users. Upgrade to Pro ($25/mo) when you need more than 500MB or want automatic backups.
4. **Cloudflare** — Free DNS, free CDN, free SSL, free DDoS protection. Also hosts the landing page via Pages (free).
5. **Mailgun/SES** — Use Mailgun Foundation ($35/mo for 50K emails) for convenience, or switch to Amazon SES ($0.10/1K emails) for maximum savings.



### 9.1 — Server Configuration Requirements

#### Minimum Hardware Specifications

| Resource | Minimum (100 Users) | Recommended (100 Users) | Growth (500 Users) |
|:---|:---|:---|:---|
| **CPU** | 2 vCPU | 2 vCPU (shared) | 4 vCPU |
| **RAM** | 2 GB | 4 GB | 8 GB |
| **Disk** | 20 GB SSD | 40 GB SSD | 80 GB SSD |
| **Bandwidth** | 1 TB/mo | 5 TB/mo | 20 TB/mo |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

**RAM Breakdown (Estimated at Idle/Low Load):**

| Service | RAM Usage |
|:---|:---|
| Laravel (PHP-FPM, 4 workers) | ~200 MB |
| Nginx | ~20 MB |
| Haraka (SMTP Server) | ~80 MB |
| BullMQ Worker (Node.js) | ~120 MB |
| Tracker (Fastify) | ~60 MB |
| Redis 7 | ~50 MB |
| OS + Docker overhead | ~300 MB |
| **Total** | **~830 MB** |

> 2 GB is the absolute minimum. 4 GB gives comfortable headroom for burst traffic (campaign dispatch with 10K+ recipients).



#### Operating System & Software Prerequisites

| Software | Required Version | Purpose |
|:---|:---|:---|
| **Ubuntu Linux** | 22.04+ LTS | Server OS |
| **Docker Engine** | 24.0+ | Container runtime |
| **Docker Compose** | 2.20+ | Multi-container orchestration |
| **Node.js** | 22.x LTS | Relay services, Worker, Tracker |
| **PHP** | 8.3+ | Laravel backend |
| **Composer** | 2.7+ | PHP dependency manager |
| **Nginx** | 1.24+ | Reverse proxy / static file server |
| **Git** | 2.40+ | Code deployment |
| **Certbot** | Latest | Let's Encrypt SSL certificates (or use Cloudflare proxy) |

**Installation (Ubuntu 24.04):**

```bash
# System essentials
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip nginx certbot python3-certbot-nginx

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Node.js 22 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# PHP 8.3 + Extensions
sudo add-apt-repository ppa:ondrej/php -y
sudo apt install -y php8.3 php8.3-fpm php8.3-pgsql php8.3-redis \
    php8.3-curl php8.3-mbstring php8.3-xml php8.3-zip php8.3-bcmath

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```



#### Network & Firewall Configuration

**Required Open Ports:**

| Port | Protocol | Service | Direction | Notes |
|:---|:---|:---|:---|:---|
| **22** | TCP | SSH | Inbound | Admin access (restrict to your IP) |
| **25** | TCP | SMTP | Inbound | Haraka — receives email from Laravel |
| **80** | TCP | HTTP | Inbound | Nginx → Laravel SPA + API |
| **443** | TCP | HTTPS | Inbound | Nginx → Laravel SPA + API (SSL) |
| **587** | TCP | SMTP Submission | Inbound | Haraka — authenticated submission |
| **3000** | TCP | Relay API | Internal only | Fastify API server |
| **3001** | TCP | Tracker | Internal only | Fastify tracking server |
| **5432** | TCP | PostgreSQL | Outbound (to RDS/Supabase) | Database connection |
| **6379** | TCP | Redis | Internal only | BullMQ job queue |
| **9000** | TCP | PHP-FPM | Internal only | Nginx ↔ PHP-FPM (Docker network) |

**UFW Firewall Rules:**

```bash
# Reset and set defaults
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (restrict to your IP for production)
sudo ufw allow 22/tcp

# Web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# SMTP (required for email relay)
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp

# Enable firewall
sudo ufw enable
```

> **Security Note:** Ports 3000, 3001, 6379, and 9000 should **never** be exposed to the public internet. They communicate only over Docker's internal bridge network or `127.0.0.1`.



#### Database Configuration (PostgreSQL)

##### Option 1: AWS RDS PostgreSQL (Recommended)

**Instance Configuration:**

| Parameter | Value |
|:---|:---|
| **Engine** | PostgreSQL 16.x |
| **Instance Class** | db.t4g.micro (2 vCPU, 1 GB RAM) |
| **Storage** | 20 GB gp3 SSD (3,000 IOPS baseline) |
| **Multi-AZ** | No (Single-AZ for cost savings at 100 users) |
| **Encryption** | Yes (AES-256, AWS managed keys) |
| **Backup Retention** | 7 days (automated PITR) |
| **Maintenance Window** | Sunday 03:00–04:00 UTC |
| **Public Access** | No (VPC-only if on EC2) / Yes with IP whitelist (if on Hetzner) |

**RDS Parameter Group Tuning (for db.t4g.micro):**

| Parameter | Default | Recommended | Why |
|:---|:---|:---|:---|
| `shared_buffers` | 128 MB | `{DBInstanceClassMemory/4}` (~256 MB) | Standard PostgreSQL tuning |
| `effective_cache_size` | 4 GB | `{DBInstanceClassMemory*3/4}` (~768 MB) | Helps query planner choose index scans |
| `work_mem` | 4 MB | `8MB` | Sorting/hashing in queries |
| `maintenance_work_mem` | 64 MB | `128MB` | Faster VACUUM, CREATE INDEX |
| `max_connections` | 100 | `50` | Reduce memory per-connection overhead |
| `log_min_duration_statement` | -1 (off) | `1000` (1s) | Log slow queries for debugging |
| `idle_in_transaction_session_timeout` | 0 (off) | `60000` (60s) | Kill idle transactions |

**Connection String Format:**

```bash
# RDS (EC2 in same VPC — no SSL needed for internal)
DATABASE_URL=postgresql://kym_user:kym_password@kym-db.xxxxx.ap-south-1.rds.amazonaws.com:5432/knowyourmail

# RDS (External — always use SSL)
DATABASE_URL=postgresql://kym_user:kym_password@kym-db.xxxxx.ap-south-1.rds.amazonaws.com:5432/knowyourmail?sslmode=require

# Supabase (current)
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

##### Option 2: Supabase (Current Setup)

| Parameter | Free | Pro ($25/mo) |
|:---|:---|:---|
| **Storage** | 500 MB | 8 GB |
| **RAM** | 500 MB (shared) | 1 GB (dedicated) |
| **Connections** | Direct + pooled | Direct + pooled |
| **Backups** | None | Daily + PITR (7 days) |
| **Inactivity Pause** | After 7 days | Never |

##### Option 3: Self-Hosted PostgreSQL (On VPS)

```bash
# Docker Compose addition (if self-hosting on Hetzner)
services:
  db:
    image: postgres:16-alpine
    container_name: kym-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: kym_user
      POSTGRES_PASSWORD: <strong_password>
      POSTGRES_DB: knowyourmail
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"  # Bind to localhost only!
    command: >
      postgres
        -c shared_buffers=256MB
        -c effective_cache_size=768MB
        -c work_mem=8MB
        -c maintenance_work_mem=128MB
        -c max_connections=50
        -c log_min_duration_statement=1000
```

##### Database Schema Setup

Run Laravel migrations to create all required tables:

```bash
# From the mail-tracker directory
cd mail-tracker
php artisan migrate --force
```

This creates **48 migration files** producing the following core tables:

| Table Group | Tables | Purpose |
|:---|:---|:---|
| **Auth & RBAC** | `users`, `organizations`, `roles`, `permissions`, `role_permissions`, `user_permissions`, `personal_access_tokens` | Multi-tenant auth, Sanctum tokens |
| **Campaigns** | `campaigns`, `campaign_variants`, `segment_filter_groups`, `segment_filters`, `campaign_csv_insights`, `recipients`, `recipient_segment_assignments` | Campaign management and segmentation |
| **Email Sending** | `send_logs`, `smtp_configurations`, `ip_addresses` | Legacy dispatch tracking, SMTP configs |
| **Relay & Tracking** | `messages`, `message_recipients`, `tracked_links`, `events`, `daily_analytics`, `relay_providers` | SMTP relay pipeline, open/click tracking |
| **Domains & DKIM** | `sender_domains`, `smtp_credentials` | Domain verification, DKIM keys, SMTP auth |
| **Webhooks** | `webhooks`, `webhook_logs` | Customer webhook subscriptions and dispatch logs |
| **Templates** | `email_templates` | GrapesJS email template storage |
| **Payments** | `payment_transactions`, `payment_provider_events`, `organization_subscriptions` | Razorpay billing lifecycle |
| **AI & Analytics** | `ai_logs`, `conversions` | AI generation history, conversion tracking |
| **Security** | `ip_reputation`, `suppressions` | Abuse detection, bounce/complaint suppression |

**Key PostgreSQL Extensions Required:**

```sql
-- These are typically available by default on RDS and Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Encryption functions
```

**Recommended Indexes (for high-traffic tables):**

```sql
-- message_recipients: frequently queried by status and message_id
CREATE INDEX idx_message_recipients_status ON message_recipients (status);
CREATE INDEX idx_message_recipients_message_id ON message_recipients (message_id);

-- events: queried by recipient_id and event_type
CREATE INDEX idx_events_recipient_id ON events (recipient_id);
CREATE INDEX idx_events_type ON events (event_type);

-- daily_analytics: unique constraint serves as index
-- Already has: UNIQUE (organization_id, domain_id, date)

-- suppressions: email lookup per org
CREATE INDEX idx_suppressions_org_email ON suppressions (organization_id, email);
```



#### Redis Configuration

| Parameter | Value |
|:---|:---|
| **Version** | Redis 7.x (Alpine) |
| **Purpose** | BullMQ job queue, Laravel cache |
| **Max Memory** | 50-100 MB (sufficient for 100 users) |
| **Persistence** | AOF (append-only file) for queue durability |
| **Bind** | `127.0.0.1` only (never expose to internet) |

**Docker Configuration (from docker-compose.yml):**

```yaml
redis:
  image: redis:7-alpine
  container_name: kym-redis
  command: redis-server --appendonly yes --maxmemory 100mb --maxmemory-policy allkeys-lru
  volumes:
    - redisdata:/data
  ports:
    - "127.0.0.1:6379:6379"  # Localhost only!
  restart: unless-stopped
```

> **Note:** Both `mail-tracker` (Laravel cache/queue) and `kym-relay-services` (BullMQ) connect to the same Redis instance. Ensure they use different database indices (`REDIS_DB=0` for Laravel, default `0` for BullMQ) or key prefixes to avoid collision.



#### Nginx Reverse Proxy Configuration

**Production Nginx config** (serving Laravel SPA + API with SSL):

```nginx
server {
    listen 80;
    server_name app.knowyourmail.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.knowyourmail.in;

    # SSL (Let's Encrypt or Cloudflare Origin)
    ssl_certificate     /etc/letsencrypt/live/app.knowyourmail.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.knowyourmail.in/privkey.pem;

    root /var/www/html/mail-tracker/public;
    index index.php;
    charset utf-8;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Laravel SPA + API
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM
    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;  # or app:9000 in Docker
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    # Static asset caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Block dotfiles
    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Client upload size (for CSV imports)
    client_max_body_size 50M;
}

# Tracking server proxy (optional — if using custom tracking domain)
server {
    listen 443 ssl http2;
    server_name track.knowyourmail.in;

    ssl_certificate     /etc/letsencrypt/live/track.knowyourmail.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/track.knowyourmail.in/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```



#### Haraka SMTP Server Configuration

**Config files** located at `kym-relay-services/apps/haraka/config/`:

| File | Purpose | Current Value |
|:---|:---|:---|
| `me` | SMTP hostname (EHLO banner) | `smtp.knowyourmail.com` |
| `smtp.json` | Listening ports and process config | `0.0.0.0:25,0.0.0.0:587` |
| `connection.ini` | SMTP protocol settings | RFC 1869 strict, SMTPUTF8, greeting |
| `plugins` | Plugin load order | 8 custom plugins (see pipeline) |
| `host_list` | Accepted domains | Internal relay domains |

**Plugin Pipeline (load order):**

```
auth_backend       → SMTP LOGIN auth against PostgreSQL
validate_domain    → Verify sender domain belongs to org
rate_limit         → Per-org/credential rate limiting (Redis)
abuse_detection    → Content-based spam pattern detection
inject_tracking    → Tracking pixel/link rewrite
store_message      → Save metadata to PostgreSQL + parse body
dkim_sign          → DKIM signing (delegated to Worker)
route_relay        → Queue to BullMQ (email-delivery queue)
```

**Critical Settings for Production:**

```json
// smtp.json — Production config
{
  "listen": "0.0.0.0:25,0.0.0.0:587",
  "port": 25,
  "nodes": 2,         // Increase for multi-core (1 per CPU core)
  "daemonize": false   // Keep false for Docker
}
```

```ini
; connection.ini — Production settings
[main]
strict_rfc1869=true
smtputf8=true

[message]
greeting[]=KnowYourMail ESMTP

[max]
line_length=512
data_line_length=992
```

> **Important:** Port 25 requires the server to have a **clean IP reputation** and a valid **rDNS (PTR) record**. Many cloud providers (AWS, GCP) block port 25 by default — you must request an unblock. Hetzner allows port 25 on all VPS plans.

## 10. Cost Analysis (100 Users)

### Assumptions

| Parameter | Value | Rationale |
|:---|:---|:---|
| Active Users | 100 | Initial launch target |
| Avg Campaigns/User/Month | 4 | Weekly newsletter cadence |
| Avg Recipients/Campaign | 500 | Small-to-mid business lists |
| Total Emails/Month | 200,000 | 100 × 4 × 500 |
| Avg Open Rate | 25% | Industry average |
| Avg Click Rate | 3% | Industry average |
| Tracking Events/Month | ~56,000 | Opens + clicks |
| Database Size (Year 1) | ~200MB | Messages, recipients, events, analytics |
| CSV/Asset Storage (Year 1) | ~2GB | Uploaded CSVs, email templates, exports |



### 10.1 — AWS-Native Architecture Analysis (RDS + S3)

#### Should You Move to AWS RDS + S3?

**Short answer: Yes, but with a specific deployment strategy.**

Moving to AWS RDS PostgreSQL + S3 is the **right architectural decision** for KnowYourMail, but the *how* matters more than the *what*. Here's a VP-level breakdown:

#### ✅ Why RDS PostgreSQL Makes Sense

| Factor | Supabase (Current) | AWS RDS PostgreSQL |
|:---|:---|:---|
| **Automated Backups** | ❌ Free / ✅ Pro ($25) | ✅ Included (7-day PITR) |
| **Inactivity Pause** | ⚠️ Pauses after 7 days (Free) | ❌ Never pauses |
| **Performance Tuning** | Limited | Full parameter group control |
| **Connection Pooling** | Built-in Supavisor | RDS Proxy available ($$$) or self-host PgBouncer |
| **Read Replicas** | ❌ Not on Free/Pro | ✅ Easy to add |
| **Multi-AZ (HA)** | ❌ Not available | ✅ One-click |
| **Monitoring** | Basic dashboard | CloudWatch (deep metrics, alerts) |
| **AWS Ecosystem** | Separate network | Same VPC as SES, S3, Lambda |
| **Storage Limit** | 500MB Free / 8GB Pro | 20GB included (expandable) |
| **Vendor Lock-in** | Low (standard PG) | Low (standard PG) |

#### ✅ Why S3 Makes Sense

Your platform handles several types of file assets:

| Asset Type | Current Storage | Problem | S3 Solution |
|:---|:---|:---|:---|
| CSV recipient uploads | Local disk (VPS) | Lost if VPS dies, not scalable | S3 Standard — durable, versioned |
| Email template assets | Database BLOBs or disk | Bloats DB, slow retrieval | S3 + CloudFront CDN |
| Export files (analytics) | Generated on-the-fly | No persistence | S3 with pre-signed URLs |
| Database backups | Manual `pg_dump` | Unreliable, no automation | RDS automated → S3 snapshots |

**S3 is essentially free at your scale** — 5GB free for 12 months, then $0.023/GB/month. Even at 10GB = $0.23/mo.

#### ⚠️ Critical Consideration: Cross-Cloud Latency

> **This is the most important architectural decision.**

Your VPS is on **Hetzner (Germany)**. If you use AWS RDS in **ap-south-1 (Mumbai)**, every database query crosses the public internet — adding **50-150ms latency per round-trip**.

**Impact on KnowYourMail:**
- Haraka plugin `store_message.js` makes 2-3 DB queries per incoming email
- Worker `deliverEmail()` makes 3-5 DB queries per email sent
- Tracker makes 2-3 DB queries per open/click event
- At 200K emails/mo ≈ 1M+ DB round-trips/mo

**Two viable strategies:**

| Strategy | Description | Latency | Cost |
|:---|:---|:---|:---|
| **A. All-AWS** | Move VPS to AWS EC2 (same region as RDS) | ~1ms | Higher VPS cost (~$8-15/mo) |
| **B. Hetzner + Self-hosted PG** | Run PostgreSQL on the Hetzner VPS itself | ~0.1ms | $0 extra (VPS has the RAM) |

**VP Recommendation:** Go **All-AWS** if you're committing to RDS. The whole point of RDS is being in the same VPC — don't put an ocean between your app and database.

#### Recommended AWS-Native Architecture (Option D)

```
AWS ap-south-1 (Mumbai)
├── EC2 t3.small (2 vCPU, 2GB RAM) — All services
│   ├── Coolify or Docker Compose
│   ├── Laravel App + Nginx
│   ├── Haraka SMTP Server
│   ├── BullMQ Worker
│   ├── Tracker Server
│   └── Redis 7 (self-hosted)
├── RDS db.t4g.micro (2 vCPU, 1GB RAM, 20GB SSD)
│   └── PostgreSQL 16 — Single-AZ
├── S3 Standard
│   ├── CSV uploads
│   ├── Email template assets
│   ├── Database backup exports
│   └── Analytics exports
├── SES (Same region — zero-latency email sending)
├── DNS/CDN: Cloudflare (free tier)
└── Landing Page: Cloudflare Pages (free)
```

**Why this works:**
1. **EC2 → RDS**: Same VPC, sub-millisecond latency
2. **EC2 → SES**: Same region, zero network hop for email sending
3. **EC2 → S3**: Same region, instant file access
4. **RDS Free Tier**: 12 months free (db.t4g.micro)
5. **S3 Free Tier**: 5GB free for 12 months
6. **EC2 Free Tier**: t3.micro free for 12 months (upgrade to t3.small for $15/mo when needed)



### Option D: AWS-Native (RDS + S3 + SES) — ₹4,250/mo

> **Best for:** Production-grade infrastructure with full AWS ecosystem benefits. All services in the same region for minimum latency.

#### Year 1 (With AWS Free Tier)

| Service | Provider | Plan | Monthly (USD) | Monthly (INR ≈) |
|:---|:---|:---|---:|---:|
| Compute (2vCPU/2GB) | AWS EC2 | t3.small (On-Demand) | $15.18 | ₹1,268 |
| Database | AWS RDS | db.t4g.micro (Free Tier) | $0.00 | ₹0 |
| RDS Storage (20GB gp3) | AWS RDS | Free Tier | $0.00 | ₹0 |
| File Storage | AWS S3 | Standard (Free Tier 5GB) | $0.00 | ₹0 |
| Email Relay | AWS SES | Pay-as-you-go | $20.00 | ₹1,670 |
| DNS/CDN/SSL | Cloudflare | Free | $0.00 | ₹0 |
| Landing Page | Cloudflare Pages | Free | $0.00 | ₹0 |
| Domains (2) | Namecheap | Annual (amortized) | $3.00 | ₹250 |
| Monitoring | AWS CloudWatch | Free Tier (10 metrics) | $0.00 | ₹0 |
| **TOTAL (Year 1)** | | | **$38.18** | **≈ ₹3,188** |

#### Year 2+ (Post Free Tier)

| Service | Provider | Plan | Monthly (USD) | Monthly (INR ≈) |
|:---|:---|:---|---:|---:|
| Compute (2vCPU/2GB) | AWS EC2 | t3.small (On-Demand) | $15.18 | ₹1,268 |
| Database | AWS RDS | db.t4g.micro | $11.68 | ₹975 |
| RDS Storage (20GB gp3) | AWS RDS | 20GB | $2.30 | ₹192 |
| RDS Automated Backups | AWS RDS | 20GB (included free) | $0.00 | ₹0 |
| File Storage (5GB) | AWS S3 | Standard | $0.12 | ₹10 |
| S3 Requests (est.) | AWS S3 | ~10K PUT + 50K GET/mo | $0.07 | ₹6 |
| Email Relay | AWS SES | Pay-as-you-go | $20.00 | ₹1,670 |
| DNS/CDN/SSL | Cloudflare | Free | $0.00 | ₹0 |
| Landing Page | Cloudflare Pages | Free | $0.00 | ₹0 |
| Domains (2) | Namecheap | Annual (amortized) | $3.00 | ₹250 |
| Monitoring | AWS CloudWatch | Basic | $0.00 | ₹0 |
| **TOTAL (Year 2+)** | | | **$52.35** | **≈ ₹4,371** |

| | Year 1 Monthly | Year 2+ Monthly | Year 1 Annual | Year 2+ Annual |
|:---|---:|---:|---:|---:|
| **USD** | $38.18 | $52.35 | $458.16 | $628.20 |
| **INR** | ₹3,188 | ₹4,371 | ₹38,256 | ₹52,452 |

> **Why EC2 t3.small and not t3.micro?** The t3.micro has only 1GB RAM — not enough to run Laravel + Haraka + Worker + Tracker + Redis simultaneously. The t3.small (2GB) provides a comfortable margin. If you find 2GB tight, consider t3.medium (4GB) at ~$30/mo.

> **Cost Saving Tip:** Purchase a **1-year Reserved Instance** for EC2 t3.small to save ~40%: $15.18 → ~$9.49/mo. This brings Year 2+ total to **~$46/mo (₹3,840)**.



### S3 Integration: What to Store

| Asset | S3 Path Pattern | Storage Class | Lifecycle Rule |
|:---|:---|:---|:---|
| CSV Uploads | `s3://kym-assets/{org_id}/imports/{file}.csv` | Standard | Move to IA after 30 days |
| Email Template HTML | `s3://kym-assets/{org_id}/templates/{id}/` | Standard | Keep indefinitely |
| Template Images | `s3://kym-assets/{org_id}/templates/{id}/images/` | Standard | Keep indefinitely |
| DB Backups | `s3://kym-backups/rds/{date}/` | Standard-IA | Delete after 90 days |
| Analytics Exports | `s3://kym-assets/{org_id}/exports/{date}.csv` | Standard-IA | Delete after 30 days |

**Implementation Notes:**
- Use **pre-signed URLs** for secure direct uploads from the frontend (no server relay needed)
- Laravel: Use `league/flysystem-aws-s3-v3` adapter — swap `FILESYSTEM_DISK=s3` in `.env`
- Node.js: Use `@aws-sdk/client-s3` (already in your dependencies for SES)



### Option A: Ultra-Budget (Self-Managed) — ₹2,600/mo

> **Best for:** Solo founder who is comfortable with Linux and Docker.

| Service | Provider | Plan | Monthly (USD) | Monthly (INR ≈) |
|:---|:---|:---|---:|---:|
| VPS (2vCPU/4GB) | Hetzner | CX23 | $4.49 | ₹375 |
| IPv4 Address | Hetzner | Add-on | $0.56 | ₹47 |
| Database | Supabase | Free | $0.00 | ₹0 |
| Email Relay | Amazon SES | Pay-as-you-go | $20.00 | ₹1,670 |
| DNS/CDN/SSL | Cloudflare | Free | $0.00 | ₹0 |
| Landing Page | Cloudflare Pages | Free | $0.00 | ₹0 |
| Deployment | Coolify | Self-hosted (Free) | $0.00 | ₹0 |
| Domain (`knowyourmail.in`) | Namecheap | Annual (amortized) | $1.50 | ₹125 |
| Domain (`promptbook.co.in`) | — | Annual (amortized) | $1.50 | ₹125 |
| Monitoring | UptimeRobot | Free | $0.00 | ₹0 |
| **TOTAL** | | | **$28.05** | **≈ ₹2,342** |

| | Monthly | Annual |
|:---|---:|---:|
| **USD** | $28.05 | $336.60 |
| **INR** | ₹2,342 | ₹28,104 |

> **Note:** Amazon SES costs ~$0.10 per 1,000 emails. At 200K emails/mo = $20/mo. First 12 months get 3,000 free emails/mo.



### Option B: Balanced (Recommended for Launch) — ₹5,200/mo

> **Best for:** Launching a real product with proper reliability and less operational overhead.

| Service | Provider | Plan | Monthly (USD) | Monthly (INR ≈) |
|:---|:---|:---|---:|---:|
| VPS (2vCPU/4GB) | Hetzner | CX23 | $4.49 | ₹375 |
| IPv4 Address | Hetzner | Add-on | $0.56 | ₹47 |
| Database | Supabase | Pro | $25.00 | ₹2,088 |
| Email Relay | Mailgun | Foundation (50K) | $35.00 | ₹2,923 |
| DNS/CDN/SSL | Cloudflare | Free | $0.00 | ₹0 |
| Landing Page | Cloudflare Pages | Free | $0.00 | ₹0 |
| Deployment | Coolify | Self-hosted (Free) | $0.00 | ₹0 |
| Domains (2) | Namecheap | Annual (amortized) | $3.00 | ₹250 |
| Monitoring | UptimeRobot | Free | $0.00 | ₹0 |
| **TOTAL** | | | **$68.05** | **≈ ₹5,683** |

| | Monthly | Annual |
|:---|---:|---:|
| **USD** | $68.05 | $816.60 |
| **INR** | ₹5,683 | ₹68,196 |

> **Why Supabase Pro?** Automatic daily backups, no inactivity pause, 8GB database storage, and dedicated compute. Worth it for production data you can't afford to lose.

> **Why Mailgun Foundation?** 50K included emails/mo + $1.30 per additional 1K. The extra 150K emails = $195 overage. **If you exceed 50K regularly, switch to SES ($20/mo for 200K).**



### Option C: Hybrid Optimal — ₹3,000/mo (VP's Recommendation)

> **Best for:** Maximum cost efficiency while maintaining production reliability.

| Service | Provider | Plan | Monthly (USD) | Monthly (INR ≈) |
|:---|:---|:---|---:|---:|
| VPS (2vCPU/4GB) | Hetzner | CX23 | $4.49 | ₹375 |
| IPv4 Address | Hetzner | Add-on | $0.56 | ₹47 |
| Database | Supabase | Free → Pro when needed | $0.00 | ₹0 |
| Email Relay | Amazon SES | Pay-as-you-go | $20.00 | ₹1,670 |
| DNS/CDN/SSL | Cloudflare | Free | $0.00 | ₹0 |
| Landing Page | Cloudflare Pages | Free | $0.00 | ₹0 |
| Deployment | Coolify | Self-hosted (Free) | $0.00 | ₹0 |
| Domains (2) | Namecheap | Annual (amortized) | $3.00 | ₹250 |
| Automated Backups | Cron + S3 (Free tier) | DIY | $0.00 | ₹0 |
| **TOTAL** | | | **$28.05** | **≈ ₹2,342** |

| | Monthly | Annual |
|:---|---:|---:|
| **USD** | $28.05 | $336.60 |
| **INR** | ₹2,342 | ₹28,104 |

**Strategy:**
1. Start with Supabase Free (500MB) — sufficient for first 6 months
2. Use Amazon SES as primary relay — 18x cheaper than Mailgun at scale
3. Keep Mailgun as secondary/fallback provider (your existing account works on free tier for testing)
4. Set up daily `pg_dump` cron to AWS S3 Free Tier (5GB) as backup strategy
5. Upgrade Supabase to Pro ($25/mo) only when you approach 400MB database size



### Cost Comparison Summary

| | Option A (Ultra-Budget) | Option B (Balanced) | Option C (Hybrid) | Option D (AWS-Native) |
|:---|---:|---:|---:|---:|
| **Monthly (USD)** | $28 | $68 | $28 | $38 (Yr1) / $52 (Yr2+) |
| **Monthly (INR)** | ₹2,342 | ₹5,683 | ₹2,342 | ₹3,188 (Yr1) / ₹4,371 (Yr2+) |
| **Annual (USD)** | $337 | $817 | $337 | $458 (Yr1) / $628 (Yr2+) |
| **Annual (INR)** | ₹28,104 | ₹68,196 | ₹28,104 | ₹38,256 (Yr1) / ₹52,452 (Yr2+) |
| **Reliability** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Maintenance** | High | Low | Medium | Low |
| **Scalability** | Manual | Easy | Easy | Best (AWS native) |
| **DB Backups** | Manual | Supabase managed | Manual (S3 cron) | Automated PITR (7 days) |
| **File Storage** | Local disk | Local disk | S3 (cron backup) | S3 (native, pre-signed URLs) |
| **DB-to-App Latency** | Cross-internet | Cross-internet | Cross-internet | Sub-millisecond (same VPC) |



### Cost Per Customer

| Metric | Option A | Option B | Option C | Option D (Yr2+) |
|:---|---:|---:|---:|---:|
| **Cost/User/Month** | $0.28 | $0.68 | $0.28 | $0.52 |
| **Cost/Email Sent** | $0.00014 | $0.00034 | $0.00014 | $0.00026 |
| **Break-even price/user** | $1/mo | $2/mo | $1/mo | $1.50/mo |

> **Pricing Recommendation:** Charge ₹499/mo (~$6/mo) per user for basic plan. At 100 users = ₹49,900/mo revenue vs ₹2,342–₹5,683 cost = **87-95% gross margin**.



### Variable Costs That Scale

| Cost Driver | Rate | At 100 Users | At 500 Users | At 1000 Users |
|:---|:---|---:|---:|---:|
| Amazon SES Emails | $0.10/1K | $20 | $100 | $200 |
| Mailgun Foundation + Overage | $35 + $1.30/1K | $230 | $1,335 | $2,635 |
| Supabase Storage (if Pro) | $25 base + $0.125/GB | $25 | $30 | $40 |
| Hetzner VPS Upgrade | CX33 (4vCPU/8GB) | — | $8.49 | $16 |
| Bandwidth (Hetzner) | 20TB included | $0 | $0 | $0 |

> **Verdict:** At 500+ users, **Amazon SES is the clear winner** — saving $1,235/mo over Mailgun. Your architecture already supports SES via the worker's `deliverEmail()` function, so switching is a config change, not a code change.



## 11. Scaling Roadmap

### Path A: Hetzner + Supabase (Budget-First)

| Phase | Users | Infrastructure | Monthly Cost |
|:---|:---|:---|---:|
| Launch | 0–100 | Hetzner CX23 + Supabase Free + SES | ~$28 |
| Growth | 100–500 | Hetzner CX33 + Supabase Pro + SES | ~$55 |
| Scale | 500–2000 | 2× Hetzner VPS + Supabase Pro + SES + Dedicated IP | ~$150 |
| Enterprise | 2000+ | Multi-region + Self-hosted PG replication | ~$500+ |

### Path B: AWS-Native (RDS + S3 + SES) — Recommended ⭐

| Phase | Users | Infrastructure | Monthly Cost |
|:---|:---|:---|---:|
| Launch | 0–100 | EC2 t3.small + RDS db.t4g.micro (Free) + S3 + SES | ~$38 (Yr1) |
| Growth | 100–500 | EC2 t3.medium + RDS db.t4g.small + S3 + SES | ~$80 |
| Scale | 500–2000 | EC2 t3.large + RDS db.t4g.medium + S3 + SES + Dedicated IP | ~$180 |
| Enterprise | 2000+ | ECS/EKS + RDS Multi-AZ + ElastiCache + CloudFront | ~$600+ |

**Why Path B is recommended:**
1. **Zero latency** between compute and database (same VPC)
2. **SES in same region** — fastest email dispatch, no cross-network hop
3. **S3 native** — pre-signed URLs, lifecycle rules, versioning built-in
4. **Automated DB backups** — 7-day PITR included at no extra cost
5. **Linear scaling** — upgrade instance types with a click, add read replicas as needed
6. **Single bill** — one AWS invoice for compute, database, storage, email, and monitoring

### VP's Final Recommendation

> **For launch (100 users):** Start with **Option D (AWS-Native)** at **₹3,188/mo (Year 1)** to build on a production-grade foundation from day one. The AWS Free Tier gives you 12 months to validate the product before costs step up to ₹4,371/mo.
>
> If budget is extremely tight and you need to ship for under ₹2,500/mo, start with **Option C (Hetzner + Supabase Free + SES)** and plan an AWS migration at 200+ users when cross-cloud latency starts hurting performance.



## Appendix: Quick Reference

### Key Environment Variables

| Variable | Service | Description |
|:---|:---|:---|
| `DATABASE_URL` | All | PostgreSQL connection string (RDS or Supabase) |
| `REDIS_URL` | Relay | Redis connection for BullMQ |
| `ENCRYPTION_KEY` | All | AES key for DKIM private key encryption |
| `MAILGUN_API_KEY` | Worker | Mailgun API authentication |
| `MAILGUN_DOMAIN` | Worker | Mailgun sending domain |
| `AWS_ACCESS_KEY_ID` | Worker, S3 | AWS credentials (SES + S3) |
| `AWS_SECRET_ACCESS_KEY` | Worker, S3 | AWS credentials (SES + S3) |
| `AWS_REGION` | Worker, S3 | AWS region (e.g., `ap-south-1`) |
| `AWS_S3_BUCKET` | Laravel, API | S3 bucket name for asset storage |
| `JWT_SECRET` | API | Fastify JWT signing secret |
| `TRACKING_HOST` | API | Tracker server URL for pixel/link injection |
| `FILESYSTEM_DISK` | Laravel | Set to `s3` for AWS S3 file storage |

### Docker Compose Commands

```bash
# Start relay services
cd kym-relay-services && docker compose up -d

# Start campaign manager
cd mail-tracker && docker compose up -d

# View logs
docker compose logs -f worker
docker compose logs -f haraka

# Rebuild after code changes
docker compose build --no-cache worker && docker compose up -d worker
```

### Useful Artisan Commands

```bash
# Dispatch pending campaigns (runs every minute via scheduler)
php artisan campaigns:dispatch

# Process subscription renewals (runs hourly)
php artisan billing:process-renewals

# Run queue worker
php artisan queue:listen --tries=1 --timeout=0

# Run all development services
composer dev
```



> **Document maintained by:** VP of Engineering, KnowYourMail
> **Next review:** After reaching 100-user milestone
