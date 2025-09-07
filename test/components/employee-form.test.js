/**
 * employee-form.test.js
 * Unit tests for <employee-form>
 */
import {aTimeout, expect, fixture, html, waitUntil} from '@open-wc/testing';
import sinon from 'sinon';

/* -----------------------------
 * 1) Stub fetch BEFORE imports
 * ----------------------------- */
function mockFetch(input) {
  const url = String(input);

  // Stub for English i18n dictionary
  if (url.endsWith('/i18n/en.json') || url.includes('/i18n/en.json')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
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
          form: {editing: 'You are editing', pleaseSelect: 'Please Select'},
          actions: {
            save: 'Save',
            cancel: 'Cancel',
            proceed: 'Proceed',
            close: 'Close',
          },
          confirm: {
            title: 'Are you sure?',
            updateMsg: 'Changes to {name} will be saved.',
          },
          errors: {
            required: '{label} is required.',
            name_length: '{label} must be {min}–{max} letters.',
            email_invalid: '{label} is not a valid email.',
            phone_invalid: '{label} is not a valid phone.',
            enum_invalid: '{label} must be one of {list}.',
            date_invalid: '{label} is invalid (YYYY-MM-DD).',
            date_future: '{label} cannot be in the future.',
            employment_after_birth: '{emp} must be after {birth}.',
            age_min: '{label} employee must be at least {minYears} years old.',
            uniqueEmail: 'Email must be unique.',
            unknown: 'Unknown error.',
          },
          nav: {employees: 'Employees', addNew: 'Add New'},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}}
      )
    );
  }

  // Stub for Turkish i18n dictionary
  if (url.endsWith('/i18n/tr.json') || url.includes('/i18n/tr.json')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
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
          form: {editing: 'Düzenliyorsunuz', pleaseSelect: 'Seçiniz'},
          actions: {
            save: 'Kaydet',
            cancel: 'İptal',
            proceed: 'Devam',
            close: 'Kapat',
          },
          confirm: {
            title: 'Emin misiniz?',
            updateMsg: '{name} için değişiklikler kaydedilecek.',
          },
          errors: {
            required: '{label} zorunludur.',
            name_length: '{label} {min}–{max} harf olmalı.',
            email_invalid: '{label} geçerli değil.',
            phone_invalid: '{label} geçerli değil.',
            enum_invalid: '{label} şunlardan biri olmalı: {list}.',
            date_invalid: '{label} geçersiz (YYYY-AA-GG).',
            date_future: '{label} gelecek bir tarih olamaz.',
            employment_after_birth: '{emp} {birth} tarihinden sonra olmalı.',
            age_min: '{label} en az {minYears} yaş olmalı.',
            uniqueEmail: 'E-posta benzersiz olmalı.',
            unknown: 'Bilinmeyen hata.',
          },
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}}
      )
    );
  }

  // Stub for employee-form CSS
  if (url.endsWith('employee-form.css')) {
    return Promise.resolve(
      new Response('/* employee-form css */', {status: 200})
    );
  }

  // Stub for generic CSS
  if (url.endsWith('.css')) {
    return Promise.resolve(new Response('/* generic css */', {status: 200}));
  }

  // Default OK response
  return Promise.resolve(new Response('', {status: 200}));
}
const fetchStub = sinon.stub(window, 'fetch').callsFake(mockFetch);

/* -----------------------------
 * 2) Import after fetch is stubbed
 * ----------------------------- */
const storeMod = await import('../../src/store/employees.store.js');
await import('../../src/components/employee-form.js');
const {EmployeeForm} = await import('../../src/components/employee-form.js');

/* -----------------------------
 * 3) Helpers
 * ----------------------------- */
function fillForm(el, vals) {
  const q = (sel) => el.shadowRoot.querySelector(sel);
  // Fill form fields based on provided values
  if ('firstName' in vals) q('input[name="firstName"]').value = vals.firstName;
  if ('lastName' in vals) q('input[name="lastName"]').value = vals.lastName;
  if ('employmentDate' in vals)
    q('input[name="employmentDate"]').value = vals.employmentDate;
  if ('birthDate' in vals) q('input[name="birthDate"]').value = vals.birthDate;
  if ('phone' in vals) q('input[name="phone"]').value = vals.phone;
  if ('email' in vals) q('input[name="email"]').value = vals.email;
  if ('department' in vals)
    q('input[name="department"]').value = vals.department;
  if ('position' in vals) q('select[name="position"]').value = vals.position;
}

function stubStoreApi(overrides = {}) {
  // Stub store API with optional overrides
  const api = {
    byId: () => null,
    upsert: () => {},
    remove: () => {},
    all: () => [],
    ...overrides,
  };
  return sinon.stub(storeMod.employeesStore, 'getState').returns(api);
}

async function clickSubmit(el) {
  // Simulate form submission
  el.shadowRoot.querySelector('button[type="submit"]').click();
  await aTimeout(0);
  await el.updateComplete;
}

