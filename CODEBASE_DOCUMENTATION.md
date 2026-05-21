# Codebase Documentation

Last revised: 2026-05-21

## Product Overview

KnowYourMail is a multi-tenant email campaign platform. Users register into an organization, manage campaigns, upload recipients, segment audiences from CSV-derived attributes, configure SMTP senders, dispatch scheduled campaigns, track opens and clicks, review analytics, and initiate Razorpay payments.

## Runtime Architecture

The app has a Laravel API backend and a React SPA frontend.

- `routes/web.php` serves the SPA for all web paths.
- `routes/api.php` exposes JSON APIs under `/api`.
- `routes/console.php` registers scheduled commands.
- `bootstrap/app.php` wires API/web routing and middleware aliases.
- `app/Providers/AppServiceProvider.php` registers repositories, import services, and the Razorpay payment provider.

## Backend Domains

### Authentication And RBAC

Files:

- `app/Http/Controllers/Api/AuthController.php`
- `app/Repositories/AuthRepository.php`
- `app/Http/Middleware/RoleMiddleware.php`
- `app/Models/User.php`, `Role.php`, `Permission.php`, `RolePermission.php`, `UserPermission.php`

Flow:

- `/api/auth/register` creates a user and organization.
- `/api/auth/login` returns a Sanctum token.
- `/api/auth/logout` revokes the current token.
- Manager creation is protected by the `create_manager` permission and is scoped to the creator's organization.
- Role/permission routes use the `permissions` middleware alias.

### Campaigns

Files:

- `app/Http/Controllers/Api/CampaignController.php`
- `app/Models/Campaign.php`
- `app/Models/CampaignVariant.php`
- `app/Models/SegmentFilterGroup.php`
- `app/Models/SegmentFilter.php`

Flow:

- Authenticated users list, create, view, and update campaigns in their organization.
- Campaign variants represent audience segments.
- Segment filters are stored in groups. Groups are OR logic; filters inside one group are AND logic.
- Campaign URLs are normalized to include `https://` when needed.

### Recipients And CSV Imports

Files:

- `app/Http/Controllers/Api/BulkRecipientController.php`
- `app/Services/BulkImportService.php`
- `app/Jobs/ProcessCsvImportJob.php`
- `app/Services/RecipientValidationService.php`
- `app/Models/Recipient.php`

Flow:

- `/api/recipients/bulk-upload` requires Sanctum auth.
- Uploads are validated, stored temporarily, previewed synchronously, and queued for import.
- Imports detect the email column, normalize row values, upsert recipients, and save CSV insights.
- Recipients can belong to organization-level data (`module_type=1`) or campaign-level data (`module_type=2`).

### Segmentation

Files:

- `app/Http/Controllers/Api/SegmentationController.php`
- `app/Jobs/AssignSegmentsJob.php`
- `app/Models/RecipientSegmentAssignment.php`

Flow:

- Campaign insights merge campaign-specific insights over organization insights.
- Segment count validation is tenant-scoped.
- Segment field names are limited to simple alphanumeric/underscore names before being used in JSON path queries.
- Before dispatch, recipients are assigned to exactly one campaign variant.

### Dispatch And Email Sending

Files:

- `app/Console/Commands/DispatchCampaignsCommand.php`
- `app/Jobs/SendCampaignEmailJob.php`
- `app/Mail/BulkMail.php`
- `app/Models/SendLog.php`

Flow:

- `routes/console.php` schedules `campaigns:dispatch` every minute.
- Scheduled campaigns become `running`.
- Segment assignments are created synchronously.
- Send logs are pre-created with recipient, variant, email, and pending status.
- Email jobs use campaign SMTP configuration when present.
- Open pixels point to `/api/track/open/{sendLog}`.
- CTA links point to `/api/track/click/{sendLog}?url=...`.

### Tracking And Analytics

Files:

- `app/Http/Controllers/Tracking/TrackingController.php`
- `app/Http/Services/Tracking/TrackingService.php`
- `app/Http/Controllers/Api/AnalysisController.php`
- `app/Models/SendLog.php`
- `app/Models/Conversion.php`

Flow:

- Open tracking returns a 1x1 PNG and records `opened_at`, activity metadata, and region.
- Click tracking increments `clicks_count`, records last activity, and redirects to the original URL.
- Analytics endpoints summarize campaign, dashboard, hierarchy, and conversion data.

### SMTP Configuration

Files:

- `app/Http/Controllers/Api/SmtpConfigurationController.php`
- `app/Models/SmtpConfiguration.php`

Flow:

- SMTP configurations are organization scoped.
- Passwords are accepted for storage but are not returned as raw values by the list endpoint.
- Campaign sending uses the selected `sender_config_id`.

### Payments

Files:

- `app/Http/Controllers/Api/PaymentController.php`
- `app/Services/Payments/PaymentService.php`
- `app/Services/Payments/Providers/Razorpay/RazorpayProvider.php`
- `app/Services/Payments/Providers/Razorpay/RazorpayWebhookVerificationStrategy.php`
- `app/Models/PaymentTransaction.php`
- `app/Models/PaymentProviderEvent.php`
- `config/payments.php`
- `config/services.php`

Flow:

- `/api/payments/orders` creates or reuses a Razorpay order.
- `/api/payments/verify` verifies Razorpay checkout signatures.
- `/api/payments/{transaction}/status` returns org-scoped transaction state.
- `/api/payments/webhooks/razorpay` verifies the raw webhook signature, stores/deduplicates a provider event, and queues transaction processing.
- Payment users must belong to an organization.

## Frontend Structure

Files:

- `resources/js/src/App.jsx`
- `resources/js/src/store/useStore.js`
- `resources/js/src/lib/api.js`
- `resources/js/src/layouts/AppLayout.jsx`
- `resources/js/src/layouts/AuthLayout.jsx`
- `resources/js/src/pages/*`
- `resources/js/src/components/*`

Routing:

- Public: `/`, `/login`, `/signup`
- Protected: `/dashboard`, `/campaigns`, `/campaigns/new`, `/campaigns/:id`, `/templates`, `/audience`, `/bulk-import`, `/settings`

State:

- Zustand stores auth, toasts, campaigns, dashboard data, templates, and SMTP configurations.
- Axios attaches the Sanctum bearer token and redirects to login on 401.

## Data Model Summary

- `organizations`: tenant boundary.
- `users`: auth users with role, organization, and creator hierarchy.
- `roles`, `permissions`, `role_permissions`, `user_permissions`: RBAC.
- `campaigns`: campaign content, schedule, segmentation mode, sender config.
- `campaign_variants`: segment-specific subject/body/CTA.
- `segment_filter_groups`, `segment_filters`: dynamic audience rules.
- `recipients`: imported contacts and dynamic attributes.
- `recipient_segment_assignments`: recipient-to-variant assignment per campaign.
- `send_logs`: email send, open, click, bounce, and tracking state.
- `campaign_csv_insights`: inferred distributions from imports.
- `smtp_configurations`: sender SMTP settings.
- `payment_transactions`, `payment_provider_events`: Razorpay order/payment/webhook lifecycle.

## Scheduler And Cron Surface

Existing scheduled task:

```php
Schedule::command('campaigns:dispatch')->everyMinute();
```

Next payment cron work should add a dedicated command for subscription billing initiation. It should create backend-owned Razorpay orders for due subscriptions using idempotency keys, then update subscription/payment state. The current payments module can create Razorpay orders, but the codebase does not yet contain subscription tables or subscription lifecycle models.
