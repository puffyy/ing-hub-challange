// Import necessary modules and components
import {LitElement, html} from 'lit';
import '../components/employee-form.js';

export class PageEmployeeEdit extends LitElement {
  // Define reactive properties
  static properties = {location: {state: true}};

  get id() {
    // Retrieve the employee ID from the router's location parameters
    return this.location?.params?.id ?? '';
  }

  get isEdit() {
    // Determine if the page is in edit mode based on the presence of an ID
    return !!this.id;
  }

  render() {
    // Render the page title and employee form
    return html`
      <h2>${this.isEdit ? 'Edit Employee' : 'Add Employee'}</h2>
      <employee-form .employeeId=${this.id}></employee-form>
    `;
  }
}

// Define the custom element
customElements.define('page-employee-edit', PageEmployeeEdit);
