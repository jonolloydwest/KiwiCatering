(() => {
  if (window.__verifyFormScriptLoaded) return;
  window.__verifyFormScriptLoaded = true;

  const PROXY_BASE = window.__verifyProxyBase || '/apps/verification-gateway';
  const VERIFY_PAGE_PATH = '/apps/verify/page';
  const VERIFY_START_PATH = '/apps/verify/start';
  const LEGACY_START_PATH = `${PROXY_BASE}/api/identity/start`;
  const SESSION_ENDPOINT = `${PROXY_BASE}/api/identity/session`;
  const STATUS_ENDPOINT = `${PROXY_BASE}/api/identity/status`;
  const RESTRICTED_COLLECTION_PATH =
    window.__restrictedCollectionPath || '/collections/cream-chargers';
  const DECLARATION_SELECTOR = 'input[name^="decl_"][type="checkbox"]';
  const PO_BOX_REGEX = /\bP(?:ost)?\.?\s*O(?:ffice)?\.?\s*Box\b/i;
  const OPTIONAL_FIELDS = new Set(['address_line2']);
  const ERROR_CLASS = 'is-invalid';
  const FLASH_CLASS = 'field-flash';
  const STATUS_POLL_INTERVAL_MS = 3000;
  const STATUS_POLL_TIMEOUT_MS = 60000;
  const LETTERS_SPACES_REGEX = /^[A-Za-z ]+$/;

  let verificationPollTimer = null;
  let verificationPollActive = false;
  let verifyStatePromise = null;
  let cachedVerifyState = null;

  window.__verify = window.__verify || (function () {
    function getCustomerContext() {
      const context = window.__verifyCustomer || {};
      const id = context.id ?? null;
      const gid = context.gid ?? (id ? `gid://shopify/Customer/${id}` : null);
      return { ...context, id, gid };
    }

    async function getState() {
      try {
        const r = await fetch(VERIFY_PAGE_PATH, { credentials: 'same-origin' });
        if (!r.ok) throw new Error('verify/page');
        return await r.json();
      } catch (e) {
        console.warn('[verify] state', e);
        return null;
      }
    }

    async function startLegacy(params = {}, startError) {
      try {
        const context = getCustomerContext();
        const fallbackBody = {
          customerId: params.customer_id || context.id,
          email: params.email || context.email,
          name: params.name || context.name,
          mode: params.mode || 'individual',
          nzbn: params.nzbn,
          business_name: params.business_name,
          return_to: params.return_to || location.href,
        };
        const response = await fetch(LEGACY_START_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(fallbackBody),
        });
        if (!response.ok) throw new Error(`Legacy verify/start failed (${response.status})`);
        const data = await response.json();
        const redirectUrl = data.redirect_url || data.redirectUrl || data.url;
        if (!redirectUrl) throw new Error('Legacy verify/start missing redirect URL');
        window.location = redirectUrl;
      } catch (legacyError) {
        console.warn('[verify] start', legacyError || startError);
      }
    }

    async function start(params = {}) {
      const context = getCustomerContext();
      const customerGid = params.customer_gid || context.gid;
      if (!customerGid) {
        console.warn('[verify] start', new Error('Missing customer context'));
        return;
      }

      const body = new URLSearchParams();
      body.set('customer_gid', customerGid);
      body.set('mode', (params.mode || 'individual').toLowerCase());
      const returnTo = params.return_to || params.returnTo || location.href;
      body.set('return_to', returnTo);
      if (params.nzbn) body.set('nzbn', params.nzbn);
      if (params.business_name) body.set('business_name', params.business_name);

      try {
        const r = await fetch(VERIFY_START_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        if (!r.ok) throw new Error('verify/start');
        const { redirect_url } = await r.json();
        if (redirect_url) window.location = redirect_url;
      } catch (e) {
        await startLegacy(params, e);
      }
    }

    function wire(root = document) {
      root.querySelectorAll('[data-verify-start]').forEach((btn) => {
        if (btn.__wired || btn.closest('[data-verify-form]')) return;
        btn.__wired = true;
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          const rootEl = btn.closest('[data-verify-root]') || document;
          const mode =
            btn.getAttribute('data-mode') ||
            rootEl.querySelector('[name="verify-mode"]:checked')?.value ||
            'individual';
          const nzbn = rootEl.querySelector('[name="nzbn"]')?.value?.trim();
          const business_name = rootEl.querySelector('[name="trading_name"]')?.value?.trim();
          const return_to = btn.getAttribute('data-return') || location.href;
          start({
            mode,
            return_to,
            ...(nzbn ? { nzbn } : {}),
            ...(business_name ? { business_name } : {}),
          });
        });
      });
    }

    document.addEventListener('DOMContentLoaded', () => wire());
    return { getState, start, wire };
  })();

  function fetchVerifyState() {
    if (!verifyStatePromise) {
      const getter =
        window.__verify && typeof window.__verify.getState === 'function'
          ? window.__verify.getState()
          : null;
      verifyStatePromise = Promise.resolve(getter)
        .then((state) => {
          cachedVerifyState = state || null;
          return cachedVerifyState;
        })
        .catch(() => {
          cachedVerifyState = null;
          verifyStatePromise = null;
          return null;
        });
    }
    return verifyStatePromise;
  }

  function getCachedVerifyState() {
    return cachedVerifyState;
  }

  function getSelectedCustomerType(root) {
    return (
      root.querySelector('input[name="verify-mode"]:checked')?.value?.toLowerCase() ||
      'individual'
    );
  }

  function shouldPauseIndividualFlow(state, root) {
    if (!state || typeof state !== 'object') return false;
    if (!state.isVerified18) return false;
    if (state.isVerifiedBusiness || state.isBusinessManualReview) return false;
    return getSelectedCustomerType(root) === 'individual';
  }

  function updateVerifiedReminder(root, state) {
    const reminder = root.querySelector('[data-verified-reminder]');
    if (!reminder) return;
    const shouldShow = shouldPauseIndividualFlow(state, root);
    reminder.hidden = !shouldShow;
    if (shouldShow) {
      reminder.setAttribute('aria-hidden', 'false');
    } else {
      reminder.setAttribute('aria-hidden', 'true');
      reminder.removeAttribute('tabindex');
    }
  }

  function emphasizeVerifiedReminder(root) {
    const reminder = root.querySelector('[data-verified-reminder]');
    if (!reminder) return;
    reminder.hidden = false;
    reminder.setAttribute('aria-hidden', 'false');
    reminder.setAttribute('tabindex', '-1');
    reminder.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof reminder.focus === 'function') {
      reminder.focus({ preventScroll: true });
    }
    flashField(reminder);
  }

  function handleAlreadyVerifiedIndividual(root) {
    const fallbackState = {
      isVerified18: true,
      isVerifiedBusiness: false,
      isBusinessManualReview: false,
    };
    const state = getCachedVerifyState() || fallbackState;
    updateVerifiedReminder(root, state);
    emphasizeVerifiedReminder(root);
    fetchVerifyState()
      .then((fresh) => updateVerifiedReminder(root, fresh || fallbackState))
      .catch(() => {});
  }

  function sanitizeFieldValue(element) {
    if (!element || typeof element !== 'object') return;
    const name = element.name;
    if (typeof name !== 'string' || !name) return;
    if (!('value' in element) || typeof element.value !== 'string') return;
    if (element.tagName && element.tagName.toLowerCase() !== 'input') return;
    if (name === 'mobile' || name === 'postcode') {
      const digits = element.value.replace(/\D+/g, '');
      const normalized = name === 'postcode' ? digits.slice(0, 4) : digits;
      if (element.value !== normalized) {
        element.value = normalized;
      }
    } else if (name === 'suburb' || name === 'city') {
      const letters = element.value.replace(/[^A-Za-z ]+/g, '');
      if (element.value !== letters) {
        element.value = letters;
      }
    }
  }

  function sanitizeFormFields(form) {
    if (!form || !form.elements) return;
    Array.from(form.elements).forEach((field) => sanitizeFieldValue(field));
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function showProcessingMessage(message) {
    const container = document.getElementById('verify-errors');
    if (!container) return;
    const text =
      message ??
      'Thanks \u2014 your verification is being finalised. This usually takes less than a minute.';
    container.innerHTML = `<p>${text}</p>`;
    container.hidden = false;
  }

  const isProcessing = getQueryParam('status') === 'processing';
  if (isProcessing) {
    showProcessingMessage();
    startVerificationPolling();
  }

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function initVerifyForms(context = document) {
    const roots = context.matches?.('[data-verify-root]')
      ? [context]
      : Array.from(context.querySelectorAll?.('[data-verify-root]') || []);
    roots.forEach((root) => wireVerifyForm(root));
  }

  function wireVerifyForm(root) {
    if (!root || root.__verifyFormWired) return;
    root.__verifyFormWired = true;
    const form = root.querySelector('[data-verify-form]');
    const startBtn = root.querySelector('#start-id-check');
    const business = root.querySelector('#biz-fields');
    const bizRequired = business ? business.querySelectorAll('[data-biz-required]') : [];
    const spinner = root.querySelector('[data-spinner]');
    const radios = root.querySelectorAll('input[name="verify-mode"]');
    const reminder = root.querySelector('[data-verified-reminder]');

    ensureReturnTarget(root);
    applyPrefill(form, window.__prefill);
    sanitizeFormFields(form);

    radios.forEach((radio) =>
      radio.addEventListener('change', () => {
        toggleBusinessFields(root, business, bizRequired);
        recomputeFormState(root);
        updateVerifiedReminder(root, getCachedVerifyState());
      }),
    );
    toggleBusinessFields(root, business, bizRequired);
    if (reminder) {
      updateVerifiedReminder(root, getCachedVerifyState());
      fetchVerifyState().then((state) => updateVerifiedReminder(root, state));
    } else {
      fetchVerifyState().catch(() => {});
    }

    const handleInput = (event) => {
      sanitizeFieldValue(event.target);
      clearFieldError(event.target);
      recomputeFormState(root);
    };
    form?.addEventListener('input', (event) => {
      handleInput(event);
      showError(root, '');
    });
    form?.addEventListener('change', (event) => {
      handleInput(event);
      showError(root, '');
    });

    startBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      submitVerification(root);
    });

    recomputeFormState(root);
    window.__verify?.wire(root);
  }

  function ensureReturnTarget(root) {
    const btn = root.querySelector('[data-verify-start]');
    if (!btn) return;
    const fallback = document.referrer || window.location.href;
    btn.setAttribute('data-return', btn.getAttribute('data-return') || fallback);
  }

  function applyPrefill(form, prefill) {
    if (!form || !prefill || form.__prefillApplied) return;
    const address = prefill.address || {};
    const assignments = [
      ['full_name', prefill.full_name],
      ['email', prefill.email],
      ['address_line1', address.line1],
      ['address_line2', address.line2],
      ['suburb', address.suburb],
      ['city', address.city],
      ['postcode', address.postcode],
    ];
    assignments.forEach(([name, value]) => {
      if (!value) return;
      const field = form.elements[name];
      if (field && !field.value) {
        field.value = value;
      }
    });
    if (prefill.email && form.elements.email) {
      form.elements.email.readOnly = true;
    }
    form.__prefillApplied = true;
    form.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function toggleBusinessFields(root, business, bizRequired) {
    if (!business) return;
    const mode =
      root.querySelector('input[name="verify-mode"]:checked')?.value?.toLowerCase() ||
      'individual';
    const isBusiness = mode === 'business';
    business.hidden = !isBusiness;
    const form = root.querySelector('[data-verify-form]');
    form?.classList.toggle('verification-form--business', isBusiness);
    bizRequired.forEach((field) => {
      if (!field) return;
      if (isBusiness) {
        field.setAttribute('required', 'required');
        field.setAttribute('aria-required', 'true');
      } else {
        field.removeAttribute('required');
        field.removeAttribute('aria-required');
        field.value = '';
        clearFieldError(field);
      }
    });
  }

  function recomputeFormState(root) {
    const form = root.querySelector('[data-verify-form]');
    const startBtn = root.querySelector('#start-id-check');
    if (!form || !startBtn) return;
    isFormValid(form, true);
    if (startBtn.dataset.loading === 'true') return;
    startBtn.disabled = false;
    startBtn.setAttribute('aria-disabled', 'false');
  }

  function validateDobField(input, silent = false) {
    if (!input) return true;
    const value = input.value;
    if (!value) return true;
    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) return true;
    const now = new Date();
    const eighteen = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
    if (dob > eighteen) {
      if (!silent) setFieldError(input, 'You must be at least 18 years old to verify.');
      return false;
    }
    return true;
  }

  function validateAddressField(input, silent = false) {
    if (!input) return true;
    const value = input.value?.trim();
    if (value && PO_BOX_REGEX.test(value)) {
      if (!silent) setFieldError(input, 'PO Boxes cannot be used for verification.');
      return false;
    }
    return true;
  }

  function validateMobileField(input, silent = false) {
    if (!input) return true;
    const value = input.value?.trim();
    if (!value) return true;
    const valid = /^\d{7,}$/.test(value);
    if (!valid && !silent) {
      setFieldError(input, 'Enter a valid mobile number (digits only, at least 7 digits).');
    }
    return valid;
  }

  function validateLettersField(input, silent = false) {
    if (!input) return true;
    const value = input.value?.trim();
    if (!value) return true;
    const valid = LETTERS_SPACES_REGEX.test(value);
    if (!valid && !silent) {
      setFieldError(input, 'Use letters and spaces only.');
    }
    return valid;
  }

  function validatePostcodeField(input, silent = false) {
    if (!input) return true;
    const value = input.value?.trim();
    if (!value) return true;
    const valid = /^\d{4}$/.test(value);
    if (!valid && !silent) {
      setFieldError(input, 'Enter a 4-digit postcode.');
    }
    return valid;
  }

  function validateField(field, silent = false) {
    if (
      !field ||
      field.disabled ||
      field.type === 'hidden' ||
      OPTIONAL_FIELDS.has(field.name)
    ) {
      return true;
    }
    const isCheckbox = field.matches(DECLARATION_SELECTOR);
    if (!field.required && !isCheckbox) return true;
    const value = typeof field.value === 'string' ? field.value.trim() : field.value;
    let message = '';
    const valid = isCheckbox ? field.checked : !!value;
    if (!valid) message = isCheckbox ? 'Please accept this declaration.' : 'This field is required.';
    if (!silent) setFieldError(field, message);
    if (!valid) return false;
    if (field.name === 'dob') return validateDobField(field, silent);
    if (field.name === 'address_line1') return validateAddressField(field, silent);
    if (field.name === 'mobile') return validateMobileField(field, silent);
    if (field.name === 'suburb' || field.name === 'city') return validateLettersField(field, silent);
    if (field.name === 'postcode') return validatePostcodeField(field, silent);
    return valid;
  }

  function clearFieldError(field) {
    if (!field) return;
    const group = field.closest('.field') || field.parentElement;
    const flashTarget = group || field;
    const helper = group?.querySelector('[data-field-error]');
    if (helper) {
      helper.textContent = '';
      helper.hidden = true;
    }
    field.classList.remove(ERROR_CLASS);
    field.removeAttribute('aria-invalid');
    flashTarget?.classList.remove(FLASH_CLASS);
  }

  function setFieldError(field, message) {
    if (!field) return;
    const group = field.closest('.field') || field.parentElement;
    let helper = group?.querySelector('[data-field-error]');
    if (!helper && group) {
      helper = document.createElement('p');
      helper.className = 'field__error';
      helper.dataset.fieldError = 'true';
      helper.hidden = true;
      group.appendChild(helper);
    }
    const hasError = !!message;
    if (helper) {
      helper.textContent = message || '';
      helper.hidden = !hasError;
    }
    field.classList.toggle(ERROR_CLASS, hasError);
    if (hasError) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  function isFormValid(form, silent = false) {
    return Array.from(form.querySelectorAll('input, select, textarea')).every((field) =>
      validateField(field, silent),
    );
  }

  function findFirstInvalid(form) {
    return (
      form.querySelector(`.${ERROR_CLASS}`) ||
      form.querySelector(`${DECLARATION_SELECTOR}:not(:checked)`)
    );
  }

  function validateForm(root) {
    const form = root.querySelector('[data-verify-form]');
    if (!form) return { ok: false };
    const ok = isFormValid(form);
    const focus = ok ? null : findFirstInvalid(form);
    if (focus) {
      focus.scrollIntoView({ behavior: 'smooth', block: 'center' });
      focus.focus({ preventScroll: true });
    }
    return { ok, focus };
  }

  function buildPayload(root) {
    const form = root.querySelector('[data-verify-form]');
    if (!form) return null;
    const customerReference = getCustomerReference();
    if (!customerReference) return null;
    const getValue = (name) => form.elements[name]?.value?.trim() || '';
    const businessSelected =
      (root.querySelector('input[name="verify-mode"]:checked')?.value || 'individual').toLowerCase() ===
      'business';
    const payload = {
      customer_reference: customerReference,
      mode: 'hosted',
      form: {
        full_name: getValue('full_name'),
        dob: getValue('dob'),
        email: getValue('email'),
        mobile: getValue('mobile'),
        address: {
          line1: getValue('address_line1'),
          line2: getValue('address_line2') || null,
          suburb: getValue('suburb'),
          city: getValue('city'),
          postcode: getValue('postcode'),
        },
        culinary_use: getValue('culinary_use'),
        customer_type: businessSelected ? 'business' : 'individual',
        nzbn: businessSelected ? getValue('nzbn') || null : null,
        trading_name: businessSelected ? getValue('trading_name') || null : null,
      },
    };
    return payload;
  }

  function getCustomerReference() {
    const prefillCustomer = window.__prefill?.shopify_customer_gid;
    if (prefillCustomer) return prefillCustomer;
    const verifyCustomer = window.__verifyCustomer || {};
    if (verifyCustomer.gid) return verifyCustomer.gid;
    if (verifyCustomer.id) return `gid://shopify/Customer/${verifyCustomer.id}`;
    return null;
  }

  function showError(root, message = '') {
    const target = root.querySelector('#verify-errors');
    if (!target) return;
    target.textContent = message;
    if (message) {
      target.hidden = false;
    } else {
      target.hidden = true;
    }
  }

  function setLoadingState(root, loading) {
    const spinner = root.querySelector('[data-spinner]');
    const btn = root.querySelector('#start-id-check');
    if (spinner) spinner.hidden = !loading;
    if (btn) {
      btn.dataset.loading = loading ? 'true' : 'false';
      btn.disabled = loading;
      btn.setAttribute('aria-disabled', loading ? 'true' : 'false');
    }
  }

  async function submitVerification(root) {
    const validation = validateForm(root);
    if (!validation.ok) {
      showError(root, 'Complete ALL required fields To continue');
      flashField(validation.focus);
      recomputeFormState(root);
      return;
    }
    showError(root, '');
    const verifyState = await fetchVerifyState();
    if (shouldPauseIndividualFlow(verifyState, root)) {
      updateVerifiedReminder(root, verifyState);
      emphasizeVerifiedReminder(root);
      recomputeFormState(root);
      return;
    }
    setLoadingState(root, true);
    try {
      const payload = buildPayload(root);
      if (!payload) throw new Error('Missing verification details.');
      const response = await fetch(SESSION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.status === 'already_verified_individual') {
        handleAlreadyVerifiedIndividual(root);
        return;
      }
      if (!response.ok) {
        const message = data?.error || data?.message || 'Unable to start identity check.';
        throw new Error(message);
      }
      if (data?.redirect_url) {
        window.location.assign(data.redirect_url);
        return;
      }
      throw new Error('Missing redirect URL from identity session.');
    } catch (error) {
      console.warn('[verify] submit', error);
      showError(
        root,
        error?.message ||
          'We could not start your verification right now. Please try again or contact support.',
      );
    } finally {
      setLoadingState(root, false);
      recomputeFormState(root);
    }
  }

  function flashField(field) {
    if (!field) return;
    const target = field.closest('.field, .verification-checkbox') || field;
    target.classList.remove(FLASH_CLASS);
    void target.offsetWidth;
    target.classList.add(FLASH_CLASS);
    target.addEventListener(
      'animationend',
      () => {
        target.classList.remove(FLASH_CLASS);
      },
      { once: true },
    );
  }

  async function fetchVerificationStatus() {
    const gid = window.__prefill?.shopify_customer_gid || getCustomerReference() || null;
    if (!gid) return 'pending';
    const url = `${STATUS_ENDPOINT}?customer_id=${encodeURIComponent(gid)}`;
    try {
      const response = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!response.ok) return 'pending';
      const payload = await response.json().catch(() => ({}));
      const normalized = typeof payload?.status === 'string' ? payload.status.toLowerCase() : null;
      if (normalized === 'verified' || normalized === 'failed') {
        return normalized;
      }
      return 'pending';
    } catch {
      return 'pending';
    }
  }

  function clearProcessingQueryParam() {
    if (!window.history?.replaceState || typeof URL === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('status')) return;
    url.searchParams.delete('status');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  function startVerificationPolling() {
    if (verificationPollActive) return;
    verificationPollActive = true;
    const startedAt = Date.now();
    if (verificationPollTimer) {
      clearInterval(verificationPollTimer);
      verificationPollTimer = null;
    }

    verificationPollTimer = window.setInterval(async () => {
      const status = await fetchVerificationStatus();
      if (status === 'verified') {
        stopVerificationPolling();
        renderVerifySuccess();
        return;
      }
      if (status === 'failed') {
        stopVerificationPolling();
        renderVerifyFailed();
        return;
      }
      if (Date.now() - startedAt > STATUS_POLL_TIMEOUT_MS) {
        stopVerificationPolling();
        renderVerifyPendingTimeout();
        return;
      }
    }, STATUS_POLL_INTERVAL_MS);
  }

  function stopVerificationPolling() {
    if (verificationPollTimer) {
      clearInterval(verificationPollTimer);
      verificationPollTimer = null;
    }
    verificationPollActive = false;
  }

  function renderVerifySuccess() {
    const el = document.getElementById('verify-errors');
    if (!el) return;
    el.innerHTML = `
      <div class="alert alert--success" role="status">
        <p>&#127881; You're verified! You can now purchase restricted products.</p>
        <p><a class="button button--primary" href="${RESTRICTED_COLLECTION_PATH}">Continue shopping</a></p>
      </div>
    `;
    el.hidden = false;
    clearProcessingQueryParam();
  }

  function renderVerifyFailed() {
    const el = document.getElementById('verify-errors');
    if (!el) return;
    el.innerHTML = `
      <div class="alert alert--error" role="alert">
        <p>We couldn't verify your ID. Please try again or contact support.</p>
        <p><button id="retry-id-check" class="button button--secondary" type="button">Retry</button></p>
      </div>
    `;
    el.hidden = false;
    clearProcessingQueryParam();
    const retry = document.getElementById('retry-id-check');
    if (retry) {
      retry.addEventListener('click', () => {
        document.getElementById('start-id-check')?.click();
      });
    }
  }

  function renderVerifyPendingTimeout() {
    const el = document.getElementById('verify-errors');
    if (!el) return;
    el.innerHTML = `
      <div class="alert alert--info" role="status">
        <p>Your verification is still processing. This can take a little longer sometimes.</p>
        <p><button id="check-status-again" class="button button--secondary" type="button">Check again</button></p>
      </div>
    `;
    el.hidden = false;
    const retry = document.getElementById('check-status-again');
    retry?.addEventListener('click', startVerificationPolling);
  }

  ready(() => {
    initVerifyForms();
    document.addEventListener('shopify:section:load', (event) => initVerifyForms(event.target));
  });
})();
