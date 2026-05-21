# Payments Module

This module owns backend-trusted payment order creation, checkout verification, webhook verification, transaction state, and provider-event audit logs.

## Current Provider

Razorpay Standard Checkout is wired through `PaymentProviderInterface`.

- Provider adapter: `Providers/Razorpay/RazorpayProvider.php`
- Webhook signature strategy: `Providers/Razorpay/RazorpayWebhookVerificationStrategy.php`
- Service orchestration: `PaymentService.php`
- HTTP controller: `app/Http/Controllers/Api/PaymentController.php`

## Current Flow

1. Authenticated user calls `POST /api/payments/orders` with `plan_key`.
2. Backend loads amount/currency from `config/payments.php`.
3. `PaymentService` creates or reuses a `payment_transactions` row by organization, provider, and idempotency key.
4. `RazorpayProvider` creates the Razorpay order.
5. Frontend opens Razorpay Checkout.
6. Frontend sends checkout result to `POST /api/payments/verify`.
7. Backend verifies the Razorpay signature and marks the transaction `PAID` or `VERIFICATION_FAILED`.
8. Razorpay webhooks are verified using the raw payload and stored once in `payment_provider_events`.
9. `ProcessRazorpayWebhookEventJob` processes the stored event and updates the matching transaction.

## Guardrails

- Users must belong to an organization before creating or checking payments.
- Amounts are never accepted from the frontend.
- Webhooks are protected by `X-Razorpay-Signature`.
- Duplicate order creation is controlled by idempotency keys.
- Duplicate webhooks are controlled by `provider_event_id`.
- Webhook requests return after validation and event persistence; transaction updates happen through the queue.

## Subscription Cron Gap

The module can create one-time orders, but subscriptions are not modeled yet. Monthly billing needs subscription data first: plan, amount, billing anchor, next billing date, latest transaction, status, and retry state.
