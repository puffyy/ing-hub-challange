// Import necessary modules and utilities
import {LitElement, html} from 'lit';
import {t} from '../../i18n/i18n.js';
import {adoptCss} from '../../utils/css.js';

// Define a constant for the accent color
const ACCENT = '#ff6200'; // ING orange

export class HrHeader extends LitElement {
  // Define component properties
  static properties = {
    lang: {type: String, reflect: true},
  };

  constructor() {
    super();
    // Initialize the language property
    this.lang = document.documentElement.lang || 'en';

    // Bind the language change handler
    this._onLangChanged = () => {
      this.lang = document.documentElement.lang || 'en';
      this.requestUpdate();
    };

    // Define asset URLs
    this._logo = new URL(
      '../../assets/img/logo_small.png',
      import.meta.url
    ).href;
    this._user = new URL(
      '../../assets/icons/user-icon.svg',
      import.meta.url
    ).href;
    this._plus = new URL(
      '../../assets/icons/plus-icon.svg',
      import.meta.url
    ).href;
    this._flagEN = new URL(
      '../../assets/img/en-flag.png',
      import.meta.url
    ).href;
    this._flagTR = new URL(
      '../../assets/img/tr-flag.png',
      import.meta.url
    ).href;
  }

  async firstUpdated() {
    // Adopt external CSS styles
    await adoptCss(
      this.shadowRoot,
      new URL('../../styles/hr-header.css', import.meta.url).href
    );
    // Add event listener for language changes
    window.addEventListener('i18n-changed', this._onLangChanged);
  }
  disconnectedCallback() {
    // Remove event listener for language changes
    window.removeEventListener('i18n-changed', this._onLangChanged);
    super.disconnectedCallback();
  }

  _isActive(path) {
    // Check if the current path matches the given path
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
  }

  _setLang(code) {
    // Set the language and save it to localStorage
    if (!code) return;
    document.documentElement.lang = code;
    try {
      localStorage.setItem('ui/lang', code);
    } catch (e) {
      // Handle potential errors with localStorage (e.g., private mode)
      return; // <-- not empty anymore; satisfies eslint(no-empty)
    }
    // The i18n observer will emit 'i18n-changed'
  }

  render() {
    // Determine the active state and language flag
    const activeEmployees = this._isActive('/employees');
    const isTR = this.lang?.toLowerCase().startsWith('tr');
    const flag = isTR ? this._flagTR : this._flagEN;
    const flagAlt = isTR ? 'Türkçe' : 'English';

    // Render the header
    return html`
      <header class="bar" style="--accent:${ACCENT}">
        <a class="brand" href="/employees" aria-label="Home">
          <img class="logo" src="${this._logo}" alt="ING" style="header logo" />
          <span class="brand-text">ING</span>
        </a>

        <div class="spacer" aria-hidden="true"></div>

        <nav class="links" role="navigation" aria-label="Primary">
          <a class="link ${activeEmployees ? 'active' : ''}" href="/employees">
            <img class="icon" src="${this._user}" alt="" aria-hidden="true" />
            <span>${t('nav.employees') || 'Employees'}</span>
          </a>
          <a class="link add" href="/employees/new">
            <img class="icon" src="${this._plus}" alt="" aria-hidden="true" />
            <span>${t('nav.addNew') || 'Add New'}</span>
          </a>
        </nav>

        <div class="actions">
          <button
            class="lang"
            @click=${() => this._setLang(isTR ? 'en' : 'tr')}
            title="${flagAlt}"
            aria-label="${flagAlt}"
          >
            <img src="${flag}" alt="${flagAlt}" />
          </button>
        </div>
      </header>
    `;
  }
}

// Define the custom element
customElements.define('hr-header', HrHeader); // ✅ must contain a dash
