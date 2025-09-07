import {LitElement, css, html} from 'lit';
import {t} from '../../i18n/i18n.js';

export class XConfirmDialog extends LitElement {
  // Define component properties
  static properties = {
    open: {type: Boolean, reflect: true}, // Whether the dialog is open
    variant: {type: String}, // Dialog variant ('danger', 'warning', 'default')

    // Optional direct text (overrides i18n if provided)
    title: {type: String}, // Dialog title
    message: {type: String}, // Dialog message
    confirmText: {type: String}, // Confirm button text
    cancelText: {type: String}, // Cancel button text

    // Preferred i18n keys (used when the above are not set)
    titleKey: {type: String}, // i18n key for title
    messageKey: {type: String}, // i18n key for message
    messageParams: {type: Object}, // Parameters for i18n message
    confirmKey: {type: String}, // i18n key for confirm button
    cancelKey: {type: String}, // i18n key for cancel button
  };

  constructor() {
    super();
    // Initialize default property values
    this.open = false;
    this.variant = 'danger';
    this.messageParams = null;

    // Bind event handlers
    this._onKeyDown = (e) => this._handleKey(e);
    this._onFocusIn = (e) => this._trapFocus(e);
    this._onI18n = () => this.requestUpdate(); // Re-render on language change
  }

  connectedCallback() {
    super.connectedCallback();
    // Add event listener for i18n changes
    window.addEventListener('i18n-changed', this._onI18n);
  }
  disconnectedCallback() {
    // Remove event listener for i18n changes
    window.removeEventListener('i18n-changed', this._onI18n);
    super.disconnectedCallback();
  }

  static styles = css`
    /* Define component styles */
    :host {
      --primary: #ff6200;
      --indigo: #525199;
      --surface: #fff;
      --text: #222;
      --muted: #666;
      --radius: 12px;
      --shadow: 0 10px 30px rgba(0, 0, 0, 0.18), 0 3px 8px rgba(0, 0, 0, 0.08);
      position: fixed;
      inset: 0;
      display: none;
      z-index: 1000;
    }
    :host([open]) {
      display: block;
    }

    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
    }
    .modal {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(520px, calc(100vw - 32px));
      background: var(--surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
      outline: none;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 16px 18px 8px;
    }
    header h2 {
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.2;
      color: var(--primary);
      font-weight: 800;
    }
    .close {
      border: 0;
      background: transparent;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      color: var(--primary);
      cursor: pointer;
    }
    .close:hover {
      background: #fff4ef;
    }
    .body {
      padding: 0 18px 16px;
      color: var(--muted);
      line-height: 1.45;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 18px 18px;
    }

    .btn {
      flex: 1 1 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.45rem 0.8rem;
      border-radius: 10px;
      border: 1.5px solid transparent;
      font-weight: 800;
      cursor: pointer;
    }
    .btn.primary {
      background: var(--primary);
      color: #fff;
      border-color: #ffb08a;
    }
    .btn.primary:hover {
      filter: brightness(0.97);
    }
    .btn.outline {
      background: #fff;
      color: var(--indigo);
      border-color: var(--indigo);
    }
    .btn.outline:hover {
      background: #f7f7ff;
    }

    :host([variant='warning']) header h2 {
      color: #e59f00;
    }
    :host([variant='default']) header h2 {
      color: var(--text);
    }
  `;

  // --------- i18n helpers (compute each render) ----------
  _txt(key, fallback, params) {
    // Fetch translated text or fallback to default
    if (!key) return fallback;
    const s = t(key, params);
    return s == null || s === '' ? fallback : s;
  }
  get _titleText() {
    // Compute title text
    return (
      this.title ?? this._txt(this.titleKey || 'confirm.title', 'Are you sure?')
    );
  }
  get _messageText() {
    // Compute message text
    if (this.message != null) return this.message;
    if (this.messageKey)
      return this._txt(this.messageKey, '', this.messageParams);
    return '';
  }
  get _confirmText() {
    // Compute confirm button text
    return (
      this.confirmText ??
      this._txt(this.confirmKey || 'actions.proceed', 'Proceed')
    );
  }
  get _cancelText() {
    // Compute cancel button text
    return (
      this.cancelText ?? this._txt(this.cancelKey || 'actions.cancel', 'Cancel')
    );
  }

