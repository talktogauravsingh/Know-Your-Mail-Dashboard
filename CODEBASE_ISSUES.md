# Codebase Issue Register

Last revised: 2026-05-21

## Fixed In This Pass

1. Public recipient upload endpoint

- Issue: `/api/recipients/bulk-upload` accepted CSV uploads without auth and used fallback user/org ids.
- Risk: unauthenticated data writes and cross-tenant pollution.
- Fix: route now requires `auth:sanctum`; controller rejects missing users and uses the authenticated user's organization and id.

2. Campaign CSV upload could target another organization's campaign

- Issue: `campaign_id` validation only checked table existence.
- Risk: one tenant could attach uploaded data to another tenant's campaign.
- Fix: bulk upload now verifies the campaign belongs to the authenticated user's organization.

3. Segmentation insight and count routes leaked tenant context

- Issue: route-model-bound campaign insights and `validateCount` were not consistently org-scoped and used organization `1` fallbacks.
- Risk: cross-tenant analytics leaks.
- Fix: both paths now require the authenticated user's organization to own the campaign.

4. Campaign email dispatch was disabled

- Issue: `SendCampaignEmailJob::handle()` returned immediately.
- Risk: scheduled campaigns created assignments and send logs but never sent email.
- Fix: removed the early return and restored the send flow.

5. Tracking URLs did not match registered routes

- Issue: email jobs generated `/api/track/open/{id}`, but routes were `/api/o/{id}` and `/api/c/{id}`.
- Risk: opens/clicks were not tracked from newly sent campaign emails.
- Fix: added `/api/track/open/{sendLog}` and `/api/track/click/{sendLog}` while keeping legacy short routes.

6. Tracking looked up recipients instead of send logs

- Issue: tracking accepted an id but treated it as a recipient id, then queried fields that no longer match the current recipient architecture.
- Risk: wrong or missing tracking updates.
- Fix: tracking now resolves the route id as a `send_logs.id`.

7. Send logs missed fields needed by campaign sending

- Issue: `recipient_id`, `variant_id`, and `email` were not consistently fillable or inserted.
- Risk: analytics relations and fallback send-log creation could break.
- Fix: `SendLog` fillable fields were updated and dispatch inserts now include email.

8. New registered users lacked an organization

- Issue: registration created a user with no `organization_id`.
- Risk: campaigns, payments, SMTP, imports, and analytics assume a tenant id.
- Fix: registration now creates an organization and attaches the user to it.

9. Manager creation could be assigned outside tenant

- Issue: `organization_id` was nullable and caller-supplied.
- Risk: cross-tenant manager creation.
- Fix: managers are always created in the logged-in user's organization.

10. Dynamic segment field names could enter raw JSON path SQL

- Issue: filter field names were interpolated into JSON path expressions.
- Risk: malformed queries or SQL injection surface through field names.
- Fix: segment field names are restricted to letters, numbers, and underscores before use.

11. Payment order/status logic accepted users without organizations

- Issue: payment service cast null org ids to `0`.
- Risk: invalid transaction ownership and webhook correlation edge cases.
- Fix: payment service now rejects users without a valid organization.

12. Razorpay webhook processing was synchronous

- Issue: webhook signature validation, persistence, and transaction update happened inline.
- Risk: slow requests under provider retry pressure; duplicate entries if webhooks retry.
- Fix: webhook requests now verify the raw Razorpay signature, persist one event by `provider_event_id`, acknowledge quickly, and dispatch `ProcessRazorpayWebhookEventJob` for transaction updates.

## Remaining Structural Risks

1. Subscription billing is not modeled yet

- Current state: payments support one-time Razorpay order creation and verification.
- Needed before monthly cron: subscription table/model, plan table or config, billing period fields, due-date logic, idempotency keys per billing cycle, and subscription status transitions.

2. Payment state transitions are permissive

- Current state: status strings are updated directly.
- Risk: later webhooks can regress final states unless transition rules are centralized.
- Recommended fix: add an allowed-transition map and terminal state protection.

3. SendLog schema and legacy send path are partially divergent

- Current state: campaign sending uses recipient/variant ids; legacy `SendEmailJob` still writes email-only logs and organization `1` suppressions.
- Risk: analytics consistency issues if the legacy command is used.
- Recommended fix: retire or modernize `app:dispatch-campaign`.

4. Migrations contain incomplete down methods and historical typos

- Current state: some migrations do not fully reverse changes, and `update_table_receiptents` is misspelled.
- Risk: local rollback friction.
- Recommended fix: create forward-only repair migrations if production has already consumed these files.

5. SMTP passwords are stored as plain text

- Current state: passwords are hidden from list responses but stored directly.
- Risk: credential exposure if DB is compromised.
- Recommended fix: encrypt with Laravel casts or accessors.

6. Tracking service calls an external IP geolocation API inline

- Current state: `file_get_contents()` calls `ip-api.com` during tracking.
- Risk: slow tracking responses and external dependency failures.
- Recommended fix: queue enrichment or cache by IP.

7. Frontend auth initialization uses `user === null` as both initial and logged-out state

- Current state: protected routes can show a loader until auth initialization mutates state.
- Risk: confusing navigation edge cases.
- Recommended fix: add an explicit `authInitialized` boolean.

8. Duplicate toast definitions exist in the Zustand store

- Current state: `toasts`, `addToast`, and `removeToast` are declared twice.
- Risk: maintenance noise.
- Recommended fix: remove the duplicate block.

9. Tests were not run

- Reason: user requested no testing.
- Residual risk: syntax and runtime behavior should be validated later with targeted lint/test commands.
