# KnowYourMail — Features & Working Documentation

Last updated: 2026-05-25

## Executive Summary (Current Codebase)

**KnowYourMail** is a **multi-tenant** (organization-scoped) Laravel (API + scheduler + queues) + React/Vite SaaS platform for:

- Creating **email campaigns** with audience targeting
- Uploading **recipients via CSV** and extracting attributes for segmentation
- Building dynamic **segment rules** (filter groups / filters)
- **Dispatching** campaigns on a schedule and sending email via configurable SMTP
- **Tracking** opens/clicks and producing analytics + conversion capture
- Managing **RBAC** (roles, permissions, role-permission, user-permission)
- Initiating and verifying **Razorpay payments** (one-time orders; webhooks are queued)
- Generating **AI-assisted email copy**

Core architectural properties:

- **Backend**: Laravel API routes under `routes/api.php`, scheduled commands, and background jobs for imports, segment assignment, dispatch, sending, and webhook processing.
- **Frontend**: React SPA served by `routes/web.php`, state managed with **Zustand**, HTTP via **Axios**.
- **Tenant boundary**: most resources are validated/queried by the authenticated user’s `organization_id`.

---

## Feature Documentation (What exists + how it works)

### 1) Authentication (Sanctum) + RBAC (Role/Permission)

**What it does**
- Registers users into an **organization**.
- Authenticates users via **Sanctum tokens**.
- Authorizes actions using **RBAC** permissions.

**Key components**
- Controllers: `app/Http/Controllers/Api/AuthController.php`
- Middleware: `app/Http/Middleware/RoleMiddleware.php`
- Repositories: `app/Repositories/AuthRepository.php`
- Models: `app/Models/User.php`, `Role.php`, `Permission.php`, `RolePermission.php`, `UserPermission.php`
- Routes: `routes/api.php` and permission-gated endpoints.

**Working**
- `POST /api/auth/register`: creates **user + organization**, then issues the user context for later authorization.
- `POST /api/auth/login`: validates credentials and returns a Sanctum bearer token.
- `POST /api/auth/logout`: revokes the current token.
- Role/permission authorization:
  - Routes are wrapped with permission middleware, e.g. `permissions:create_manager`, `permissions:view_roles`, `permissions:view_permissions`, `permissions:manage_roles`, etc.

---

### 2) Campaign Management (CRUD + Segmentation Mode + Variants)

**What it does**
- Allows users to create and manage campaigns within their organization.
- Campaigns define content/scheduling and segmentation strategy.
- Campaign variants represent segment-specific email content.

**Key components**
- Controller: `app/Http/Controllers/Api/CampaignController.php`
- Models: `app/Models/Campaign.php`, `CampaignVariant.php`
- Segmentation models: `SegmentFilterGroup.php`, `SegmentFilter.php`

**Working**
- Routes under `/api/campaigns` (authenticated + tenant-scoped):
  - `GET /api/campaigns` list
  - `POST /api/campaigns` create
  - `GET /api/campaigns/{campaign}` show
  - `PATCH /api/campaigns/{campaign}` update
  - `GET /api/campaigns/{campaign}/insights` segmentation-related insight retrieval
  - `POST /api/campaigns/segments/validate-count/{campaign?}` validates expected segment count
- Campaign URLs are normalized to include `https://` when needed.
- Segment targeting is built using **filter groups**:
  - **Group = OR** between filters.
  - **Within group = AND** between filters.

---

### 3) Recipient Upload (Bulk CSV Import)

**What it does**
- Accepts CSV uploads for recipient import.
- Validates/normalizes data.
- Queues processing and persists both recipients and CSV-derived insights.

**Key components**
- Controller: `app/Http/Controllers/Api/BulkRecipientController.php`
- Service: `app/Services/BulkImportService.php`
- Job: `app/Jobs/ProcessCsvImportJob.php`
- Validation: `app/Services/RecipientValidationService.php`
- Model: `app/Models/Recipient.php`

**Working**
- `POST /api/recipients/bulk-upload` (auth required)
  1. Upload is validated.
  2. CSV is stored temporarily.
  3. A preview/validation happens synchronously.
  4. Import is queued via `ProcessCsvImportJob`.
  5. Job parses rows, detects email column, normalizes attributes.
  6. Recipients are **upserted**.
  7. CSV insights are saved to `campaign_csv_insights`.
- Recipients can be stored for:
  - Organization-level module (`module_type=1`)
  - Campaign-level module (`module_type=2`)

---

### 4) Segmentation (Assign Recipients to Campaign Variants)

