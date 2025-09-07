// Import necessary modules and utilities
import {html, LitElement} from 'lit';
import {t} from '../../i18n/i18n.js';
import {adoptCss} from '../../utils/css.js';

export class HrNav extends LitElement {
  // Define component properties
  static properties = {lang: {type: String}};

  constructor() {
    super();

    // Initialize the language property
    this.lang = document.documentElement.lang || 'en';

    // Bind the language change handler
    this._onLangChange = () => {
      this.lang = document.documentElement.lang || 'en';
      this.requestUpdate();
    };
  }

  connectedCallback() {
    super.connectedCallback();
    // Add event listener for language changes
    window.addEventListener('i18n-changed', this._onLangChange);
  }

  disconnectedCallback() {
    // Remove event listener for language changes
    window.removeEventListener('i18n-changed', this._onLangChange);
    super.disconnectedCallback();
  }

  async firstUpdated() {
    // Adopt external CSS styles
    await adoptCss(
      this.shadowRoot,
      new URL('../styles/hr-nav.css', import.meta.url).href
    );
  }

  _setLang(e) {
    // Update the language based on the selected value
    const next = e.target.value;
    if (!next) return;
    document.documentElement.lang = next;
  }

  render() {
    // Render the navigation bar
    return html`
      <header class="nav">
        <a class="brand" href="/employees">Lit HR</a>
        <nav class="links">
          <a href="/employees">${t('nav.employees')}</a>
        </nav>
        <div class="right">
          <span aria-hidden="true">🌐</span>
          <select
            @change="${this._setLang}"
            .value=${this.lang}
            aria-label="Language"
          >
            <option value="en">EN</option>
            <option value="tr">TR</option>
          </select>
        </div>
      </header>
    `;
  }
}

// Define the custom element
customElements.define('hr-nav', HrNav);
