// Import necessary modules and utilities
import {LitElement, html} from 'lit';
import {adoptCss} from '../../utils/css.js';

export class SearchInput extends LitElement {
  // Define component properties
  static properties = {
    value: {type: String}, // Current value of the input
    placeholder: {type: String}, // Placeholder text for the input
    debounce: {type: Number}, // Debounce time in milliseconds
    label: {type: String}, // Accessible label for the input
  };

  constructor() {
    super();
    // Initialize default property values
    this.value = '';
    this.placeholder = 'Search…';
    this.label = 'Search';
    this.debounce = 250;
    this._timer = null; // Timer for debounce functionality
  }

  async firstUpdated() {
    // Adopt external CSS styles
    await adoptCss(
      this.shadowRoot,
      new URL('../styles/search-input.css', import.meta.url).href
    );
  }

  _onInput(e) {
    // Handle input event with debounce
    this.value = e.target.value;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      // Dispatch a custom event when the value changes
      this.dispatchEvent(
        new CustomEvent('search-change', {
          detail: {value: this.value},
          bubbles: true,
          composed: true,
        })
      );
    }, this.debounce);
  }

  render() {
    // Render the search input component
    return html`
      <label class="search">
        <span class="visually-hidden">${this.label}</span>
        <input
          type="search"
          .value=${this.value}
          @input=${this._onInput}
          placeholder=${this.placeholder}
          aria-label=${this.label}
        />
      </label>
    `;
  }
}

// Define the custom element
customElements.define('search-input', SearchInput);