/* -----------------------------
 * 4) Tests
 * ----------------------------- */
suite('<employee-form>', () => {
  teardown(() => {
    sinon.restore(); // Restore all stubs and spies
    // Keep fetch stub alive for subsequent tests
    sinon.stub(window, 'fetch').callsFake(mockFetch);
  });

  test('renders in create mode (no editing note) and has buttons; CSS requested', async () => {
    const el = await fixture(html`<employee-form></employee-form>`);
    await aTimeout(0); // Allow firstUpdated to finish
    await el.updateComplete;

    // Assert no editing note is present
    expect(el.shadowRoot.querySelector('.editing-note')).to.be.null;

    // Assert buttons exist
    expect(el.shadowRoot.querySelector('.btn.primary')).to.exist;
    expect(el.shadowRoot.querySelector('.btn.outline')).to.exist;

    // Assert CSS was fetched
    const cssCall = fetchStub
      .getCalls()
      .some((c) => String(c.args[0]).includes('employee-form.css'));
    expect(cssCall).to.equal(true);
  });

  test('prefills fields when employeeId is set (edit mode)', async () => {
    const model = {
      id: 'e1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      employmentDate: '2010-01-02',
      birthDate: '1980-12-11',
      phone: '+90 555 000 00 00',
      email: 'ada@ing.com',
      department: 'Tech',
      position: 'Senior',
    };
    const getStateStub = stubStoreApi({
      byId: (id) => (id === 'e1' ? model : null),
    });

    const el = await fixture(
      html`<employee-form .employeeId=${'e1'}></employee-form>`
    );
    await el.updateComplete;

    const $ = (sel) => el.shadowRoot.querySelector(sel);

    // Wait until first name is prefilled
    await waitUntil(
      () => $('input[name="firstName"]').value === 'Ada',
      'Prefill did not complete in time',
      {timeout: 800}
    );

    // Assert prefilled values
    expect($('input[name="firstName"]').value).to.equal('Ada');
    expect($('input[name="lastName"]').value).to.equal('Lovelace');
    expect($('input[name="employmentDate"]').value).to.equal('2010-01-02');
    expect($('input[name="birthDate"]').value).to.equal('1980-12-11');
    expect($('input[name="phone"]').value).to.equal('+90 555 000 00 00');
    expect($('input[name="email"]').value).to.equal('ada@ing.com');
    expect($('input[name="department"]').value).to.equal('Tech');
    expect($('select[name="position"]').value).to.equal('Senior');

    // Assert editing note exists
    expect(el.shadowRoot.querySelector('.editing-note')).to.exist;

    getStateStub.restore();
  });

  test('shows formatted validation errors when validateImpl fails', async () => {
    const validateStub = sinon.stub(EmployeeForm, 'validateImpl').returns([
      {type: 'required', labelKey: 'emp.firstName'},
      {type: 'email_invalid', labelKey: 'emp.email'},
    ]);

    const el = await fixture(html`<employee-form></employee-form>`);
    await aTimeout(0);
    await el.updateComplete;

    await clickSubmit(el); // triggers _submit

    const items = el.shadowRoot.querySelectorAll('.errors li');
    expect(items.length).to.equal(2);
    expect(items[0].textContent).to.match(/First Name/i);

    validateStub.restore();
  });

  test('create flow: upsert gets normalized email and navigation is suppressed', async () => {
    sinon.stub(EmployeeForm, 'validateImpl').returns([]);

    const upsertSpy = sinon.spy();
    const getStateStub = stubStoreApi({upsert: upsertSpy});

    const el = await fixture(html`<employee-form></employee-form>`);
    await aTimeout(0);
    await el.updateComplete;

    const cancelStub = sinon.stub(el, '_cancel'); // prevent navigation

    fillForm(el, {
      firstName: 'Jane',
      lastName: 'Doe',
      employmentDate: '2015-07-01',
      birthDate: '1990-05-02',
      phone: '+90 (555) 111 22 33',
      email: 'JANE.DOE@EXAMPLE.COM',
      department: 'Tech',
      position: 'Senior',
    });

    await clickSubmit(el);

    expect(upsertSpy.calledOnce).to.be.true;
    const dto = upsertSpy.firstCall.args[0];
    expect(dto.email).to.equal('jane.doe@example.com');
    expect(cancelStub.calledOnce).to.be.true;

    getStateStub.restore();
  });

  test('edit flow: confirmImpl resolves false → no upsert, no navigation', async () => {
    sinon.stub(EmployeeForm, 'validateImpl').returns([]);

    const upsertSpy = sinon.spy();
    const getStateStub = stubStoreApi({
      byId: () => ({
        id: 'e1',
        firstName: 'Old',
        lastName: 'Name',
        employmentDate: '2010-01-01',
        birthDate: '1980-01-01',
        phone: '+905551112233',
        email: 'old@example.com',
        department: 'Tech',
        position: 'Senior',
      }),
      upsert: upsertSpy,
    });

    const confirmStub = sinon.stub(EmployeeForm, 'confirmImpl').resolves(false);

    const el = await fixture(
      html`<employee-form .employeeId=${'e1'}></employee-form>`
    );
    await aTimeout(0);
    await el.updateComplete;

    const cancelStub = sinon.stub(el, '_cancel'); // prevent navigation

    fillForm(el, {
      firstName: 'New',
      lastName: 'Name',
      employmentDate: '2011-02-02',
      birthDate: '1980-01-01',
      phone: '+90 555 444 33 22',
      email: 'new@example.com',
      department: 'Tech',
      position: 'Senior',
    });

    await clickSubmit(el);

    expect(confirmStub.calledOnce).to.be.true;
    expect(upsertSpy.called).to.be.false;
    expect(cancelStub.called).to.be.false;

    getStateStub.restore();
  });

  test('edit flow: confirmImpl resolves true → upsert and cancel called; correct i18n keys', async () => {
    sinon.stub(EmployeeForm, 'validateImpl').returns([]);

    const upsertSpy = sinon.spy();
    const getStateStub = stubStoreApi({
      byId: () => ({
        id: 'e1',
        firstName: 'Old',
        lastName: 'Name',
        employmentDate: '2010-01-01',
        birthDate: '1980-01-01',
        phone: '+905551112233',
        email: 'old@example.com',
        department: 'Tech',
        position: 'Senior',
      }),
      upsert: upsertSpy,
    });

    const confirmStub = sinon.stub(EmployeeForm, 'confirmImpl').resolves(true);

    const el = await fixture(
      html`<employee-form .employeeId=${'e1'}></employee-form>`
    );
    await aTimeout(0);
    await el.updateComplete;

    const cancelStub = sinon.stub(el, '_cancel');

    fillForm(el, {
      firstName: 'Grace',
      lastName: 'Hopper',
      employmentDate: '2012-03-04',
      birthDate: '1980-01-01',
      phone: '+90 555 333 22 11',
      email: 'GRACE@EXAMPLE.COM',
      department: 'Tech',
      position: 'Senior',
    });

    await clickSubmit(el);

    const opts = confirmStub.firstCall.args[0] || {};
    expect(opts.titleKey).to.equal('confirm.title');
    expect(opts.messageKey).to.equal('confirm.updateMsg');
    expect(opts.messageParams).to.deep.equal({name: 'Grace Hopper'});
    expect(opts.confirmKey).to.equal('actions.proceed');
    expect(opts.cancelKey).to.equal('actions.cancel');

    expect(upsertSpy.calledOnce).to.be.true;
    expect(cancelStub.calledOnce).to.be.true;

    getStateStub.restore();
  });

  test('date wrappers call native showPicker() if available; focus fallback otherwise', async () => {
    const el = await fixture(html`<employee-form></employee-form>`);
    await el.updateComplete;

    // ---- Case A: showPicker exists -> should be called
    const empInput = el.shadowRoot.querySelector(
      'input[name="employmentDate"]'
    );
    const showPickerSpy = sinon.spy();
    empInput.showPicker = showPickerSpy;

    // Call the same path the click handler calls, but directly (more robust)
    el._openPicker('employmentDate');
    await aTimeout(0);
    expect(showPickerSpy.calledOnce).to.equal(true);

    // ---- Case B: no showPicker -> focus() should be called
    const birthInput = el.shadowRoot.querySelector('input[name="birthDate"]');
    delete birthInput.showPicker; // ensure it is not present
    const focusSpy = sinon.spy(birthInput, 'focus');

    el._openPicker('birthDate');
    await aTimeout(0);
    expect(focusSpy.calledOnce).to.equal(true);
  });

  test('reacts to i18n-changed by requesting an update', async () => {
    const el = await fixture(html`<employee-form></employee-form>`);
    await aTimeout(0);
    await el.updateComplete;

    const reqSpy = sinon.spy(el, 'requestUpdate');
    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await aTimeout(0);

    expect(reqSpy.called).to.be.true;
  });

  test('renders formatted error text using current language (formatErrors evaluated at render)', async () => {
    const el = await fixture(html`<employee-form></employee-form>`);
    await aTimeout(0);
    await el.updateComplete;

    el.errors = [{type: 'required', labelKey: 'emp.email'}];
    await el.updateComplete;

    // EN
    let item = el.shadowRoot.querySelector('.errors li');
    expect(item.textContent.trim()).to.equal('Email is required.');

    // Switch to TR and simulate i18n broadcast
    document.documentElement.lang = 'tr';
    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await aTimeout(0);
    await el.updateComplete;

    item = el.shadowRoot.querySelector('.errors li');
    expect(item.textContent.trim()).to.equal('E-posta zorunludur.');
  });
});
