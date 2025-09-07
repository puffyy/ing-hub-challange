import {LitElement, html, nothing} from 'lit';
import {t} from '../../../src/i18n/i18n.js';

export class XConfirmDialog extends LitElement {
  static properties = {
    open: {type: Boolean, reflect: true},
    variant: {type: String}, // "danger" | "warning" | "default" (only usable as an attribute)

    // Direct texts (if present, these are shown instead of i18n)
    title: {type: String},
    message: {type: String},
    confirmText: {type: String},
    cancelText: {type: String},

    // i18n keys
    titleKey: {type: String},
    messageKey: {type: String},
    messageParams: {type: Object},
    confirmKey: {type: String},
    cancelKey: {type: String},

    // for i18n sync (state to trigger render)
    lang: {type: String, state: true},
  };

  constructor() {
    super();
    this.open = false;
    this.variant = '';

    this.title = '';
    this.message = '';
    this.confirmText = '';
    this.cancelText = '';

    this.titleKey = '';
    this.messageKey = '';
    this.messageParams = undefined;
    this.confirmKey = 'actions.proceed';
    this.cancelKey = 'actions.cancel';

    this.lang = (document.documentElement.lang || 'en').toLowerCase();

    this._onLangChanged = () => {
      const next = (document.documentElement.lang || 'en').toLowerCase();
      if (this.lang !== next) {
        this.lang = next;
        this.requestUpdate();
      }
    };

    this._lastFocus = null;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('i18n-changed', this._onLangChanged);
  }

  disconnectedCallback() {
    window.removeEventListener('i18n-changed', this._onLangChanged);
    super.disconnectedCallback();
  }

  updated(changed) {
    if (changed.has('open')) {
      if (this.open) {
        // Before opening, store the element that had focus
        this._lastFocus = /** @type {HTMLElement|null} */ (
          document.activeElement
        );
        // After render, focus the first focusable element
        this.updateComplete.then(() => {
          const list = this._focusables();
          (list[0] || this.shadowRoot?.querySelector('.modal'))?.focus?.();
        });
      } else {
        // When closing, restore focus
        if (this._lastFocus && typeof this._lastFocus.focus === 'function') {
          const el = this._lastFocus;
          if (el && typeof el.focus === 'function' && el.isConnected) {
            // Element is still in the DOM and has a focus function → safely focus it
            el.focus();
          }
        }
        this._lastFocus = null;
      }
    }
  }

  // ---- i18n helpers ----
  _interpolate(str, params) {
    if (!str || !params) return str || '';
    let s = String(str);
    for (const [k, v] of Object.entries(params)) {
      const val = String(v);
      s = s.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), val);
      s = s.replace(new RegExp(`\\{\\s*${k}\\s*\\}`, 'g'), val);
    }
    return s;
  }

  _txt(key, fallback = '', params) {
    let s = '';
    try {
      s = key ? t(key, params) : fallback;
    } catch {
      s = fallback || '';
    }
    if (s == null || s === '') s = fallback || '';
    return this._interpolate(s, params);
  }

  get _titleText() {
    return this.title && this.title.length
      ? this.title
      : this._txt(this.titleKey || 'confirm.title', 'Are you sure?');
  }

  get _messageText() {
    if (this.message && this.message.length) return this.message;
    if (this.messageKey)
      return this._txt(this.messageKey, '', this.messageParams);
    return '';
  }

  get _confirmLabel() {
    return this.confirmText && this.confirmText.length
      ? this.confirmText
      : this._txt(this.confirmKey || 'actions.proceed', 'Proceed');
  }

  get _cancelLabel() {
    return this.cancelText && this.cancelText.length
      ? this.cancelText
      : this._txt(this.cancelKey || 'actions.cancel', 'Cancel');
  }

  // ---- focus management / trap ----
  _focusables() {
    const root = this.shadowRoot;
    if (!root) return [];
    const nodes = Array.from(
      root.querySelectorAll(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
    );
    // collect those that are not disabled
    return /** @type {HTMLElement[]} */ (
      nodes.filter((n) => !n.hasAttribute('disabled'))
    );
  }

  _onKeyDown(e) {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      this._cancel();
      return;
    }

    if (e.key === 'Enter') {
      // If the Cancel (outline) button is focused, Enter should not confirm
      const current = this.shadowRoot?.activeElement || e.composedPath?.()[0];
      if (current && current.classList?.contains('outline')) {
        // do nothing
      } else {
        e.preventDefault();
        this._confirm();
      }
      return;
    }

    if (e.key === 'Tab') {
      const f = this._focusables();
      if (!f.length) return;

      // in headless environments use composedPath as a fallback instead of activeElement
      const current = this.shadowRoot?.activeElement || e.composedPath?.()[0];
      const i = f.indexOf(current);

      if (e.shiftKey) {
        // from the first element, Shift+Tab → wrap to the last element
        if (i <= 0) {
          e.preventDefault();
          f[f.length - 1].focus();
        }
      } else {
        // from the last element, Tab → wrap to the first element (Close button)
        if (i === f.length - 1) {
          e.preventDefault();
          f[0].focus();
        }
      }
    }
  }

  // ---- actions ----
  _cancel() {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('cancel', {bubbles: true, composed: true})
    );
  }

  _confirm() {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('confirm', {bubbles: true, composed: true})
    );
  }

  // External API (optional)
  show() {
    this.open = true;
  }
  hide() {
    this.open = false;
  }

  // ---- template ----
  render() {
    if (!this.open) return nothing;

    // For focus trapping tests expect the first focusable to be .close and the last one to be .btn.primary.
    return html`
      <div class="backdrop" part="backdrop" @click=${this._cancel}></div>

      <div
        class="modal"
        part="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        @keydown=${this._onKeyDown}
      >
        <button
          class="close"
          aria-label=${this._txt('actions.close', 'Close')}
          @click=${this._cancel}
        >
          X
        </button>

        ${this._titleText
          ? html`<h2 id="cd-title" class="title">${this._titleText}</h2>`
          : nothing}

        <div class="body">${this._messageText}</div>

        <div class="actions">
          <button class="btn outline" @click=${this._cancel}>
            ${this._cancelLabel}
          </button>
          <button class="btn primary" @click=${this._confirm}>
            ${this._confirmLabel}
          </button>
        </div>
      </div>
    `;
  }

  // Static API for convenience
  static confirm(opts = {}) {
    return new Promise((resolve) => {
      const el = new XConfirmDialog();
      Object.assign(el, opts);
      const cleanup = () => el.remove();
      el.addEventListener('confirm', () => {
        cleanup();
        resolve(true);
      });
      el.addEventListener('cancel', () => {
        cleanup();
        resolve(false);
      });
      document.body.appendChild(el);
      el.open = true;
    });
  }
}

// Safe definition (avoid errors on repeated imports in tests)
if (!customElements.get('x-confirm-dialog')) {
  customElements.define('x-confirm-dialog', XConfirmDialog);
}

// Export (optional convenience)
export const confirm = (opts) => XConfirmDialog.confirm(opts);
