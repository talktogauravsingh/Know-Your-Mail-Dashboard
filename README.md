# KnowYourMail Codebase

KnowYourMail is a Laravel 13 and React/Vite SaaS application for email campaign creation, recipient imports, segmentation, campaign dispatch, analytics, SMTP configuration, RBAC, AI-assisted email copy, and Razorpay-backed payment collection.

## Stack

- Backend: PHP 8.3, Laravel 13, Sanctum, queues, scheduler.
- Frontend: React, Vite, Zustand, Axios, Tailwind CSS, lucide-react.
- Database: Laravel migrations with Eloquent models.
- Payments: Razorpay Standard Checkout through a provider abstraction.
- Background work: CSV imports, segment assignment, campaign email dispatch.

## Local Entry Points

- Web app fallback: `routes/web.php` renders `resources/views/welcome.blade.php`.
- API routes: `routes/api.php`.
- Scheduler routes: `routes/console.php`.
- React app: `resources/js/src/App.jsx`.
- Shared API client: `resources/js/src/lib/api.js`.

## Local Setup

The repository currently has a `.env` file. Keep real secrets only in `.env`; do not copy them into committed docs or examples.

Prerequisites:

- PHP 8.3+
- Composer
- Node.js and npm
- A configured database matching `.env`

Install dependencies:

```bash
composer install
npm install
```

Only if `APP_KEY` is empty in `.env`, generate it:

```bash
php artisan key:generate
```

Do not use `composer setup` for this project unless you intentionally want migrations to run, because that script includes `php artisan migrate --force`.

If `composer`, `php`, `node`, or `npm` is not recognized, install the missing tool and reopen the terminal so PATH is refreshed.

## Running Locally

Start the full local dev stack:

```bash
composer dev
```

This runs Laravel, the queue listener, Laravel logs, and Vite together. Open:

```text
http://127.0.0.1:8000
```

or:

```text
http://localhost:8000
```

## Core Documentation

- Full codebase map: `CODEBASE_DOCUMENTATION.md`.
- Structural issue register and fixes: `CODEBASE_ISSUES.md`.
- Razorpay payment workflow: `PAYMENTS_RAZORPAY_CREDENTIALS_DOC.md`.
- Payment implementation notes: `app/Services/Payments/README.md`.

## Important Operational Notes

- Do not trust frontend-supplied payment amounts. Plans and amounts are loaded from `config/payments.php`.
- Payment credentials are read from `config/services.php` using `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.
- The scheduler currently dispatches campaigns every minute via `campaigns:dispatch`.
- Tests and migrations were intentionally not run during this documentation and repair pass.
