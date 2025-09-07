// Importing LitElement and other dependencies
import {LitElement, css, html} from 'lit';
import './components/shared/hr-header.js';
import './i18n/i18n.js';
import {initRouter as _initRouter} from './router.js';
import {seedFromJSONIfEmpty as _seedFromJSONIfEmpty} from './utils/seed.js';

export class AppRoot extends LitElement {
  // Default dependencies; allows overriding for testing
  static deps = {
    initRouter: _initRouter,
    seedFromJSONIfEmpty: _seedFromJSONIfEmpty,
  };

  // Method to override dependencies
  static setDeps(overrides = {}) {
    this.deps = {...this.deps, ...overrides};
  }

  // Define component styles
  static styles = css`
    :host {
      display: block;
    }
    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }
    .text-color-primary {
      color: #ff6200;
    }
  `;

  // Lifecycle method called after the first render
  async firstUpdated() {
    const {initRouter, seedFromJSONIfEmpty} = this.constructor.deps;
    // Initialize the router with the outlet element
    initRouter(this.renderRoot.querySelector('#outlet'));
    // Seed data if the store is empty
    await seedFromJSONIfEmpty();
  }

  // Render the component template
  render() {
    return html`
      <hr-header></hr-header>
      <main><div id="outlet"></div></main>
    `;
  }
}

// Define the custom element
customElements.define('app-root', AppRoot);
