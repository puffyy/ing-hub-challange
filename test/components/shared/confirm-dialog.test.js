// src/components/shared/confirm-dialog.js
import {LitElement, html, nothing} from 'lit';
import {t} from '../../i18n/i18n.js';

export class XConfirmDialog extends LitElement {
  static properties = {
    open: {type: Boolean, reflect: true},
    variant: {type: String}, // "danger" | "warning" | "default" (sadece attribute olarak kullanılabilir)

    // Doğrudan metinler (varsa i18n yerine bunlar gösterilir)
    title: {type: String},
    message: {type: String},
    confirmText: {type: String},
    cancelText: {type: String},

    // i18n anahtarları
    titleKey: {type: String},
    messageKey: {type: String},
    messageParams: {type: Object},
    confirmKey: {type: String},
    cancelKey: {type: String},

    // i18n senkronu için (render tetiklemek adına state)
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
        // Açılmadan önce odakta olan elemanı sakla
        this._lastFocus = /** @type {HTMLElement|null} */ (
          document.activeElement
        );
        // Render sonrası ilk odaklanabilir elemana fokus ver
        this.updateComplete.then(() => {
          const list = this._focusables();
          (list[0] || this.shadowRoot?.querySelector('.modal'))?.focus?.();
        });
      } else {
        // Kapanınca odağı geri ver
        if (this._lastFocus && typeof this._lastFocus.focus === 'function') {
          const el = this._lastFocus;
          if (el && typeof el.focus === 'function' && el.isConnected) {
            // Element hâlâ DOM’da ve focus fonksiyonu var → güvenle odakla
            el.focus();
          }
        }
        this._lastFocus = null;
      }
    }
  }

  // ---- i18n yardımcıları ----
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

  // ---- fokus yönetimi / tuzak ----
  _focusables() {
    const root = this.shadowRoot;
    if (!root) return [];
    const nodes = Array.from(
      root.querySelectorAll(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
    );
    // disabled olmayanları topla
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
      // Cancel (outline) butonu odaktaysa Enter confirm yapmasın
      const current = this.shadowRoot?.activeElement || e.composedPath?.()[0];
      if (current && current.classList?.contains('outline')) {
        // hiçbir şey yapma
      } else {
        e.preventDefault();
        this._confirm();
      }
      return;
    }

    if (e.key === 'Tab') {
      const f = this._focusables();
      if (!f.length) return;

      // headless ortamlarda activeElement yerine composedPath fallback'i kullan
      const current = this.shadowRoot?.activeElement || e.composedPath?.()[0];
      const i = f.indexOf(current);

      if (e.shiftKey) {
        // ilk elemandan Shift+Tab → son elemana sar
        if (i <= 0) {
          e.preventDefault();
          f[f.length - 1].focus();
        }
      } else {
        // son elemandan Tab → ilk elemana sar (Close butonu)
        if (i === f.length - 1) {
          e.preventDefault();
          f[0].focus();
        }
      }
    }
  }

  // ---- aksiyonlar ----
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

  // Dış API (opsiyonel)
  show() {
    this.open = true;
  }
  hide() {
    this.open = false;
  }

  // ---- şablon ----
  render() {
    if (!this.open) return nothing;

    // Testler odak sarmalaması için ilk odaklanabilirin .close, sonuncunun .btn.primary olmasını bekliyor.
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

  // Kolaylık amaçlı statik API
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

// Güvenli tanımlama (test tekrarlı importlarda hata vermesin)
if (!customElements.get('x-confirm-dialog')) {
  customElements.define('x-confirm-dialog', XConfirmDialog);
}

// Dışa aktarım (opsiyonel kolaylık)
export const confirm = (opts) => XConfirmDialog.confirm(opts);