**What it does**
- Computes which recipients match campaign segment rules.
- Assigns each recipient to a **single** campaign variant.

**Key components**
- Job: `app/Jobs/AssignSegmentsJob.php`
- Model: `app/Models/RecipientSegmentAssignment.php`
- Controller: `app/Http/Controllers/Api/SegmentationController.php`

**Working**
- `AssignSegmentsJob` merges insights and validates segment counts tenant-scoped.
- Field name safety:
  - Segment field names are restricted to alphanumeric/underscore to avoid unsafe JSON path usage.
- Prior to dispatch:
  - Recipients are assigned to exactly one campaign variant.

---

### 5) Campaign Dispatch (Scheduler + Email Sending Jobs)

**What it does**
- Dispatches campaigns on a schedule.
- Pre-creates send logs and then sends email in the background.

**Key components**
- Scheduler entry: `app/Console/Commands/DispatchCampaignsCommand.php`
- Related command/job flow:
  - `app/Console/Commands/DispatchCampaign.php` (ip rotation hooks exist)
  - `app/Jobs/AssignSegmentsJob.php` (dispatch stage)
  - `app/Jobs/SendCampaignEmailJob.php`
  - `app/Jobs/SendEmailJob.php`
  - Mail: `app/Mail/BulkMail.php`
  - Model: `app/Models/SendLog.php`

**Working**
- Scheduler: every minute `campaigns:dispatch` runs.
- Dispatch stage:
  1. Mark campaign as `running`.
  2. Assign segments (currently sync via dispatchSync in the command).
  3. Create `send_logs` with recipient, variant, email, and pending status.
  4. Enqueue send jobs.
- Sending:
  - Jobs use organization/campaign SMTP configuration when available.
- Tracking hooks embedded in email:
  - Open pixel: `/api/track/open/{sendLogId}`
  - Click CTA: `/api/track/click/{sendLogId}?url=...`

---

### 6) Tracking (Opens + Clicks)

**What it does**
- Records opens and clicks and provides event-driven updates for analytics.

**Key components**
- Controller: `app/Http/Controllers/Tracking/TrackingController.php`
- Service: `app/Http/Services/Tracking/TrackingService.php`
- Models: `app/Models/SendLog.php`, `app/Models/Conversion.php`

**Working**
- Routes (both long and legacy short forms exist):
  - `GET /api/track/open/{sendLog}`
  - `GET /api/track/click/{sendLog}?url=...`
  - Legacy:
    - `GET /api/o/{sendLog}`
    - `GET /api/c/{sendLog}`
- Open tracking:
  - Returns a **1x1 PNG** and updates `opened_at` + metadata.
- Click tracking:
  - Increments clicks, records last activity, stores activity metadata.
  - Redirects to the original URL.

---

### 7) Analytics & Insights (Dashboard + Campaign + Conversions)

**What it does**
- Provides reporting endpoints for dashboard, hierarchy, campaign analysis, template analysis, and conversions.

**Key components**
- Controller: `app/Http/Controllers/Api/AnalysisController.php`
- Models: `SendLog`, `Conversion` (plus others implied by queries)

**Working**
- Under `/api/analysis` (auth required):
  - `GET /api/analysis/dashboard`
  - `GET /api/analysis/hierarchical`
  - `GET /api/analysis/campaign/{id}`
  - `GET /api/analysis/template/{id}`
  - `POST /api/analysis/conversion` (gated by `permissions:track_conversions`)
- Conversion capture:
  - Records conversion events linked to the send logs/campaign context.

---

### 8) SMTP Configuration (Organization Scoped Sender Setup)

**What it does**
- Stores and manages SMTP configurations used by campaign sending.

**Key components**
- Controller: `app/Http/Controllers/Api/SmtpConfigurationController.php`
- Model: `app/Models/SmtpConfiguration.php`

**Working**
- Routes under `/api/smtp-configurations`:
  - `GET /` list
  - `POST /` create
  - `PUT /{smtpConfiguration}` update
  - `DELETE /{smtpConfiguration}` destroy
- Organization scoping:
  - SMTP configurations are tied to the authenticated organization.
- Security behavior:
  - Passwords are accepted for storage.
  - Passwords are hidden from list responses.

---

### 9) AI-Assisted Email Copy (Email Generation)

**What it does**
- Generates or drafts email copy using an AI module.

**Key components**
- Controller: `app/Http/Controllers/Api/EmailAIController.php`
- Service: `app/Services/EmailAIService.php`
- Model: `app/Models/AiLog.php`

**Working**
- Route: `POST /api/ai/email/generate`
- Service produces content and persists AI interaction logs to `ai_logs` (as indicated by model usage).

