# Razorpay Standard Checkout - Credentials And Payment Workflow

This document explains where Razorpay credentials live, how the payment flow works, and how that flow maps to the current Laravel code.

## 1) Required Environment Variables

These keys are referenced by the codebase and are present as blank entries in `.env.example`:

```env
# Razorpay Standard Checkout
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Optional
RAZORPAY_BASE_URL=https://api.razorpay.com/v1
PAYMENT_PROVIDER=razorpay
```

For local or production runtime, copy the blank keys into your real `.env` file and fill them with values from the Razorpay dashboard. Do not commit real Razorpay credentials.

Important naming note:

- The current Laravel config reads `RAZORPAY_KEY_ID`, not `RAZORPAY_API_KEY`.
- The current Laravel config reads `RAZORPAY_KEY_SECRET`, not `RAZORPAY_API_SECRET`.
- `RAZORPAY_WEBHOOK_SECRET` is used only for webhook signature validation.

## 2) Where Credentials Are Loaded

Credentials are loaded in `config/services.php`:

```php
'razorpay' => [
    'key' => env('RAZORPAY_KEY_ID'),
    'secret' => env('RAZORPAY_KEY_SECRET'),
    'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET'),
    'base_url' => env('RAZORPAY_BASE_URL', 'https://api.razorpay.com/v1'),
],
```

The provider is wired in `app/Providers/AppServiceProvider.php`:

- `RazorpayWebhookVerificationStrategy` receives `services.razorpay.webhook_secret`.
- `PaymentProviderInterface` resolves to `RazorpayProvider`.
- `RazorpayProvider` receives the key id, key secret, webhook verifier, and base URL.

## 3) API Routes

Defined in `routes/api.php`:

```php
POST /api/payments/orders
POST /api/payments/verify
GET  /api/payments/{transaction}/status
POST /api/payments/webhooks/razorpay
```

Authentication:

- `/api/payments/orders`, `/api/payments/verify`, and `/api/payments/{transaction}/status` require `auth:sanctum`.
- `/api/payments/webhooks/razorpay` does not use user auth because it is called by Razorpay. It is protected by `X-Razorpay-Signature`.

## 4) Razorpay Payment Workflow

### Step 1 - Frontend asks backend to create an order

Frontend calls:

```http
POST /api/payments/orders
Authorization: Bearer <sanctum_token>
Idempotency-Key: optional-client-generated-key
Content-Type: application/json
```

Example body:

```json
{
  "plan_key": "manual_test",
  "client_reference_id": "optional-client-reference",
  "notes": {
    "source": "checkout"
  }
}
```

Code path:

