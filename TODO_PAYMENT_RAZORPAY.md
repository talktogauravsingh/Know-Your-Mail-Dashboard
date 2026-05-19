# TODO — Razorpay Payment Infrastructure (Production-grade)

## Phase 1: Backend Clean Architecture Scaffolding
- [ ] Create DB migration + schema for payments/transactions and webhook audit tables
- [ ] Add Eloquent models for payment entities (Transaction, PaymentProviderEvent)
- [ ] Add provider abstraction contracts (PaymentProviderInterface, DTOs)
- [ ] Implement Razorpay adapter (RazorpayStandardProvider)
- [ ] Implement centralized PaymentService (orchestrates order create, verify, state transitions)
- [ ] Implement Validation + Request DTO mapping + idempotency key handling
- [ ] Implement Audit-safe logging utility (no secrets)
- [ ] Implement error handling layer (custom exceptions + consistent HTTP responses)

## Phase 2: Backend APIs + Webhooks
- [ ] Add endpoint: POST `/api/payments/orders` (secure order creation + Razorpay order generation)
- [ ] Add endpoint: POST `/api/payments/verify` (verification API + signature verification)
- [ ] Add endpoint: POST `/api/payments/webhooks/razorpay` (webhook signature validation + retry-safe processing)
- [ ] Add endpoint: GET `/api/payments/{id}/status` (refresh-safe polling for frontend)
- [ ] Ensure idempotency:
  - [ ] order creation idempotency
  - [ ] webhook idempotency by event id
  - [ ] verify idempotency by provider payment id

## Phase 3: Frontend Integration (Refresh-safe UX)
- [ ] Create React payment hook/service to call backend endpoints
- [ ] Create Razorpay Standard Checkout UI component
- [ ] Implement loading states, retry UI, failure handling
- [ ] Implement refresh-safe flow:
  - [ ] poll backend status by transaction id
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
