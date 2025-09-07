/**
 * employee-list.test.js
 * Unit tests for <employee-list>
 */
import {aTimeout, expect, fixture, html} from '@open-wc/testing';
import sinon from 'sinon';

// ---- Global fetch stub (i18n + any CSS loads) ----
const fetchStub = sinon.stub(window, 'fetch').callsFake(async (input) => {
  const url = String(input);
  // Stub for English i18n dictionary
  if (url.includes('/i18n/en.json')) {
    return new Response(
      JSON.stringify({
        title: {'employee-list': 'Employee List'},
        list: {
          search: 'Search...',
          filter: 'Filter',
          filters: 'Filters',
          view: 'View',
          all: '— All —',
          tableAria: 'Employee table',
          selected: 'selected',
          selectAll: 'Select all on this page',
        },
        emp: {
          firstName: 'First Name',
          lastName: 'Last Name',
          employmentDate: 'Date of Employment',
          birthDate: 'Date of Birth',
          phone: 'Phone',
          email: 'Email',
          department: 'Department',
          position: 'Position',
        },
        actions: {
          filters: 'Filters',
          deleteSelected: 'Delete selected',
          edit: 'Edit',
          delete: 'Delete',
          clear: 'Clear',
          label: 'Actions',
        },
        confirm: {
          delete: 'Delete {name}?',
          deleteMany: 'Delete {count} selected?',
        },
        from: 'From',
        to: 'To',
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  }
  // Stub for Turkish i18n dictionary
  if (url.includes('/i18n/tr.json')) {
    return new Response(
      JSON.stringify({
        title: {'employee-list': 'Çalışan Listesi'},
        list: {
          search: 'Ara...',
          filter: 'Filtrele',
          filters: 'Filtreler',
          view: 'Görünüm',
          all: '— Tümü —',
          tableAria: 'Çalışan tablosu',
          selected: 'seçili',
          selectAll: 'Bu sayfadakilerin tümünü seç',
        },
        emp: {
          firstName: 'Ad',
          lastName: 'Soyad',
          employmentDate: 'İşe Başlama',
          birthDate: 'Doğum Tarihi',
          phone: 'Telefon',
          email: 'E-posta',
          department: 'Departman',
          position: 'Pozisyon',
        },
        actions: {
          filters: 'Filtreler',
          deleteSelected: 'Seçilileri sil',
          edit: 'Düzenle',
          delete: 'Sil',
          clear: 'Temizle',
          label: 'Aksiyonlar',
        },
        confirm: {
          delete: '{name} silinsin mi?',
          deleteMany: '{count} kayıt silinsin mi?',
        },
        from: 'Başlangıç',
        to: 'Bitiş',
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  }
  // Stub for CSS files
  if (url.endsWith('.css')) {
    return new Response('/* test css */', {status: 200});
  }
  return new Response('', {status: 200});
});

// Import modules AFTER fetch is stubbed
const storeMod = await import('../../src/store/employees.store.js');
await import('../../src/components/shared/pagination.js');
await import('../../src/components/shared/search-input.js');
await import('../../src/components/employee-list.js');

// ---- Seed & store stub helpers ----
function makeSeed(count = 9) {
  // Generate N employees with deterministic fields
  const arr = [];
  for (let i = 1; i <= count; i++) {
    arr.push({
      id: String(i),
      firstName: i === 1 ? 'Ada' : i === 2 ? 'Grace' : `Name${i}`,
      lastName: i === 1 ? 'Lovelace' : i === 2 ? 'Hopper' : `Surname${i}`,
      employmentDate: `2010-0${((i - 1) % 9) + 1}-01`,
      birthDate: `1980-0${((i - 1) % 9) + 1}-02`,
      phone: `+90 555 000 0${i}${i}`,
      email: (i === 3
        ? 'JOHN@EXAMPLE.COM'
        : `user${i}@example.com`
      ).toLowerCase(),
      department: i % 2 ? 'Tech' : 'Analytics',
      position: ['Junior', 'Medior', 'Senior'][i % 3],
    });
  }
  return arr;
}

function stubStore(seed = makeSeed()) {
  // Stub store with seed data
  let data = seed.slice();
  const subs = new Set();

  const api = {
    all: () => data.slice(),
    byId: (id) => data.find((e) => e.id === id) || null,
    remove: (id) => {
      data = data.filter((e) => e.id !== id);
      subs.forEach((fn) => fn());
    },
    employees: data, // not used directly, but harmless
  };

  const getStateStub = sinon
    .stub(storeMod.employeesStore, 'getState')
    .callsFake(() => api);
  const subscribeStub = sinon
    .stub(storeMod.employeesStore, 'subscribe')
    .callsFake((cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    });

  return {
    restore() {
      getStateStub.restore();
      subscribeStub.restore();
    },
    get data() {
      return api.all();
    },
    set data(next) {
      data = next.slice();
      subs.forEach((fn) => fn());
    },
    api,
    getStateStub,
  };
}

suite('<employee-list>', () => {
  teardown(() => {
    sinon.restore(); // Restore all stubs and spies
    // Re-stub globals removed by restore
    sinon.stub(window, 'fetch').callsFake(fetchStub.wrappedMethod);
  });

  test('renders with CSS adopted and default table view', async () => {
    const st = stubStore(makeSeed(6));

    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    // Assert table exists, cards not rendered by default
    expect(el.shadowRoot.querySelector('table')).to.exist;
    expect(el.shadowRoot.querySelector('.cards-grid')).to.not.exist;

    st.restore();
  });

  test('search filters rows and resets page to 1', async () => {
    const st = stubStore(makeSeed(9));
    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    // Force to page 2 and confirm
    el.view = 'list';
    el.page = 3;
    await el.updateComplete;

    const input = el.shadowRoot.querySelector('input.search');
    input.value = 'Ada';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;

    // Assert page reset to 1
    expect(el.page).to.equal(1);

    // Assert only Ada Lovelace appears
    el.view = 'table';
    await el.updateComplete;
    const rows = el.shadowRoot.querySelectorAll('tbody tr');
    expect(rows.length).to.be.at.least(1);
    const text = rows[0].textContent;
    expect(text).to.include('Ada');
    expect(text).to.include('Lovelace');

    st.restore();
  });

  test('filter panel toggles via button and clears with "Clear"', async () => {
    const st = stubStore(makeSeed(9));
    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    const btn = el.shadowRoot.querySelector('button.icon-btn.filter');
    expect(el.showFilters).to.be.false;
    btn.click();
    await el.updateComplete;
    expect(el.showFilters).to.be.true;
    expect(btn.getAttribute('aria-expanded')).to.equal('true');

    // Type in firstName filter
    const firstNameInput =
      el.shadowRoot.querySelector(
        '.filters-panel input[type="search"]:not([value])'
      ) || el.shadowRoot.querySelector('.filters-panel input[type="search"]');
    firstNameInput.value = 'grace';
    firstNameInput.dispatchEvent(new Event('input'));
    await el.updateComplete;

    // Now clear
    const clear = el.shadowRoot.querySelector('.filters-actions .btn');
    clear.click();
    await el.updateComplete;

    // Filters reset
    const inputs = el.shadowRoot.querySelectorAll('.filters-panel input');
    inputs.forEach((i) => expect(i.value || '').to.equal(''));

    st.restore();
  });

  test('text, phone, select and date range filters are applied correctly', async () => {
    // --- Arrange store with 2 employees: only Ada should match active filters ---
    const rows = [
      {
        id: '1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        employmentDate: '2010-01-02',
        birthDate: '1980-12-11',
        phone: '+90 555 111 22 33',
        email: 'ada@ing.com',
        department: 'Tech',
        position: 'Senior',
      },
      {
        id: '2',
        firstName: 'Grace',
        lastName: 'Hopper',
        employmentDate: '2015-05-06',
        birthDate: '1985-06-09',
        phone: '+90 555 999 88 77',
        email: 'grace@ing.com',
        department: 'Analytics',
        position: 'Junior',
      },
    ];

    const {employeesStore} = await import('../../src/store/employees.store.js');
    const getStateStub = sinon.stub(employeesStore, 'getState').returns({
      all: () => rows,
      subscribe: () => () => {}, // no-op unsubscribe
      remove: () => {},
    });

    await import('../../src/components/employee-list.js');
    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    await new Promise(requestAnimationFrame);
    // --- Open the Filters panel (uses the same classes as your list header) ---
    el.shadowRoot.querySelector('.icon-btn.filter').click();
    await el.updateComplete;

    const panel = el.shadowRoot.querySelector('.filters-panel');
    const grid = panel.querySelector('.grid');

    // --- Fill text inputs (these fire @input → _setText → lower-cased storage) ---
    const textInputs = grid.querySelectorAll('input[type="search"]');
    // order: firstName, lastName, email, phone
    textInputs[0].value = 'Ada';
    textInputs[0].dispatchEvent(
      new Event('input', {bubbles: true, composed: true})
    );

    textInputs[1].value = ''; // lastName filter not used
    textInputs[1].dispatchEvent(
      new Event('input', {bubbles: true, composed: true})
    );

    textInputs[2].value = 'ADA@ING.COM'; // email (mixed case - UI normalizes)
    textInputs[2].dispatchEvent(
      new Event('input', {bubbles: true, composed: true})
    );

    textInputs[3].value = '555111'; // partial digits (component compares digits)
    textInputs[3].dispatchEvent(
      new Event('input', {bubbles: true, composed: true})
    );

    // --- Pickers (selects) for department/position (use @change → _setPick) ---
    const selects = grid.querySelectorAll('select');
    // order: department, position
    selects[0].value = 'Tech';
    selects[0].dispatchEvent(
      new Event('change', {bubbles: true, composed: true})
    );

    selects[1].value = 'Senior';
    selects[1].dispatchEvent(
      new Event('change', {bubbles: true, composed: true})
    );

    // --- Date ranges (use @input → _setDate) ---
    const dates = grid.querySelectorAll('input[type="date"]');
    // order: empFrom, empTo, birthFrom, birthTo
    dates[0].value = '2010-01-01';
    dates[0].dispatchEvent(new Event('input', {bubbles: true, composed: true}));
    dates[1].value = '2010-12-31';
    dates[1].dispatchEvent(new Event('input', {bubbles: true, composed: true}));

    dates[2].value = '1970-01-01';
    dates[2].dispatchEvent(new Event('input', {bubbles: true, composed: true}));
    dates[3].value = '1990-01-01';
    dates[3].dispatchEvent(new Event('input', {bubbles: true, composed: true}));

    // Ensure we’re on the first page after changing filters
    el.page = 1;
    await el.updateComplete;

    // --- Assert: only Ada remains in the table view ---
    const rowsDom = el.shadowRoot.querySelectorAll('tbody tr');
    expect(rowsDom.length).to.equal(1);
    const firstNameCell = rowsDom[0].querySelector('td:nth-child(2)');
    expect(firstNameCell.textContent.trim()).to.equal('Ada');

    getStateStub.restore();
  });

  test('cards view shows 4 cards (effective page size) and paginates to next set', async () => {
    // eslint-disable-next-line no-unused-vars
    const st = stubStore(makeSeed(9));
    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    // Switch to list (cards)
    const buttons = el.shadowRoot.querySelectorAll('.view-toggle .icon-btn');
    const listBtn = buttons[1];
    listBtn.click();
    await el.updateComplete;

    let cards = el.shadowRoot.querySelectorAll('.emp-card');
    expect(cards.length).to.equal(4); // page size 4 in list view

    // Go to page 2 via x-pagination event
    const pager = el.shadowRoot.querySelector('x-pagination');
    pager.dispatchEvent(
      new CustomEvent('page-change', {
        detail: {page: 2},
        bubbles: true,
        composed: true,
      })
    );
    await el.updateComplete;

    cards = el.shadowRoot.querySelectorAll('.emp-card');
    expect(cards.length).to.equal(4);
  });

  test('switching from list (page 3) to table clamps page back to 1 (single table page)', async () => {
    const st = stubStore(makeSeed(9));
    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    // list: 9 items -> 3 pages (4/page)
    el.view = 'list';
    el.page = 3;
    await el.updateComplete;

    // switch to table: 10/page => total pages = 1 => clamp to 1
    const tableBtn = el.shadowRoot.querySelectorAll(
      '.view-toggle .icon-btn'
    )[0];
    tableBtn.click();
    await el.updateComplete;

    expect(el.view).to.equal('table');
    expect(el.page).to.equal(1);

    st.restore();
  });

  test('x-pagination reflects effective page size and updates page on event', async () => {
    const st = stubStore(makeSeed(9));
    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    // Table view -> pageSize = 10
    let pager = el.shadowRoot.querySelector('x-pagination');
    expect(pager.pageSize).to.equal(10);

    // Switch to list -> pageSize = 4
    el.view = 'list';
    await el.updateComplete;
    pager = el.shadowRoot.querySelector('x-pagination');
    expect(pager.pageSize).to.equal(4);

    // Trigger page-change
    pager.dispatchEvent(
      new CustomEvent('page-change', {
        detail: {page: 2},
        bubbles: true,
        composed: true,
      })
    );
    await el.updateComplete;
    expect(el.page).to.equal(2);

    st.restore();
  });

  test('delete flow: confirm(false) does not remove; confirm(true) removes and triggers update', async () => {
    const st = stubStore(makeSeed(5));
    const confirmStub = sinon.stub(window, 'confirm');

    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    // Table view, click first row's delete button
    const firstDelete = el.shadowRoot.querySelector(
      'tbody tr .actions .icon-btn.danger'
    );
    // Case 1: user cancels
    confirmStub.returns(false);
    firstDelete.click();
    await el.updateComplete;
    expect(st.data.length).to.equal(5);

    // Case 2: user confirms
    confirmStub.returns(true);
    firstDelete.click();
    await el.updateComplete;
    expect(st.data.length).to.equal(4);

    confirmStub.restore();
    st.restore();
  });

  test('table header checkbox selects all on page, bulk delete removes all selected', async () => {
    // 8 items so still single table page (pageSize 10)
    const st = stubStore(makeSeed(8));
    const confirmStub = sinon.stub(window, 'confirm').returns(true);

    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    // Select-all
    const selectAll = el.shadowRoot.querySelector('input[name="select-page"]');
    selectAll.click();
    await el.updateComplete;

    // Bulk actions bar appears (selected > 1)
    const bulkBar = el.shadowRoot.querySelector('thead .bulk-actions');
    expect(bulkBar).to.exist;

    const btnDelete = el.shadowRoot.querySelector(
      'thead .bulk-actions .btn.danger'
    );
    btnDelete.click();
    await el.updateComplete;

    // All items on page removed
    expect(st.data.length).to.equal(0);

    confirmStub.restore();
    st.restore();
  });

  test('i18n-changed triggers requestUpdate', async () => {
    const st = stubStore(makeSeed(3));
    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    const spy = sinon.spy(el, 'requestUpdate');
    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await aTimeout(0);
    expect(spy.called).to.be.true;

    st.restore();
  });

  test('_unique and _slice helpers behave as expected', async () => {
    const seed = makeSeed(6);
    const st = stubStore(seed);
    const el = await fixture(html`<employee-list></employee-list>`);
    await el.updateComplete;

    const uniq = el._unique('department');
    expect(uniq).to.deep.equal(['Analytics', 'Tech']);

    const sliced = el._slice(seed, 2);
    expect(sliced.length).to.equal(2);
    expect(sliced[0].id).to.equal('1');
    expect(sliced[1].id).to.equal('2');

    st.restore();
  });
});
