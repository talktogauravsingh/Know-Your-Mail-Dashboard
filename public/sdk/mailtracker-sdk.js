(function (global) {
  const defaultConfig = {
    apiBaseUrl: window.location.origin,
    cookieName: 'mailtracker_cta',
    storagePrefix: 'mailtracker_',
    timeoutMs: 30000,
    autoRetry: true,
    maxRetries: 3,
    retryDelayMs: 1000,
    debug: false,
    attributionWindowDays: 30,
  };

  let config = { ...defaultConfig };
  let eventQueue = [];
  let isRetrying = false;

  // ===== Logging =====
  function log(level, message, data = {}) {
    if (config.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[MailTracker:${level}] ${timestamp} - ${message}`, data);
    }
  }

  // ===== Storage Helpers =====
  function getStorage(key) {
    try {
      const stored = localStorage.getItem(config.storagePrefix + key);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      log('warn', `Storage read failed for ${key}`, e);
      return null;
    }
  }

  function setStorage(key, value) {
    try {
      localStorage.setItem(config.storagePrefix + key, JSON.stringify(value));
      log('debug', `Storage set for ${key}`);
    } catch (e) {
      log('warn', `Storage write failed for ${key}`, e);
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(config.storagePrefix + key);
    } catch (e) {
      log('warn', `Storage remove failed for ${key}`, e);
    }
  }

  /**
   * Phase 4: Multi-storage strategy with automatic fallback.
   * Tries: localStorage > sessionStorage > memory
   */
  let inMemoryStorage = {};

  function getWithFallback(key) {
    const fullKey = config.storagePrefix + key;

    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      log('debug', `localStorage unavailable, trying sessionStorage`);
    }

    try {
      if (typeof sessionStorage !== 'undefined') {
        const stored = sessionStorage.getItem(fullKey);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      log('debug', `sessionStorage unavailable, using in-memory storage`);
    }

    return inMemoryStorage[fullKey] || null;
  }

  function setWithFallback(key, value) {
    const fullKey = config.storagePrefix + key;
    const stringified = JSON.stringify(value);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(fullKey, stringified);
        log('debug', `Storage set (localStorage) for ${key}`);
        return;
      }
    } catch (e) {
      log('debug', `localStorage write failed, trying sessionStorage`);
    }

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(fullKey, stringified);
        log('debug', `Storage set (sessionStorage) for ${key}`);
        return;
      }
    } catch (e) {
      log('debug', `sessionStorage write failed, using in-memory storage`);
    }

    inMemoryStorage[fullKey] = value;
    log('debug', `Storage set (in-memory) for ${key}`);
  }

  function removeWithFallback(key) {
    const fullKey = config.storagePrefix + key;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(fullKey);
      }
    } catch (e) {}

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(fullKey);
      }
    } catch (e) {}

    delete inMemoryStorage[fullKey];
  }

  function getCookie(name) {
    try {
      const cookieString = document.cookie || '';
      const cookies = cookieString.split(';').map((c) => c.trim());
      for (let i = 0; i < cookies.length; i += 1) {
        const [cookieName, ...cookieValue] = cookies[i].split('=');
        if (cookieName === name) {
          const decoded = decodeURIComponent(cookieValue.join('='));
          try {
            return JSON.parse(decoded);
          } catch {
            return decoded;
          }
        }
      }
    } catch (e) {
      log('warn', `Cookie read failed for ${name}`, e);
    }
    return null;
  }

  function deleteCookie(name) {
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
  }

  // ===== URL and Validation =====
  function normalizeUrl(url) {
    return url.replace(/\/+$/, '');
  }

  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  function generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ===== Form Building =====
  function createHiddenInput(name, value) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value == null ? '' : value;
    return input;
  }

  function buildForm(action, fields) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = normalizeUrl(action);
    form.style.display = 'none';

    Object.keys(fields).forEach((key) => {
      const value = fields[key];
      if (value === null || value === undefined) {
        return;
      }

      if (typeof value === 'object') {
        form.appendChild(createHiddenInput(key, JSON.stringify(value)));
        return;
      }

      form.appendChild(createHiddenInput(key, String(value)));
    });

    document.body.appendChild(form);
    return form;
  }

  // ===== Event Queue Management =====
  function loadEventQueue() {
    eventQueue = getWithFallback('event_queue') || [];
    log('debug', `Event queue loaded`, { count: eventQueue.length });
  }

  function saveEventQueue() {
    setWithFallback('event_queue', eventQueue);
  }

  function queueEvent(event) {
    eventQueue.push({
      ...event,
      queued_at: new Date().toISOString(),
      retry_count: 0,
    });
    saveEventQueue();
    log('debug', `Event queued`, { total: eventQueue.length });
  }

  function removeQueuedEvent(index) {
    eventQueue.splice(index, 1);
    saveEventQueue();
  }

  function processEventQueue() {
    if (isRetrying || eventQueue.length === 0) return;

    isRetrying = true;
    log('debug', `Processing event queue`, { count: eventQueue.length });

    for (let i = eventQueue.length - 1; i >= 0; i--) {
      const event = eventQueue[i];

      if (event.type === 'conversion') {
        sendConversionEventInternal(event).then((success) => {
          if (success) {
            removeQueuedEvent(i);
            log('debug', `Queued conversion event sent`, { event_id: event.event_id });
          } else if (event.retry_count < config.maxRetries) {
            event.retry_count += 1;
            log('debug', `Retrying conversion event`, { retry: event.retry_count });
          }
        });
      }
    }

    isRetrying = false;
  }

  // ===== API Calls =====
  function fetchWithTimeout(url, options = {}) {
    const { timeout = config.timeoutMs } = options;
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }

  function sendConversionEventInternal(payload) {
    return fetchWithTimeout(`${config.apiBaseUrl}/api/cta/conversion`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.message || `HTTP ${response.status}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        log('info', 'Conversion event sent successfully', { conversion_id: data.conversion_id });
        return true;
      })
      .catch((error) => {
        log('error', 'Conversion event failed', { message: error.message });
        return false;
      });
  }

  // ===== Public API =====
  function init(userConfig = {}) {
    config = {
      ...config,
      ...userConfig,
    };

    if (typeof config.apiBaseUrl !== 'string' || !config.apiBaseUrl.length) {
      throw new Error('MailTracker.init requires apiBaseUrl');
    }

    config.apiBaseUrl = normalizeUrl(config.apiBaseUrl);

    loadEventQueue();

    log('info', 'MailTracker initialized', { debug: config.debug, apiBaseUrl: config.apiBaseUrl });

    // Periodically process event queue
    setInterval(processEventQueue, config.retryDelayMs);

    // Use sendBeacon for conversions on page unload
    window.addEventListener('beforeunload', () => {
      if (eventQueue.length > 0) {
        log('debug', 'Processing queue on page unload');
        processEventQueue();
      }
    });

    return MailTracker;
  }

  function redirect(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('MailTracker.redirect requires a payload object');
    }

    const required = ['campaignId', 'destinationUrl'];
    required.forEach((field) => {
      if (!payload[field]) {
        throw new Error(`MailTracker.redirect missing required field: ${field}`);
      }
    });

    if (!isValidUrl(payload.destinationUrl)) {
      throw new Error('MailTracker.redirect: destinationUrl is not a valid URL');
    }

    const action = `${config.apiBaseUrl}/api/cta/redirect`;
    const fields = {
      campaign_id: payload.campaignId,
      campaign_name: payload.campaignName,
      email: payload.email,
      destination_url: payload.destinationUrl,
      redirect_url: payload.redirectUrl || window.location.href,
      conversion_point: payload.conversionPoint,
      attribution_window_days: payload.attributionWindowDays || config.attributionWindowDays,
      metadata: payload.metadata || null,
    };

    log('info', 'Redirecting CTA', { campaign_id: payload.campaignId, destination: payload.destinationUrl });

    const form = buildForm(action, fields);
    form.submit();
  }

  /**
   * Generate a signed redirect token (for email links).
   * Must be called server-side via POST /api/cta/generate-token
   * Returns a GET-friendly URL for use in email links.
   */
  function generateTokenUrl(campaignId, options = {}) {
    if (!campaignId) {
      throw new Error('MailTracker.generateTokenUrl requires campaignId');
    }

    return `${config.apiBaseUrl}/api/cta/generate-token?campaign_id=${campaignId}&expires_in_days=${options.expiresInDays || 30}`;
  }

  /**
   * Build an email-friendly redirect link using a signed token.
   * Usage: MailTracker.buildEmailLink(token, destinationUrl, email, metadata)
   */
  function buildEmailLink(token, destinationUrl, email = null, metadata = null) {
    if (!token || !destinationUrl) {
      throw new Error('MailTracker.buildEmailLink requires token and destinationUrl');
    }

    if (!isValidUrl(destinationUrl)) {
      throw new Error('MailTracker.buildEmailLink: destinationUrl is not a valid URL');
    }

    const params = new URLSearchParams({
      destination_url: destinationUrl,
    });

    if (email) {
      params.append('email', email);
    }

    if (metadata) {
      params.append('metadata', JSON.stringify(metadata));
    }

    const url = `${config.apiBaseUrl}/r/${token}?${params.toString()}`;
    log('debug', 'Built email link', { url: url.substring(0, 50) });

    return url;
  }

  function sendConversionEvent(eventPayload) {
    return new Promise((resolve, reject) => {
      if (!eventPayload || typeof eventPayload !== 'object') {
        reject(new Error('MailTracker.sendConversionEvent requires an event payload'));
        return;
      }

      const required = ['value'];
      const hasRedirectUuid = !!eventPayload.redirectUuid;
      const hasTrackingToken = !!eventPayload.trackingToken;

      if (!hasRedirectUuid && !hasTrackingToken) {
        reject(new Error('MailTracker.sendConversionEvent requires either redirectUuid or trackingToken'));
        return;
      }

      required.forEach((field) => {
        if (eventPayload[field] === undefined && eventPayload[field] !== null) {
          throw new Error(`MailTracker.sendConversionEvent missing required field: ${field}`);
        }
      });

      if (typeof eventPayload.value !== 'number' || eventPayload.value < 0) {
        reject(new Error('MailTracker.sendConversionEvent: value must be a non-negative number'));
        return;
      }

      const eventId = eventPayload.eventId || generateEventId();

      const body = {
        redirect_uuid: eventPayload.redirectUuid,
        tracking_token: eventPayload.trackingToken,
        email: eventPayload.email,
        event_type: eventPayload.eventType || 'purchase',
        value: eventPayload.value,
        currency: eventPayload.currency || 'USD',
        metadata: eventPayload.metadata || null,
        event_id: eventId,
      };

      log('info', 'Sending conversion event', { event_id: eventId, value: eventPayload.value });

      sendConversionEventInternal(body)
        .then((success) => {
          if (success) {
            resolve({ success: true, event_id: eventId });
          } else {
            if (config.autoRetry) {
              queueEvent(body);
              resolve({ success: false, queued: true, event_id: eventId });
            } else {
              reject(new Error('Conversion event failed and autoRetry is disabled'));
            }
          }
        })
        .catch((error) => {
          if (config.autoRetry) {
            queueEvent(body);
            resolve({ success: false, queued: true, event_id: eventId, error: error.message });
          } else {
            reject(error);
          }
        });
    });
  }

  function getTrackingContext() {
    const context = getCookie(config.cookieName);
    log('debug', 'Retrieved tracking context', { has_context: !!context });
    return context;
  }

  function clearTracking() {
    deleteCookie(config.cookieName);
    removeWithFallback('event_queue');
    log('info', 'Tracking context cleared');
  }

  function debug() {
    const context = getTrackingContext();
    const queuedEvents = eventQueue.length;

    const debugInfo = {
      timestamp: new Date().toISOString(),
      config: {
        apiBaseUrl: config.apiBaseUrl,
        debug: config.debug,
        autoRetry: config.autoRetry,
        maxRetries: config.maxRetries,
        attributionWindowDays: config.attributionWindowDays,
      },
      tracking_context: context,
      pending_events: queuedEvents,
      event_queue: config.debug ? eventQueue : null,
      storage_available: typeof Storage !== 'undefined',
      cookies_enabled: typeof document.cookie !== 'undefined',
    };

    log('info', 'Debug info retrieved', debugInfo);

    return debugInfo;
  }

  /**
   * Phase 3: Form Tracking
   * Automatically track form submissions as conversion events.
   */
  function trackForms(options = {}) {
    if (typeof document === 'undefined') return;

    const formSelector = options.selector || 'form[data-mailtracker-track]';
    const autoEventType = options.autoEventType || 'form_submission';

    const forms = document.querySelectorAll(formSelector);
    log('info', `Tracking ${forms.length} form(s)`);

    forms.forEach((form) => {
      form.addEventListener('submit', (e) => {
        const formData = new FormData(form);
        const eventType = form.dataset.conversionType || autoEventType;
        const eventValue = parseFloat(form.dataset.conversionValue || '0');

        const context = getTrackingContext();
        if (context && context.tracking_token) {
          log('debug', 'Submitting form conversion event', { event_type: eventType, value: eventValue });

          sendConversionEvent({
            trackingToken: context.tracking_token,
            eventType: eventType,
            value: eventValue,
            metadata: {
              form_id: form.id,
              form_name: form.name,
              form_fields: Array.from(formData.keys()),
            },
          }).catch((error) => {
            log('warn', 'Form tracking conversion failed', { error: error.message });
          });
        }
      });
    });
  }

  /**
   * Automatically track button clicks as conversion events.
   */
  function trackButtons(options = {}) {
    if (typeof document === 'undefined') return;

    const buttonSelector = options.selector || 'button[data-mailtracker-track]';
    const buttons = document.querySelectorAll(buttonSelector);

    log('info', `Tracking ${buttons.length} button(s)`);

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const eventType = button.dataset.eventType || 'button_click';
        const eventValue = parseFloat(button.dataset.eventValue || '0');

        const context = getTrackingContext();
        if (context && context.tracking_token) {
          log('debug', 'Submitting button click conversion event', { event_type: eventType });

          sendConversionEvent({
            trackingToken: context.tracking_token,
            eventType: eventType,
            value: eventValue,
            metadata: {
              button_id: button.id,
              button_text: button.textContent,
            },
          }).catch((error) => {
            log('warn', 'Button tracking conversion failed', { error: error.message });
          });
        }
      });
    });
  }

  /**
   * Auto-track mode: enables form and button tracking automatically on init.
   */
  function enableAutoTracking(options = {}) {
    log('info', 'Auto-tracking enabled');
    trackForms(options);
    trackButtons(options);
  }

  const MailTracker = {
    init,
    redirect,
    generateTokenUrl,
    buildEmailLink,
    sendConversionEvent,
    getTrackingContext,
    clearTracking,
    debug,
    trackForms,
    trackButtons,
    enableAutoTracking,
    processEventQueue,
  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = MailTracker;
  } else {
    global.MailTracker = MailTracker;
  }
})(typeof window !== 'undefined' ? window : this);
