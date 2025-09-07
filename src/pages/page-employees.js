// src/pages/page-employees.js
// Import necessary modules and components
import {LitElement, html} from 'lit';
import '../components/employee-list.js';

export class PageEmployees extends LitElement {
  // Keep page as light DOM so any document-level utilities can style it
  createRenderRoot() {
    return this;
  }

  render() {
    // Render the employee list component
    return html`<employee-list></employee-list>`;
  }
}

// Define the custom element
customElements.define('page-employees', PageEmployees);
