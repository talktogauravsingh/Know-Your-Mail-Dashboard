# MailTracker SDK Specification

This document describes the public browser SDK at `public/sdk/mailtracker-sdk.js`.
It explains configuration, storage behavior, API calls, event tracking, and helper methods.

## Overview

The SDK exposes a global `MailTracker` object that enables:

- initialization with backend API configuration
- redirect-based CTA tracking via form POST
- conversion event submission with retry and queue support
- signed email redirect link construction
- automatic form and button conversion tracking
- tracking context retrieval and clearing

The SDK is designed for use in a browser environment and uses fallback storage when `localStorage` is unavailable.

---

## 1. Default Configuration

Default settings in `defaultConfig`:

- `apiBaseUrl`: `window.location.origin`
- `cookieName`: `mailtracker_cta`
- `storagePrefix`: `mailtracker_`
- `timeoutMs`: `30000`
- `autoRetry`: `true`
- `maxRetries`: `3`
- `retryDelayMs`: `1000`
- `debug`: `false`
- `attributionWindowDays`: `30`

These values are merged with user-provided config in `MailTracker.init()`.

---

## 2. Storage Strategy

The SDK stores data using a fallback strategy:

1. `localStorage`
2. `sessionStorage`
3. in-memory object

Storage helpers:

- `getWithFallback(key)`
- `setWithFallback(key, value)`
- `removeWithFallback(key)`

Stored items use the prefix `mailtracker_`, for example `mailtracker_event_queue`.

---

## 3. Tracking Context

The SDK reads tracking context from a cookie:

- cookie name: `mailtracker_cta` by default

Methods:

- `getTrackingContext()` returns parsed cookie JSON or raw string
- `clearTracking()` deletes the cookie and removes stored event queue

---

## 4. Event Queue & Retry

The SDK keeps a queue of conversion events that fail to send.

Queue methods:

- `loadEventQueue()` loads queue from storage
- `saveEventQueue()` persists queue
- `queueEvent(event)` adds a queued event
- `removeQueuedEvent(index)` removes an event from queue
- `processEventQueue()` retries queued events

Retry behavior:

- does nothing if already retrying or queue is empty
- processes queued `conversion` events
- increments `retry_count` on failure
- respects `config.maxRetries`

Event queue is periodically processed using `setInterval(processEventQueue, config.retryDelayMs)`.

---

## 5. API Communication

The SDK uses `fetch` with a timeout helper:

- `fetchWithTimeout(url, options)` resolves as `fetch()` or rejects after `timeoutMs`

Endpoint used for conversion submission:

- POST `${config.apiBaseUrl}/api/cta/conversion`

`sendConversionEventInternal(payload)`:

- sends JSON body
- uses `credentials: 'include'`
- returns `true` on successful response
- returns `false` on failure and logs error

---

## 6. Public Methods

### `MailTracker.init(userConfig = {})`

Initializes the SDK.

Inputs:

- `apiBaseUrl`: required string
- optional override values from default config

Behavior:

- merges config
- normalizes `apiBaseUrl`
- loads event queue
- starts retry interval
- listens for `beforeunload` to process queued events

Returns: `MailTracker`


### `MailTracker.redirect(payload)`

Performs a tracked redirect via hidden POST form.

Required fields:

- `campaignId`
- `destinationUrl`

Optional fields:

- `campaignName`
- `email`
- `redirectUrl` (defaults to current page URL)
- `conversionPoint`
- `attributionWindowDays` (defaults to config value)
- `metadata`

Behavior:

- validates `destinationUrl`
- posts to `${config.apiBaseUrl}/api/cta/redirect`
- submits a hidden form appended to `document.body`


### `MailTracker.generateTokenUrl(campaignId, options = {})`

Returns a server-side token generation URL:

- `${config.apiBaseUrl}/api/cta/generate-token?campaign_id=${campaignId}&expires_in_days=${options.expiresInDays || 30}`

Use case: request a signed redirect token from the backend for email links.


### `MailTracker.buildEmailLink(token, destinationUrl, email = null, metadata = null)`

Builds an email-safe redirect link.

Inputs:

- `token`: required
- `destinationUrl`: required and must be valid URL
- `email`: optional
- `metadata`: optional object

Returns a URL:

- `${config.apiBaseUrl}/r/${token}?destination_url=...`

If provided, `email` and `metadata` are appended to query parameters.


### `MailTracker.sendConversionEvent(eventPayload)`

Sends a conversion event to the backend.

Required:

- `value`: non-negative number
- either `redirectUuid` or `trackingToken`

Optional:

- `email`
- `eventType` (defaults to `'purchase'`)
- `currency` (defaults to `'USD'`)
- `metadata`
- `eventId`

Behavior:

- validates payload
- generates `eventId` if missing
- calls `sendConversionEventInternal(body)`
- on failure and `autoRetry` enabled: queues event and resolves with queued status
- on failure and `autoRetry` disabled: rejects with error

Returns: `Promise` resolving with success/queued state.


### `MailTracker.getTrackingContext()`

Returns the current tracking cookie contents.


### `MailTracker.clearTracking()`

Clears the tracking cookie and event queue storage.


### `MailTracker.debug()`

Returns diagnostic info:

- runtime timestamp
- effective config values
- tracking context
- pending event count
- event queue contents when debug mode is enabled
- storage and cookie availability


### `MailTracker.trackForms(options = {})`

Automatic form tracking for selectors matching `form[data-mailtracker-track]`.

Behavior:

- listens for `submit` events
- reads `data-conversion-type` and `data-conversion-value`
- sends a conversion event when current tracking context includes `tracking_token`
- includes metadata: `form_id`, `form_name`, `form_fields`


### `MailTracker.trackButtons(options = {})`

Automatic button tracking for selectors matching `button[data-mailtracker-track]`.

Behavior:

- listens for `click` events
- reads `data-event-type` and `data-event-value`
- sends a conversion event when current tracking context includes `tracking_token`
- includes metadata: `button_id`, `button_text`


### `MailTracker.enableAutoTracking(options = {})`

Enables both form and button tracking.

---

## 7. Validation Rules

- `apiBaseUrl` must be provided to `MailTracker.init`
- `MailTracker.redirect` requires `campaignId` and `destinationUrl`
- `MailTracker.buildEmailLink` requires `token` and `destinationUrl`
- `destinationUrl` must be a valid URL for redirect and link building
- `MailTracker.sendConversionEvent` requires either `redirectUuid` or `trackingToken`
- `value` must be a non-negative number

---

## 8. Logging

The SDK logs only when `config.debug` is `true`.

Log levels used:

- `info`
- `debug`
- `warn`
- `error`

Example output format:

```
[MailTracker:info] 2026-06-01T12:34:56.789Z - MailTracker initialized { ... }
```

---

## 9. Example Usage

```js
MailTracker.init({
  apiBaseUrl: 'https://app.example.com',
  debug: true,
  autoRetry: true,
});

const emailLink = MailTracker.buildEmailLink(
  'token123',
  'https://example.com/landing',
  'user@example.com',
  { campaign: 'spring_sale' }
);

MailTracker.sendConversionEvent({
  trackingToken: 'abcd1234',
  eventType: 'purchase',
  value: 49.99,
  currency: 'USD',
});
```

---

## 10. Important Notes

- `redirect()` uses a hidden form POST, not AJAX.
- Failed conversion events can be queued and retried automatically.
- `trackForms()` and `trackButtons()` only report events when the tracking cookie contains a valid `tracking_token`.
- `processEventQueue()` is invoked on an interval and also when the page unloads.