1. `PaymentController::createOrder()` validates `plan_key`, optional `client_reference_id`, optional body `idempotency_key`, and optional `notes`.
2. It loads amount and currency from `config/payments.php`.
3. It passes the request to `PaymentService::createOrder()`.
4. `PaymentService` creates or reuses a `payment_transactions` row using `organization_id`, `idempotency_key`, and `provider`.
5. `PaymentService` calls `RazorpayProvider::createOrder()`.
6. `RazorpayProvider` calls Razorpay `POST /v1/orders` using Basic Auth with `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
7. The local transaction is updated from `ORDER_PENDING` to `ORDER_CREATED`.

Response:

```json
{
  "transaction_id": 1,
  "provider": "razorpay",
  "provider_order_id": "order_xxxxx",
  "plan_key": "manual_test",
  "amount_minor": 100,
  "currency": "INR",
  "status": "ORDER_CREATED",
  "razorpay_key_id": "rzp_live_or_test_key"
}
```

The frontend uses `razorpay_key_id`, `provider_order_id`, `amount_minor`, and `currency` to open Razorpay Standard Checkout.

### Step 2 - Customer completes Razorpay Standard Checkout

After the customer completes checkout, Razorpay returns these values to the frontend checkout success handler:

```json
{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_xxxxx"
}
```

The frontend must send those values to the backend for verification.

### Step 3 - Frontend asks backend to verify payment

Frontend calls:

```http
POST /api/payments/verify
Authorization: Bearer <sanctum_token>
Content-Type: application/json
```

Body:

```json
{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_xxxxx"
}
```

Code path:

1. `PaymentController::verify()` validates the three Razorpay fields.
2. `PaymentService::verifyPayment()` finds the transaction by `organization_id` and `provider_order_id`.
3. If the transaction is already `PAID` for the same payment id, it returns the existing transaction.
4. `RazorpayProvider::verifyPayment()` computes:

```text
hash_hmac('sha256', razorpay_order_id + '|' + razorpay_payment_id, RAZORPAY_KEY_SECRET)
```

5. The computed signature is compared with `razorpay_signature` using `hash_equals()`.
6. If valid, the transaction becomes `PAID`.
7. If invalid, the transaction becomes `VERIFICATION_FAILED` and the API returns `422`.

Success response:

```json
{
  "transaction_id": 1,
  "provider_order_id": "order_xxxxx",
  "provider_payment_id": "pay_xxxxx",
  "status": "PAID"
}
```

## 5) Status Lookup Workflow

Frontend can check a transaction status:

```http
GET /api/payments/{transaction_id}/status
Authorization: Bearer <sanctum_token>
```

Code path:

1. `PaymentController::status()` receives the transaction id.
2. `PaymentService::getStatus()` only searches inside the authenticated user's `organization_id`.
3. The API returns provider ids, amount, currency, and current status.

## 6) Razorpay Webhook Workflow

Configure this URL in the Razorpay dashboard:

```text
POST https://your-domain.com/api/payments/webhooks/razorpay
```

Recommended Razorpay events:

- `payment.authorized`
- `payment.captured`
- `payment.failed`
- `order.paid`

Code path:

1. Razorpay sends the raw JSON payload and `X-Razorpay-Signature` header.
2. `PaymentController::razorpayWebhook()` passes the decoded payload, raw payload, and signature to `PaymentService::processRazorpayWebhook()`.
3. `PaymentService` calls `RazorpayProvider::validateRawWebhookSignature()`.
4. `RazorpayWebhookVerificationStrategy::validateRawPayload()` computes an HMAC SHA256 signature over the raw request body using `RAZORPAY_WEBHOOK_SECRET`.
5. If the signature is invalid, the API returns `401`.
6. If valid, the event is stored in `payment_provider_events`.
7. Duplicate webhook deliveries are ignored by checking the unique `provider_event_id`.
8. If the webhook matches an existing transaction by `provider_order_id` or `provider_payment_id`, the transaction status is updated.

Webhook status mapping:

| Razorpay event | Local transaction status |
| --- | --- |
| `payment.captured` | `PAID` |
| `order.paid` | `PAID` |
| `payment.failed` | `FAILED` |
| `payment.authorized` | `AUTHORIZED` |
| Other events | unchanged |

Webhook response:

```json
{
  "status": "ok",
  "event_id": "evt_or_derived_id",
  "event_status": "PROCESSED"
}
```

If no matching transaction is found, the event is still stored with status `IGNORED`.

## 7) Database Tables Used

Created by `database/migrations/2026_05_19_000001_create_payments_tables.php`.

### `payment_transactions`

Stores the backend-owned payment lifecycle:

- `organization_id`, `user_id`
- `idempotency_key`
- `provider`
- `provider_order_id`
- `provider_payment_id`
- `currency`
- `amount_minor`
- `status`
- sanitized request, verification, and provider metadata

Important uniqueness rules:

- `provider_order_id` is unique.
- `provider_payment_id` is unique when present.
- `organization_id + idempotency_key + provider` is unique for safe order retries.

### `payment_provider_events`

Stores signed webhook deliveries:

- `provider_event_id`
- `event_type`
- `provider_order_id`
- `provider_payment_id`
- `provider_signature`
- sanitized payload
- processing status

`provider_event_id` is unique so webhook retries do not double-process payment state.

## 8) Current Code Map

| Area | File |
| --- | --- |
| API routes | `routes/api.php` |
| HTTP controller | `app/Http/Controllers/Api/PaymentController.php` |
| Payment orchestration | `app/Services/Payments/PaymentService.php` |
| Provider contract | `app/Services/Payments/Contracts/PaymentProviderInterface.php` |
| Razorpay API adapter | `app/Services/Payments/Providers/Razorpay/RazorpayProvider.php` |
| Razorpay webhook signature verifier | `app/Services/Payments/Providers/Razorpay/RazorpayWebhookVerificationStrategy.php` |
| Create-order DTO | `app/Services/Payments/DTO/CreateOrderInput.php` |
| Verify-payment DTO | `app/Services/Payments/DTO/VerifyPaymentInput.php` |
| Transaction model | `app/Models/PaymentTransaction.php` |
| Webhook event model | `app/Models/PaymentProviderEvent.php` |
| Service container wiring | `app/Providers/AppServiceProvider.php` |
| Payment plans | `config/payments.php` |
| Razorpay credential config | `config/services.php` |

## 9) End-To-End Sequence

```text
Frontend
  -> POST /api/payments/orders
Laravel
  -> creates/reuses payment_transactions row
  -> POST https://api.razorpay.com/v1/orders
  -> returns provider_order_id and razorpay_key_id
Frontend
  -> opens Razorpay Standard Checkout
Razorpay Checkout
  -> returns razorpay_order_id, razorpay_payment_id, razorpay_signature
Frontend
  -> POST /api/payments/verify
Laravel
  -> verifies checkout signature using RAZORPAY_KEY_SECRET
  -> marks transaction PAID or VERIFICATION_FAILED
Razorpay
  -> POST /api/payments/webhooks/razorpay
Laravel
  -> verifies webhook signature using RAZORPAY_WEBHOOK_SECRET
  -> stores event
  -> updates transaction status when matched
Frontend
  -> GET /api/payments/{transaction_id}/status when it needs latest state
```

## 10) Production Checklist

- [ ] `.env` contains `RAZORPAY_KEY_ID`.
- [ ] `.env` contains `RAZORPAY_KEY_SECRET`.
- [ ] `.env` contains `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Razorpay dashboard webhook URL points to `/api/payments/webhooks/razorpay`.
- [ ] Webhook events include at least `payment.captured`, `payment.failed`, and `order.paid`.
- [ ] Frontend calls `/api/payments/verify` after checkout success.
- [ ] Frontend never trusts payment success until backend verification returns `PAID`.
- [ ] `.env` is never committed.
- [ ] Production secrets are rotated if they were ever exposed.