---

### 10) Payments (Razorpay Orders + Webhooks + Transaction State)

**What it does**
- Creates Razorpay orders and verifies payments.
- Processes Razorpay webhooks with signature validation.
- Updates org-scoped payment transactions asynchronously.

**Key components**
- Controller: `app/Http/Controllers/Api/PaymentController.php`
- Service orchestration: `app/Services/Payments/PaymentService.php`
- Provider adapter: `app/Services/Payments/Providers/Razorpay/RazorpayProvider.php`
- Webhook signature strategy: `app/Services/Payments/Providers/Razorpay/RazorpayWebhookVerificationStrategy.php`
- DTOs in `app/Services/Payments/DTO/*`
- Models: `PaymentTransaction.php`, `PaymentProviderEvent.php`
- Config:
  - `config/payments.php`
  - `config/services.php`

**Working**
- `POST /api/payments/orders`:
  - Creates or reuses a Razorpay order.
  - Backend-controlled amounts/pricing (frontend amount is not trusted).
  - Idempotency keys prevent duplicate order creation.
- `POST /api/payments/verify`:
  - Verifies checkout signature.
- `GET /api/payments/{transaction}/status`:
  - Returns org-scoped transaction state.
- `POST /api/payments/webhooks/razorpay`:
  1. Verify raw webhook signature (`X-Razorpay-Signature`).
  2. Persist and deduplicate webhook events by `provider_event_id` into `payment_provider_events`.
  3. Immediately acknowledge quickly.
  4. Queue `ProcessRazorpayWebhookEventJob` to update `payment_transactions`.
- Webhook processing is explicitly queued to avoid slow webhook requests.

---

### 11) Billing API (Plans + Summary + History)

**What it does**
- Exposes billing views: current subscription summary, available plans, and billing history.

**Key components**
- Controller: `app/Http/Controllers/Api/BillingController.php`

**Working**
- Under `/api/billing` (auth required):
  - `GET /summary`
  - `GET /plans`
  - `GET /history`

---

## Cross-Cutting Runtime: Queues, Scheduler, Idempotency

- **Queues** are used for:
  - CSV import (`ProcessCsvImportJob`)
  - Segment assignment (`AssignSegmentsJob`)
  - Email sending (`SendCampaignEmailJob`, `SendEmailJob`)
  - Razorpay webhook processing (`ProcessRazorpayWebhookEventJob`)
- **Idempotency**:
  - Razorpay order creation uses idempotency keys.
  - Razorpay webhooks are deduplicated by `provider_event_id`.

---

## Notes on Known Constraints / Structural Risks (from current issue register)

### A) Subscription billing is not modeled yet (one-time payment only)

**Current state**
- Razorpay integration currently supports **creating/verifying one-time orders**.
- There are no subscription lifecycle models/tables that represent monthly billing, plan periods, due dates, cancellation/renewal, etc.

**Why it matters**
- A “subscription billing cron” cannot be implemented safely without:
  - a subscription record per organization
  - a plan catalog (price + billing cadence)
  - due-date/period logic and idempotent renewal keys
  - webhook-driven status transitions (renewal success/failure)

**What should be added (implementation-level spec, no code here)**
- Database: `subscriptions` (and/or `organization_subscriptions`) with due_date, current_period_start/end, status.
- Billing service: generates due renewals by calling Razorpay using backend-owned amounts.
- Webhook mapping: update subscription status based on payment outcomes.

### B) Payment state transitions are permissive (possible regressions)

**Current state**
- Payment/provider statuses can be updated directly when processing webhooks.

**Why it matters**
- If events arrive out-of-order (or retries happen), later “intermediate” statuses may overwrite earlier terminal statuses.

**What should be added (implementation-level spec, no code here)**
- Centralized transition rules:
  - allowed transitions from each state
  - terminal-state protection (e.g., once `paid`/`succeeded`, never revert)
- Transition enforcement inside the job/service that updates `payment_transactions`.

### C) Tracking enrichment (IP geolocation) inline
- Tracking enrichment currently calls an external IP geolocation API during request flow, which can slow tracking endpoints.

### D) SMTP passwords stored as plaintext
- SMTP passwords are stored directly in DB (even though hidden from list responses). Encrypt-at-rest is recommended.


---

## References (in repo)

- `CODEBASE_DOCUMENTATION.md` (high-level map)
- `CODEBASE_ISSUES.md` (fixes already applied + remaining risks)
- `app/Services/Payments/README.md` (Razorpay integration notes)
- `routes/api.php` (API surface)

