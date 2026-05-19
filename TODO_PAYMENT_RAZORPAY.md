# TODO — Razorpay Payment Infrastructure (Production-grade)

## Phase 0: Status verification (already done)
- [x] Create DB migration + schema for payments/transactions and webhook audit tables
      - `database/migrations/2026_05_19_000001_create_payments_tables.php`
- [x] Provider abstraction contracts + DTOs scaffold
      - `app/Services/Payments/Contracts/PaymentProviderInterface.php`
      - `app/Services/Payments/DTO/*`
- [x] Webhook signature verification contract + Razorpay HMAC strategy
      - `app/Services/Payments/Contracts/WebhookVerificationStrategy.php`
      - `app/Services/Payments/Providers/Razorpay/RazorpayWebhookVerificationStrategy.php`
- [x] Razorpay provider adapter scaffold (create/verify methods still not implemented)
      - `app/Services/Payments/Providers/Razorpay/RazorpayProvider.php`
- [x] Credential placement documentation
      - `PAYMENTS_RAZORPAY_CREDENTIALS_DOC.md`
- [ ] Fix provider interface signature mismatch (see Phase 1 item below)

## Phase 1: Backend Clean Architecture Scaffolding
- [ ] Add Eloquent models for payment entities (Transaction, PaymentProviderEvent)
- [ ] Add repository/query layer for:
      - idempotent order creation (org + provider + idempotency_key)
      - idempotent webhook/event persistence (provider_event_id)
      - safe state transitions under concurrency
- [ ] Implement centralized PaymentService (orchestrates order create, verify, state transitions)
- [ ] Implement Checkout orchestration layer (backend-trusted order data -> provider order -> transaction row)
- [ ] Implement Validation + Request DTO mapping + idempotency key handling
- [ ] Implement Audit-safe logging utility (no secrets)
- [ ] Implement error handling layer (custom exceptions + consistent HTTP responses)
- [ ] Align interface contract mismatch:
      - `PaymentProviderInterface::validateWebhookSignature(array $payload, string $receivedSignature): bool`
      - Razorpay strategy currently tolerates `null` signature (`?string`) in `validate(...)`
- [ ] Implement Payment verification layer (signature + state transition lifecycle rules)

## Phase 2: Backend APIs + Webhooks
- [ ] Add endpoint: POST `/api/payments/orders` (secure order creation + Razorpay order generation)
- [ ] Add endpoint: POST `/api/payments/verify` (verification API + signature verification)
- [ ] Add endpoint: POST `/api/payments/webhooks/razorpay` (webhook signature validation + retry-safe processing)
- [ ] Add endpoint: GET `/api/payments/{id}/status` (refresh-safe polling for frontend)
- [ ] Ensure idempotency:
      - [ ] order creation idempotency
      - [ ] webhook idempotency by event id
      - [ ] verify idempotency by provider payment id
- [ ] Implement retry-safe webhook processing:
      - quick 2xx ack where appropriate
      - enqueue processing job
      - ensure DB transactions and dedupe keys prevent double-processing
- [ ] Transaction state lifecycle:
      - enforce allowed transitions
      - handle abandoned/expired/failed/partial failures

## Phase 3: Frontend Integration (Refresh-safe UX)
- [ ] Create React payment hook/service to call backend endpoints
- [ ] Create Razorpay Standard Checkout UI component
- [ ] Implement loading states, retry UI, failure handling
- [ ] Implement refresh-safe flow:
      - [ ] poll backend status by transaction id/client reference id
      - [ ] handle refresh during checkout
- [ ] Ensure frontend never computes/sets amounts locally

## Phase 4: Provider Extensibility
- [ ] Add provider registry/factory for future providers
- [ ] Add configuration layer for switching providers (env/config)
- [ ] Keep shared orchestration logic provider-agnostic

## Phase 5: Tests (Planning already created in TDD_PAYMENT_RAZORPAY_PLAN.md)
- [ ] Add PHPUnit/Laravel Feature tests skeletons for endpoints (without calling Razorpay)
- [ ] Add webhook processing tests for duplicates/out-of-order/invalid signature
- [ ] Add request validation + idempotency tests
- [ ] Add frontend component tests (if framework setup exists in repo)

## Phase 6: Deployment/Operations
- [ ] Document env vars required (Razorpay keys + webhook secret)
- [ ] Document monitoring/logging recommendations
- [ ] Ensure webhook endpoint is resilient to timeouts (quick ack + async processing if needed)
