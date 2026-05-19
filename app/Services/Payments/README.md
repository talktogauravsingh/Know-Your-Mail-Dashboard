# Payments Module (Clean Architecture)

This folder will contain the production-grade payment infrastructure:
- Provider adapters (Razorpay Standard Checkout first; future providers later)
- Provider abstraction contracts + DTOs
- Central PaymentService orchestration (provider-agnostic)
- Webhook processing service (idempotent + retry-safe)
- Payment verification service (signature verification)
- Validation + request mapping utilities
- Audit-safe logging and consistent error handling

Planned sub-structure:
- Contracts/
- DTO/
- Providers/
- Application/
- Domain/
- Infrastructure/
- Webhooks/
- Logging/
- Exceptions/
