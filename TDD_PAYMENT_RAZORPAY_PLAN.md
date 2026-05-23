# Payment Infrastructure – Razorpay Checkout (Test Plan + Case Templates)
*(Drafts to be filled as implementation is developed.)*

## 0. Scope
This plan covers a production-grade payment module integrating **Razorpay Standard Checkout** via:
- Secure order creation (backend-generated amount/currency/order metadata)
- Razorpay order generation
- Payment verification API (signature verification)
- Webhook endpoint + webhook signature validation
- Idempotent, retry-safe webhook processing
- Transaction state lifecycle management + race-condition safety
- Audit-safe logging and robust error handling

## 1. Test Strategy (when code is ready)
We will add tests in 2 layers:

### A) Backend unit/integration tests (PHP / PHPUnit)
- **Domain/service layer**: provider adapter contract behavior, idempotency logic, signature verification utilities.
- **Controller layer**: request validation, correct HTTP responses, idempotency responses.
- **Webhook processing**: duplicate/out-of-order handling, DB transaction safety, idempotent state transitions.

### B) API tests (Feature tests / HTTP calls)
- Use Laravel Feature tests to call endpoints with realistic payloads.
- For signature verification tests, use deterministic known secrets (test env vars).

> Note: Razorpay itself is not called in tests; we validate our logic using deterministic inputs and mocked provider adapters where needed.

## 2. Test Data & Fixtures
Create reusable fixtures/helpers:
- `razorpay_test_secret` (env)
- Sample webhook payloads:
  - `order.paid` success
  - duplicate event
  - invalid signature event
  - out-of-order event (verification before order is created)
- Sample payment verification inputs:
  - valid signature
  - invalid signature
  - mismatched payment/order IDs

## 3. Idempotency / Replay Attack Coverage Matrix
We will explicitly test:
- Duplicate `order creation` requests with same idempotency key
- Duplicate webhook deliveries with same event id
- Concurrent webhook + verify API calls for the same payment
- Replays with altered payload but same event id/signature (must fail signature verification)

## 4. Backend Test Cases (Checklist)
### 4.1 Secure order creation: `POST /api/payments/orders`
**TC-ORDER-001**: Reject if missing required fields  
- Expected: `422` validation error

**TC-ORDER-002**: Reject tampered amount/currency coming from frontend  
- Expected: backend uses only trusted backend-side inputs (or rejects mismatched values)

**TC-ORDER-003**: Creates payment record + returns Razorpay order id  
- Expected: `201`, DB has transaction in `ORDER_CREATED`

**TC-ORDER-004**: Idempotency works for duplicate requests  
- Given same `idempotency_key`, same user/org, repeat call  
- Expected: returns same `razorpay_order_id` and does not create duplicate rows

**TC-ORDER-005**: Concurrency safety on idempotent key  
- Send 2 concurrent requests with same key  
- Expected: single Razorpay order and consistent transaction row

---

### 4.2 Payment verification: `POST /api/payments/verify`
**TC-VERIFY-001**: Reject if signature invalid  
- Expected: `400/422` with verification failure

**TC-VERIFY-002**: Reject if payment/order ids mismatch existing record  
- Expected: `404/409` depending on spec

**TC-VERIFY-003**: Verify moves state from `ORDER_CREATED` -> `PAID_VERIFIED`  
- Expected: correct state transition and immutable audit record

**TC-VERIFY-004**: Verify API idempotency (same payment id called multiple times)  
- Expected: no duplicate state transitions; returns current state

**TC-VERIFY-005**: Race condition: verify called concurrently with webhook processing  
- Expected: exactly-once semantics for state change via DB locking / optimistic concurrency

---

### 4.3 Webhook processing: `POST /api/payments/webhooks/razorpay`
**TC-WH-001**: Reject webhook if signature invalid  
- Expected: `401`/`400`, no DB state change

**TC-WH-002**: Process valid `order.paid` event  
- Expected: state transitions to `PAID` and persists provider raw event (audit-safe)

**TC-WH-003**: Duplicate webhook delivery with same event id  
- Expected: idempotent no-op; returns success (2xx) without duplicating payment state

**TC-WH-004**: Out-of-order webhook arrives before order record exists  
- Expected: retry-safe behavior:
  - either store as pending event / mark `NEEDS_ORDER`
  - or fail with retriable status depending on design

**TC-WH-005**: Webhook delays: repeated events until order record is created  
- Expected: eventually consistent final correct state

**TC-WH-006**: Replay attack with reused signature (should not succeed)  
- Expected: signature verification + payment/order id consistency checks prevent replay

**TC-WH-007**: Partial failures + crash simulation
- Simulate DB write failure mid-processing  
- Expected: transactional rollback leaves DB consistent; webhook can be retried safely

---

### 4.4 Transaction lifecycle state model
**TC-STATE-001**: Invalid transitions are rejected  
- Example: `FAILED` -> `PAID` unless explicitly allowed by provider verification rules

**TC-STATE-002**: Abandoned payments expire properly (if implemented)
- Expected: `EXPIRED/ABANDONED` state after TTL

**TC-STATE-003**: Failed verification leads to `VERIFICATION_FAILED`  
- Expected: allow retries with backoff rules if policy permits

---

## 5. Frontend Test Cases (when UI is implemented)
**TC-FE-001**: Checkout initiation uses only backend order data  
- Expected: no amount calculation; renders Razorpay options from API response

**TC-FE-002**: Refresh-safe UX
- User refreshes while Razorpay is open / before redirect  
- Expected: UI can recover by calling status endpoint / polling payment state

**TC-FE-003**: Success callback updates UI correctly
- Expected: transitions to success page/state after backend confirms paid

**TC-FE-004**: Failure callback + retry UI
- Expected: retry button triggers re-query, not re-create payment unless idempotency says safe

**TC-FE-005**: Network failure during checkout init
- Expected: display retry UI with safe backoff

## 6. Required Endpoints for Testability
When implementation is ready, tests will cover:
- `POST /api/payments/orders`
- `POST /api/payments/verify`
- `POST /api/payments/webhooks/razorpay`
- `GET  /api/payments/{id}/status` (or equivalent)
- (Optional) `POST /api/payments/{id}/retry` if designed

## 7. What I Need From Implementation (to finalize tests)
To finalize concrete test payloads, we need:
- exact DB schema (tables + unique keys)
- exact idempotency key rules
- exact webhook event types we support initially (e.g., `order.paid` only or more)
- exact state machine allowed transitions

## 8. Deliverable Updates
- When backend scaffolding and services are written, this file will be updated with:
  - exact endpoint specs
  - exact payload examples
  - concrete PHPUnit test skeletons
  - mocking strategy for Razorpay signature verification
