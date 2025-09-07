// Import necessary modules and utilities
import {html, LitElement} from 'lit';
import {ifDefined} from 'lit/directives/if-defined.js';
import {adoptCss} from '../../utils/css.js';

export class XPagination extends LitElement {
  // Define component properties
  static properties = {
    page: {type: Number}, // Current page number
    total: {type: Number}, // Total number of items
    pageSize: {type: Number}, // Number of items per page
    maxButtons: {type: Number}, // Maximum number of pagination buttons
    hideOnSinglePage: {type: Boolean}, // Hide pagination if only one page
  };

  constructor() {
    super();
    // Initialize default property values
    this.page = 1;
    this.total = 0;
    this.pageSize = 10;
    this.maxButtons = 7;
    this.hideOnSinglePage = false;
  }

  async firstUpdated() {
    // Adopt external CSS styles
    await adoptCss(
      this.shadowRoot,
      new URL('../../styles/pagination.css', import.meta.url).href
    );
  }

  get _pages() {
    // Calculate pagination details
    const total = Number(this.total) || 0;
    const size = Math.max(1, Number(this.pageSize) || 1);
    const totalPages = Math.max(1, Math.ceil(total / size));

    // Clamp current page within valid range
    const cur = Math.min(Math.max(1, Number(this.page) || 1), totalPages);

    const span = Math.max(1, Number(this.maxButtons) || 1);
    const half = Math.floor(span / 2);

    let start = Math.max(1, cur - half);
    let end = Math.min(totalPages, start + span - 1);
    if (end - start + 1 < span) start = Math.max(1, end - span + 1);

    return {totalPages, cur, start, end};
  }

  _emit(page) {
    // Emit a page-change event
    const {totalPages} = this._pages;
    const next = Math.min(Math.max(1, Number(page) || 1), totalPages);
    if (next === this.page) return;

    this.dispatchEvent(
      new CustomEvent('page-change', {
        detail: {page: next},
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    // Render the pagination component
    const {totalPages, cur, start, end} = this._pages;

    // Hide pagination if only one page and hideOnSinglePage is true
    if (totalPages === 1 && this.hideOnSinglePage) return null;

    return html`
      <nav class="pagination" role="navigation" aria-label="Pagination">
        <!-- Previous button -->
        <button
          class="prev"
          ?disabled=${cur === 1}
          @click=${() => this._emit(cur - 1)}
          aria-label="Previous page"
        >
          ‹
        </button>

        <!-- First page and leading ellipsis -->
        ${start > 1
          ? html`
              <button
                class=${cur === 1 ? 'current' : ''}
                aria-current=${ifDefined(cur === 1 ? 'page' : undefined)}
                @click=${() => this._emit(1)}
              >
                1
              </button>
              ${start > 2
                ? html`<span class="ellipsis" aria-hidden="true">…</span>`
                : null}
            `
          : null}

        <!-- Page buttons -->
        ${Array.from({length: end - start + 1}, (_, i) => start + i).map(
          (n) => html`
            <button
              class=${n === cur ? 'current' : ''}
              aria-current=${ifDefined(n === cur ? 'page' : undefined)}
              @click=${() => this._emit(n)}
            >
              ${n}
            </button>
          `
        )}

        <!-- Trailing ellipsis and last page -->
        ${end < totalPages
          ? html`
              ${end < totalPages - 1
                ? html`<span class="ellipsis" aria-hidden="true">…</span>`
                : null}
              <button
                class=${cur === totalPages ? 'current' : ''}
                aria-current=${ifDefined(
                  cur === totalPages ? 'page' : undefined
                )}
                @click=${() => this._emit(totalPages)}
              >
                ${totalPages}
              </button>
            `
          : null}

        <!-- Next button -->
        <button
          class="next"
          ?disabled=${cur === totalPages}
          aria-disabled=${cur === totalPages ? 'true' : 'false'}
          rel="next"
          @click=${() => this._emit(cur + 1)}
          aria-label="Next page"
        >
          ›
        </button>
      </nav>
    `;
  }
}

// Define the custom element
customElements.define('x-pagination', XPagination);
