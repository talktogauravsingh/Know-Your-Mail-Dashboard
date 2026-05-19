# Razorpay Standard Checkout — Production Credential Placement Guide (Laravel)

## 1) What credentials you need
Razorpay integration typically requires **three secrets/keys**:

1. **Razorpay API Key**  
   - Used to authenticate calls from your backend to Razorpay (e.g., create order).
2. **Razorpay API Secret**  
   - Used to verify payment signatures and (depending on flow) webhook validation.
3. **Razorpay Webhook Secret**  
   - Used to validate webhook authenticity (best practice: separate webhook secret).

> If you use only one secret in your Razorpay dashboard setup, you can map it to both “apiSecret” and “webhookSecret” for now—**but prefer separate webhook secret** for production hardening.

---

## 2) Where to put credentials in Laravel (environment variables)
Create/update these entries in your **`.env`** file:

```env
# Razorpay Standard Checkout
RAZORPAY_API_KEY=your_api_key_here
RAZORPAY_API_SECRET=your_api_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Optional (recommended): enable/disable payment module
PAYMENTS_ENABLED=true
```

### Required values
- `RAZORPAY_API_KEY` ✅
- `RAZORPAY_API_SECRET` ✅
- `RAZORPAY_WEBHOOK_SECRET` ✅

---

## 3) Where those variables are used (in this repo)
In the current codebase, the Razorpay adapter scaffold is:

- `app/Services/Payments/Providers/Razorpay/RazorpayProvider.php`
- `app/Services/Payments/Providers/Razorpay/RazorpayWebhookVerificationStrategy.php`

Next step when you implement `createOrder()` / `verifyPayment()` and wire the provider in the service container:
- `RAZORPAY_API_KEY` and `RAZORPAY_API_SECRET` will be injected into `RazorpayProvider`
- `RAZORPAY_WEBHOOK_SECRET` will be injected into `RazorpayWebhookVerificationStrategy`

---

## 4) Recommended wiring (not yet implemented in code)
When you implement adapter wiring, do it in one of:
- `app/Providers/AppServiceProvider.php` (simple approach)
- or a dedicated payments service provider (cleaner / scalable)

Example mapping conceptually:

- `new RazorpayProvider(apiKey: env('RAZORPAY_API_KEY'), apiSecret: env('RAZORPAY_API_SECRET'), webhookVerification: new RazorpayWebhookVerificationStrategy(webhookSecret: env('RAZORPAY_WEBHOOK_SECRET')));`

---

## 5) Razorpay Webhook: which URL to configure
You will configure a Razorpay webhook endpoint URL in Razorpay dashboard to point to your Laravel API webhook route, for example:

- `POST https://your-domain.com/api/payments/webhooks/razorpay`

> This route does not exist yet in the current scaffold; once backend webhook controller/service is added, you must register this URL in Razorpay.

---

## 6) Safety notes (production)
- Never commit `.env` to git.
- Use separate webhook secret if Razorpay dashboard provides it.
- Rotate secrets if you suspect exposure.
- Ensure webhook endpoint uses:
  - signature validation (HMAC using the webhook secret)
  - idempotent event processing (dedupe by provider event id)

---

## 7) Quick checklist before deploying
- [ ] `.env` contains `RAZORPAY_API_KEY`, `RAZORPAY_API_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- [ ] Razorpay Standard Checkout order creation works (backend calls Razorpay)
- [ ] Razorpay webhook configured with correct URL
- [ ] Webhook signature validation enabled (no blind trust)
- [ ] Duplicate webhook delivery is safely deduped (idempotency)