  render() {
    // Render the dialog
    const titleId = 'confirm-title';
    const msgId = 'confirm-msg';
    return html`
      <div class="backdrop" @click=${this._cancel} aria-hidden="true"></div>

      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby=${titleId}
        aria-describedby=${msgId}
        @keydown=${this._onKeyDown}
        @focusin=${this._onFocusIn}
        tabindex="-1"
      >
        <header>
          <h2 id=${titleId}>${this._titleText}</h2>
          <button
            class="close"
            @click=${this._cancel}
            aria-label=${this._txt('actions.close', 'Close')}
          >
            X
          </button>
        </header>

        <div id=${msgId} class="body">${this._messageText}</div>

        <div class="actions">
          <button class="btn primary" @click=${this._confirm}>
            ${this._confirmText}
          </button>
          <button class="btn outline" @click=${this._cancel}>
            ${this._cancelText}
          </button>
        </div>
      </div>
    `;
  }

  updated(changed) {
    // Handle updates to the 'open' property
    if (changed.has('open')) {
      if (this.open) {
        // Dialog opened: manage focus and add event listeners
        this._lastFocus = document.activeElement;
        this.updateComplete.then(() => {
          const first = this.renderRoot.querySelector('.btn.primary');
          (first || this.renderRoot.querySelector('.modal'))?.focus();
          document.addEventListener('keydown', this._onKeyDown, true);
          document.addEventListener('focusin', this._onFocusIn, true);
        });
      } else {
        // Dialog closed: remove event listeners and restore focus
        document.removeEventListener('keydown', this._onKeyDown, true);
        document.removeEventListener('focusin', this._onFocusIn, true);
        this._lastFocus && this._lastFocus.focus?.();
      }
    }
  }

  _handleKey(e) {
    // Handle keyboard interactions
    if (!this.open) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      this._cancel();
    } else if (e.key === 'Enter') {
      const target = e.composedPath()[0];
      if (target?.classList?.contains('outline')) return;
      e.preventDefault();
      this._confirm();
    } else if (e.key === 'Tab') {
      const f = this._focusables();
      if (!f.length) return;
      const i = f.indexOf(this.shadowRoot.activeElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && i === f.length - 1) {
        e.preventDefault();
        f[0].focus();
      }
    }
  }
  _trapFocus(e) {
    // Trap focus within the dialog
    if (!this.open) return;
    const modal = this.renderRoot.querySelector('.modal');
    if (!modal.contains(e.target)) {
      e.stopPropagation();
      (this._focusables()[0] || modal).focus();
    }
  }
  _focusables() {
    // Get focusable elements within the dialog
    return Array.from(
      this.renderRoot.querySelectorAll(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
  }

  _confirm() {
    // Dispatch 'confirm' event
    this.dispatchEvent(
      new CustomEvent('confirm', {bubbles: true, composed: true})
    );
  }
  _cancel() {
    // Dispatch 'cancel' event
    this.dispatchEvent(
      new CustomEvent('cancel', {bubbles: true, composed: true})
    );
  }

  // --------- Static convenience API (Promise<boolean>) ----------
  static confirm(opts = {}) {
    // Static method to show the dialog and return a promise
    return new Promise((resolve) => {
      const el = document.createElement('x-confirm-dialog');
      Object.assign(el, opts);
      if (opts.variant) el.setAttribute('variant', opts.variant);
      const cleanup = () => {
        el.open = false;
        el.remove();
      };
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
customElements.define('x-confirm-dialog', XConfirmDialog);

// Helper function
export const confirm = (opts) => XConfirmDialog.confirm(opts);
