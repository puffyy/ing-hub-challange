// Import necessary modules and utilities
import {LitElement, html} from 'lit';
import {t} from '../i18n/i18n.js';
import {employeesStore} from '../store/employees.store.js';
import {adoptCss} from '../utils/css.js';
import {confirm as showConfirm} from './shared/confirm-dialog.js';
import './shared/pagination.js';
import './shared/search-input.js';

export class EmployeeList extends LitElement {
  // Define component properties
  static properties = {
    q: {type: String}, // Search query
    page: {type: Number}, // Current page number
    view: {type: String}, // View mode ('table' or 'list')
    pageSize: {type: Number}, // Number of items per page
    showFilters: {state: true}, // Whether to show the filters panel
    filters: {state: true}, // Filters applied to the list
  };

  constructor() {
    super();
    // Initialize default property values
    this.q = '';
    this.page = 1;
    this.view = 'table';
    this.pageSize = 10;
    this.showFilters = false;
    this.filters = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      empFrom: '',
      empTo: '',
      birthFrom: '',
      birthTo: '',
    };

    this._unsub = () => {};
    this._onI18n = () => this.requestUpdate();

    // Define asset URLs for icons
    this._iconList = new URL(
      '../assets/icons/burger-menu-icon.svg',
      import.meta.url
    ).href;
    this._iconGrid = new URL(
      '../assets/icons/grid-menu-icon.svg',
      import.meta.url
    ).href;

    this._iconEdit = new URL(
      '../assets/icons/edit-icon.svg',
      import.meta.url
    ).href;
    this._iconTrash = new URL(
      '../assets/icons/trash-icon.svg',
      import.meta.url
    ).href;

    this._iconEditWhite = new URL(
      '../assets/icons/edit-icon-white.svg',
      import.meta.url
    ).href;
    this._iconTrashWhite = new URL(
      '../assets/icons/trash-icon-white.svg',
      import.meta.url
    ).href;

