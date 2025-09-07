// Import necessary modules and utilities
import {LitElement, html} from 'lit';
import {t} from '../i18n/i18n.js';
import {employeesStore} from '../store/employees.store.js';
import {adoptCss} from '../utils/css.js';
import {
  validateEmployee as _validateEmployee,
  formatErrors,
} from '../utils/validation.js';
import {confirm as _confirm} from './shared/confirm-dialog.js';

export class EmployeeForm extends LitElement {
  // Define component properties
  static properties = {
    employeeId: {type: String}, // ID of the employee being edited
    errors: {state: true}, // Validation errors
  };

  // Assign validation and confirmation implementations
  static validateImpl = _validateEmployee;
  static confirmImpl = _confirm;

  constructor() {
    super();
    // Initialize default property values
    this.employeeId = '';
    this.errors = [];
    this._onI18n = () => this.requestUpdate(); // Re-render on language change
  }

  async firstUpdated() {
    // Load CSS specific to this form
    await adoptCss(
      this.shadowRoot,
      new URL('../styles/employee-form.css', import.meta.url).href
    );

    // Prefill form fields for editing
    const model = this._model();
    if (model) {
      for (const [k, v] of Object.entries(model)) {
        const el = this.renderRoot.querySelector(`[name="${k}"]`);
        if (el) el.value = v ?? '';
      }
    }
    // Add event listener for i18n changes
    window.addEventListener('i18n-changed', this._onI18n);
  }

  disconnectedCallback() {
    // Remove event listener for i18n changes
    window.removeEventListener('i18n-changed', this._onI18n);
    super.disconnectedCallback();
  }

  _model() {
    // Retrieve the employee model from the store
    if (!this.employeeId) return null;
    return employeesStore.getState().byId(this.employeeId);
  }

  _collect() {
    // Collect form data into an object
    const f = new FormData(this.renderRoot.querySelector('form'));
    return {
      id: this.employeeId || undefined,
      firstName: String(f.get('firstName') || '').trim(),
      lastName: String(f.get('lastName') || '').trim(),
      employmentDate: String(f.get('employmentDate') || ''),
      birthDate: String(f.get('birthDate') || ''),
      phone: String(f.get('phone') || '').trim(),
      email: String(f.get('email') || '')
        .trim()
        .toLowerCase(),
      department: String(f.get('department') || ''),
      position: String(f.get('position') || ''),
    };
  }

  _cancel(e) {
    // Handle cancel action
    e?.preventDefault?.();
    location.href = '/employees';
  }

  async _submit(e) {
    // Handle form submission
    e.preventDefault();
    this.errors = [];

    const dto = this._collect(); // Collect form data
    const errs = this.constructor.validateImpl(dto, !!this.employeeId); // Validate data
    if (errs.length) {
      this.errors = errs;
      await this.updateComplete;
      this.renderRoot.querySelector('.errors')?.focus();
      return;
    }

    const isEdit = !!this.employeeId;

    // Show confirmation dialog for edits
    if (isEdit) {
      const ok = await this.constructor.confirmImpl({
        variant: 'default',
        titleKey: 'confirm.title', // "Are you sure?"
        messageKey: 'confirm.updateMsg', // e.g. "Changes to {name} will be saved."
        messageParams: {name: `${dto.firstName} ${dto.lastName}`},
        confirmKey: 'actions.proceed', // "Proceed"
        cancelKey: 'actions.cancel', // "Cancel"
      });
      if (!ok) return;
    }

    try {
      // Save the employee data
      employeesStore.getState().upsert(dto);
      this._cancel(e); // Redirect to employees page
    } catch (err) {
      // Handle errors during save
      this.errors = [
        err?.message === 'UNIQUE_EMAIL'
          ? t('errors.uniqueEmail') || 'Email must be unique.'
          : t('errors.unknown') || 'Unknown error.',
      ];
    }
  }

  _openPicker(name) {
    // Open the native date picker or focus the input
    const input = this.renderRoot.querySelector(`input[name="${name}"]`);
    try {
      if (input?.showPicker) {
        input.showPicker(); // Open picker if supported
      } else {
        input?.focus(); // Fallback to focusing the input
      }
    } catch (err) {
      input?.focus(); // Graceful fallback for unsupported environments
    }
  }

  render() {
    // Render the employee form
    const msgs = formatErrors(this.errors); // Format validation errors

    const isEdit = !!this.employeeId; // Check if editing an existing employee
    const model = this._model(); // Get the employee model

    return html`
      <form class="form" @submit=${(e) => this._submit(e)} novalidate>
        ${msgs.length
          ? html`
              <div
                class="errors"
                tabindex="-1"
                role="alert"
                aria-live="assertive"
              >
                <ul>
                  ${msgs.map((m) => html`<li>${m}</li>`)}
                </ul>
              </div>
            `
          : null}
        ${isEdit && model
          ? html`
              <p class="editing-note">
                ${t('form.editing') || 'You are editing'} ${model.firstName}
                ${model.lastName}
              </p>
            `
          : null}

        <!-- Form fields -->
        <section class="filters-panel">
          <div class="grid">
            <label>
              <span>${t('emp.firstName') || 'First Name'}</span>
              <input name="firstName" required autocomplete="given-name" />
            </label>

            <label>
              <span>${t('emp.lastName') || 'Last Name'}</span>
              <input name="lastName" required autocomplete="family-name" />
            </label>

            <label>
              <span>${t('emp.employmentDate') || 'Date of Employment'}</span>
              <div
                class="date-wrapper"
                @click=${() => this._openPicker('employmentDate')}
              >
                <input type="date" name="employmentDate" required />
              </div>
            </label>

            <label>
              <span>${t('emp.birthDate') || 'Date of Birth'}</span>
              <div
                class="date-wrapper"
                @click=${() => this._openPicker('birthDate')}
              >
                <input type="date" name="birthDate" required />
              </div>
            </label>

            <label>
              <span>${t('emp.phone') || 'Phone'}</span>
              <input
                name="phone"
                inputmode="tel"
                placeholder="+90 5xx xxx xx xx"
                required
              />
            </label>

            <label>
              <span>${t('emp.email') || 'Email'}</span>
              <input type="email" name="email" required />
            </label>

            <label>
              <span>${t('emp.department') || 'Department'}</span>
              <input name="department" required />
            </label>

            <label>
              <span>${t('emp.position') || 'Position'}</span>
              <select name="position" required>
                <option value="">
                  ${t('form.pleaseSelect') || 'Please Select'}
                </option>
                <option>Junior</option>
                <option>Medior</option>
                <option>Senior</option>
              </select>
            </label>
          </div>
        </section>

        <!-- Form actions -->
        <div class="form-actions">
          <button type="submit" class="btn primary">
            ${t('actions.save') || 'Save'}
          </button>
          <a
            href="/employees"
            class="btn outline"
            @click=${(e) => this._cancel(e)}
          >
            ${t('actions.cancel') || 'Cancel'}
          </a>
        </div>
      </form>
    `;
  }
}

// Define the custom element
customElements.define('employee-form', EmployeeForm);