    this._iconFunnel = new URL(
      '../assets/icons/funnel-icon.svg',
      import.meta.url
    ).href;
  }

  _allNow() {
    // Retrieve all employees from the store
    const s = employeesStore.getState();
    if (typeof s.all === 'function') return s.all(); // Preferred: returns ALL
    if (Array.isArray(s.employeesFull)) return s.employeesFull; // Alternative naming
    if (Array.isArray(s.employees)) return s.employees; // Only if this is ALL, not paged
    if (Array.isArray(s.items)) return s.items;
    return [];
  }

  async firstUpdated() {
    // Adopt external CSS styles
    await adoptCss(
      this.shadowRoot,
      new URL('../styles/employee-list.css', import.meta.url).href
    );
  }

  get _effectivePageSize() {
    // Determine the effective page size based on the view mode
    return this.view === 'list' ? 4 : this.pageSize; // Card view = 4, Table view = this.pageSize (10)
  }

  updated(changed) {
    // Update pagination when relevant properties change
    if (
      changed.has('view') ||
      changed.has('q') ||
      changed.has('filters') ||
      changed.has('page') ||
      changed.has('pageSize')
    ) {
      const size = this._effectivePageSize;
      const totalPages = Math.max(1, Math.ceil(this._filtered.length / size));
      const clamped = Math.min(Math.max(1, this.page), totalPages);
      if (clamped !== this.page) this.page = clamped;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Subscribe to the employees store and listen for i18n changes
    this._unsub = employeesStore.subscribe(() => this.requestUpdate());
    window.addEventListener('i18n-changed', this._onI18n);
  }

  disconnectedCallback() {
    // Unsubscribe from the store and remove event listeners
    this._unsub();
    window.removeEventListener('i18n-changed', this._onI18n);
    super.disconnectedCallback();
  }

  // --- Data helpers
  _unique(field) {
    // Get unique values for a specific field
    const all = this._allNow();
    return Array.from(new Set(all.map((e) => e[field]).filter(Boolean))).sort();
  }

  _digits(s) {
    // Extract digits from a string
    return String(s || '').replace(/\D+/g, '');
  }
  _norm(s) {
    // Normalize a string (lowercase)
    return String(s || '').toLowerCase();
  }
  _inRange(val, from, to) {
    // Check if a value is within a range
    return (!from || val >= from) && (!to || val <= to);
  }

  get _filtered() {
    // Filter the employee list based on search query and filters
    const all = this._allNow(); // Live full list
    const q = this._norm(this.q);
    const F = this.filters;

    let list = all.filter(
      (e) =>
        !q ||
        [
          e.firstName,
          e.lastName,
          e.email,
          e.phone,
          e.department,
          e.position,
        ].some((v) => this._norm(v).includes(q))
    );

    list = list.filter((e) => {
      // Apply filters
      if (
        F.firstName &&
        !this._norm(e.firstName).includes(this._norm(F.firstName))
      )
        return false;
      if (
        F.lastName &&
        !this._norm(e.lastName).includes(this._norm(F.lastName))
      )
        return false;
      if (F.email && !this._norm(e.email).includes(this._norm(F.email)))
        return false;
      if (F.phone && !this._digits(e.phone).includes(this._digits(F.phone)))
        return false;
      if (F.department && e.department !== F.department) return false;
      if (F.position && e.position !== F.position) return false;
      if (
        (F.empFrom || F.empTo) &&
        !this._inRange(e.employmentDate, F.empFrom, F.empTo)
      )
        return false;
      if (
        (F.birthFrom || F.birthTo) &&
        !this._inRange(e.birthDate, F.birthFrom, F.birthTo)
      )
        return false;
      return true;
    });

    return list;
  }

  _slice(items, size = this.pageSize) {
    // Slice the list for pagination
    const s = Math.max(1, Number(size) || 1);
    const start = (this.page - 1) * s;
    return items.slice(start, start + s);
  }

  _onDelete(id, name) {
    // Handle delete action with confirmation
    if (!confirm(t('confirm.delete', {name}) || `Delete ${name}?`)) return;
    employeesStore.getState().remove(id);
  }

  // --- Filter handlers
  _setQ = (e) => {
    // Update search query
    this.q = e.target.value;
    this.page = 1;
  };
  _setText = (k) => (e) => {
    // Update text-based filters
    this.filters = {...this.filters, [k]: this._norm(e.target.value)};
    this.page = 1;
  };
  _setDate = (k) => (e) => {
    // Update date-based filters
    this.filters = {...this.filters, [k]: e.target.value};
    this.page = 1;
  };
  _setPick = (k) => (e) => {
    // Update dropdown-based filters
    this.filters = {...this.filters, [k]: e.target.value || ''};
    this.page = 1;
  };
  _clearFilters = () => {
    // Clear all filters
    this.filters = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      empFrom: '',
      empTo: '',
      birthFrom: '',
      birthTo: '',
    };
    this.page = 1;
  };

  render() {
    // Render the employee list
    const filtered = this._filtered;
    const size = this._effectivePageSize;

    const pageItems = this._slice(filtered, size);

    const departments = this._unique('department');
    const positions = this._unique('position');

    return html`
      <!-- Header row: title (left) + search + icons (right) -->
      <header class="list-header">
        <h1 class="title">${t('title.employee-list') || 'Employee List'}</h1>

        <div class="header-actions">
          <input
            class="search"
            type="search"
            placeholder="${t('list.search') || 'Search...'}"
            .value=${this.q}
            @input=${this._setQ}
            aria-label="${t('list.search') || 'Search'}"
          />

          <!-- Filter button -->
          <button
            class="icon-btn filter"
            aria-label="${t('list.filter') || 'Filter'}"
            aria-expanded=${this.showFilters}
            @click=${() => (this.showFilters = !this.showFilters)}
            title="${t('list.filter') || 'Filter'}"
          >
            <img src="${this._iconFunnel}" alt="" aria-hidden="true" />
            <span class="sr-only">${t('actions.filters') || 'Filters'}</span>
          </button>

          <!-- existing view toggle -->
          <div
            class="view-toggle"
            role="group"
            aria-label="${t('list.view') || 'View'}"
          >
            <button
              class="icon-btn"
              aria-pressed=${this.view === 'table'}
              @click=${() => {
                this.view = 'table';
                this.page = 1;
              }}
            >
              <img src="${this._iconList}" alt="" aria-hidden="true" />
            </button>
            <button
              class="icon-btn"
              aria-pressed=${this.view === 'list'}
              @click=${() => {
                this.view = 'list';
                this.page = 1;
              }}
            >
              <img src="${this._iconGrid}" alt="" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <!-- Collapsible filter panel (affects both views) -->
      ${this.showFilters
        ? html`
            <section
              class="filters-panel"
              aria-label="${t('list.filters') || 'Filters'}"
            >
              <div class="grid">
                <label>
                  <span class="text-color-primary"
                    >${t('emp.firstName') || 'First Name'}</span
                  >
                  <input
                    type="search"
                    .value=${this.filters.firstName}
                    @input=${this._setText('firstName')}
                  />
                </label>
                <label>
                  <span>${t('emp.lastName') || 'Last Name'}</span>
                  <input
                    type="search"
                    .value=${this.filters.lastName}
                    @input=${this._setText('lastName')}
                  />
                </label>
                <label>
                  <span>${t('emp.email') || 'Email'}</span>
                  <input
                    type="search"
                    .value=${this.filters.email}
                    @input=${this._setText('email')}
                  />
                </label>
                <label>
                  <span>${t('emp.phone') || 'Phone'}</span>
                  <input
                    type="search"
                    .value=${this.filters.phone}
                    @input=${this._setText('phone')}
                  />
                </label>
                <label>
                  <span>${t('emp.department') || 'Department'}</span>
                  <select
                    .value=${this.filters.department}
                    @change=${this._setPick('department')}
                  >
                    <option value="">${t('list.all') || '— All —'}</option>
                    ${departments.map(
                      (d) => html`<option value="${d}">${d}</option>`
                    )}
                  </select>
                </label>
                <label>
                  <span>${t('emp.position') || 'Position'}</span>
                  <select
                    .value=${this.filters.position}
                    @change=${this._setPick('position')}
                  >
                    <option value="">${t('list.all') || '— All —'}</option>
                    ${positions.map(
                      (p) => html`<option value="${p}">${p}</option>`
                    )}
                  </select>
                </label>

                <label>
                  <span
                    >${t('emp.employmentDate') || 'Employment Date'} -
                    ${t('from') || 'From'}</span
                  >
                  <div
                    class="date-wrapper"
                    @click=${() => this._openPicker('empFrom')}
                  >
                    <input
                      type="date"
                      .value=${this.filters.empFrom}
                      @input=${this._setDate('empFrom')}
                    />
                  </div>
                </label>
                <label>
                  <span
                    >${t('emp.employmentDate') || 'Employment Date'} —
                    ${t('to') || 'To'}</span
                  >
                  <div
                    class="date-wrapper"
                    @click=${() => this._openPicker('empTo')}
                  >
                    <input
                      type="date"
                      .value=${this.filters.empTo}
                      @input=${this._setDate('empTo')}
                    />
                  </div>
                </label>

                <label>
                  <span
                    >${t('emp.birthDate') || 'Birth Date'} —
                    ${t('from') || 'From'}</span
                  >
                  <div
                    class="date-wrapper"
                    @click=${() => this._openPicker('birthFrom')}
                  >
                    <input
                      type="date"
                      .value=${this.filters.birthFrom}
                      @input=${this._setDate('birthFrom')}
                    />
                  </div>
                </label>
                <label>
                  <span
                    >${t('emp.birthDate') || 'Birth Date'} —
                    ${t('to') || 'To'}</span
                  >
                  <div
                    class="date-wrapper"
                    @click=${() => this._openPicker('birthTo')}
                  >
                    <input
                      type="date"
                      .value=${this.filters.birthTo}
                      @input=${this._setDate('birthTo')}
                    />
                  </div>
                </label>
              </div>

              <div class="filters-actions">
                <button class="btn" @click=${this._clearFilters}>
                  ${t('actions.clear') || 'Clear'}
                </button>
              </div>
            </section>
          `
        : null}
      ${this.view === 'table'
        ? this._renderTable(pageItems) // Render table view
        : this._renderCards(pageItems)}
      <!-- Render card view -->

      <x-pagination
        .page=${this.page}
        .total=${filtered.length}
        .pageSize=${this._effectivePageSize}
        @page-change=${(e) => {
          this.page = e.detail.page;
        }}
      ></x-pagination>
    `;
  }

  // TABLE (unchanged markup)
  _renderTable(items) {
    // Keep selection across renders
    this._selected ??= new Set();

    // Selection helpers for current page
    const allPageSelected =
      items.length > 0 && items.every((e) => this._selected.has(e.id));
    const somePageSelected = items.some((e) => this._selected.has(e.id));

    const toggleAll = (ev) => {
      if (ev.target.checked) for (const e of items) this._selected.add(e.id);
      else for (const e of items) this._selected.delete(e.id);
      this.requestUpdate();
    };
    const toggleRow = (id) => (ev) => {
      if (ev.target.checked) this._selected.add(id);
      else this._selected.delete(id);
      this.requestUpdate();
    };

    // Indeterminate header checkbox after render
    this.updateComplete.then(() => {
      const cb = this.renderRoot.querySelector('input[name="select-page"]');
      if (cb) cb.indeterminate = !allPageSelected && somePageSelected;
    });

    const selectedCount = this._selected.size;

    const bulkDelete = async () => {
      if (selectedCount < 2) return;

      // If the i18n key exists, use it; otherwise provide a safe fallback text
      const fallbackMsg =
        t('confirm.deleteMany', {count: selectedCount}) ||
        `Delete ${selectedCount} selected records?`;

      const ok = await showConfirm({
        variant: 'danger',
        titleKey: 'confirm.title', // "Are you sure?"
        messageKey: 'confirm.deleteMany', // use this if it exists in the dictionary
        message: fallbackMsg, // otherwise show this direct text
        confirmKey: 'actions.proceed', // "Proceed"
        cancelKey: 'actions.cancel', // "Cancel"
      });
      if (!ok) return;

      const api = employeesStore.getState();
      for (const id of this._selected) api.remove(id);
      this._selected.clear();
      this.requestUpdate();
    };

    return html`
      <div class="table-container">
        <table aria-label="${t('list.tableAria') || 'Employee table'}">
          <thead>
            ${selectedCount > 1
              ? html`
                  <tr class="bulk-actions">
                    <th colspan="10" style="flex justfiy-between">
                      <strong>${selectedCount}</strong>
                      ${t('list.selected') || 'selected'}
                      <button class="btn danger" @click=${bulkDelete}>
                        ${t('actions.deleteSelected') || 'Delete selected'}
                      </button>
                    </th>
                  </tr>
                `
              : null}

            <tr>
              <th style="width:32px">
                <input
                  type="checkbox"
                  name="select-page"
                  .checked=${allPageSelected}
                  @change=${toggleAll}
                  aria-label="${t('list.selectAll') ||
                  'Select all on this page'}"
                />
              </th>
              <th>${t('emp.firstName')}</th>
              <th>${t('emp.lastName')}</th>
              <th>${t('emp.employmentDate')}</th>
              <th>${t('emp.birthDate')}</th>
              <th>${t('emp.phone')}</th>
              <th>${t('emp.email')}</th>
              <th>${t('emp.department')}</th>
              <th>${t('emp.position')}</th>
              <th>${t('actions.label') || 'Actions'}</th>
            </tr>
          </thead>

          <tbody>
            ${items.map(
              (e) => html`
              <tr>
                <td class="sel">
                  <input
                    type="checkbox"
                    .checked=${this._selected.has(e.id)}
                    @change=${toggleRow(e.id)}
                    aria-label="Select ${e.firstName} ${e.lastName}"
                  />
                </td>
                <td>${e.firstName}</td>
                <td>${e.lastName}</td>
                <td>${e.employmentDate}</td>
                <td>${e.birthDate}</td>
                <td>${e.phone}</td>
                <td>${e.email}</td>
                <td>${e.department}</td>
                <td>${e.position}</td>
                <td class="actions">
                  <a
                    class="icon-link"
                    href="/employees/${
                      e.id
                    }"              /* ✅ router-friendly edit URL */
                    title="${t('actions.edit') || 'Edit'}"
                    aria-label="${t('actions.edit') || 'Edit'} ${e.firstName} ${
                e.lastName
              }"
                  >
                    <img src="${this._iconEdit}" alt="" aria-hidden="true" />
                    <span class="sr-only">${t('actions.edit') || 'Edit'}</span>
                  </a>

                  <button
                    class="icon-btn danger"
                    @click=${() =>
                      this._onDelete(e.id, `${e.firstName} ${e.lastName}`)}
                    title="${t('actions.delete') || 'Delete'}"
                    aria-label="${t('actions.delete') || 'Delete'} ${
                e.firstName
              } ${e.lastName}"
                  >
                    <img src="${this._iconTrash}" alt="" aria-hidden="true" />
                    <span class="sr-only">${
                      t('actions.delete') || 'Delete'
                    }</span>
                  </button>
                </td>

              </tr>
            `
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  _renderCards(items) {
    // Render employee cards
    return html`
      <div class="cards cards-grid" role="list">
        ${items.map(
          (e) => html`
            <article
              class="emp-card"
              role="listitem"
              tabindex="0"
              aria-label="${e.firstName} ${e.lastName}"
            >
              <dl class="emp-card__grid">
                <div class="pair">
                  <dt>${t('emp.firstName') || 'First Name'}:</dt>
                  <dd>${e.firstName}</dd>
                </div>
                <div class="pair">
                  <dt>${t('emp.lastName') || 'Last Name'}:</dt>
                  <dd>${e.lastName}</dd>
                </div>

                <div class="pair">
                  <dt>${t('emp.employmentDate') || 'Date of Employment'}:</dt>
                  <dd>${e.employmentDate}</dd>
                </div>
                <div class="pair">
                  <dt>${t('emp.birthDate') || 'Date of Birth'}:</dt>
                  <dd>${e.birthDate}</dd>
                </div>

                <div class="pair">
                  <dt>${t('emp.phone') || 'Phone'}:</dt>
                  <dd>${e.phone}</dd>
                </div>
                <div class="pair">
                  <dt>${t('emp.email') || 'Email'}:</dt>
                  <dd class="wrap">${e.email}</dd>
                </div>

                <div class="pair">
                  <dt>${t('emp.department') || 'Department'}:</dt>
                  <dd>${e.department}</dd>
                </div>
                <div class="pair">
                  <dt>${t('emp.position') || 'Position'}:</dt>
                  <dd>${e.position}</dd>
                </div>
              </dl>

              <footer class="emp-card__actions">
                <a
                  class="btn indigo"
                  href="/employees/${e.id}"
                  title="${t('actions.edit') || 'Edit'}"
                  aria-label="${(t('actions.edit') || 'Edit') +
                  ' ' +
                  e.firstName +
                  ' ' +
                  e.lastName}"
                >
                  <img src="${this._iconEditWhite}" alt="" aria-hidden="true" />
                  <span>${t('actions.edit') || 'Edit'}</span>
                </a>

                <button
                  class="btn danger"
                  @click=${() =>
                    this._onDelete(e.id, `${e.firstName} ${e.lastName}`)}
                  title="${t('actions.delete') || 'Delete'}"
                  aria-label="${(t('actions.delete') || 'Delete') +
                  ' ' +
                  e.firstName +
                  ' ' +
                  e.lastName}"
                >
                  <img
                    src="${this._iconTrashWhite}"
                    alt=""
                    aria-hidden="true"
                  />
                  <span>${t('actions.delete') || 'Delete'}</span>
                </button>
              </footer>
            </article>
          `
        )}
      </div>
    `;
  }
}

// Define the custom element
customElements.define('employee-list', EmployeeList);
