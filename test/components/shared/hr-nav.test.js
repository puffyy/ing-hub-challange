// test/components/shared/hr-nav.test.js
import {aTimeout, expect, fixture, html} from '@open-wc/testing';
import sinon from 'sinon';

/** Stub fetch for CSS + i18n dictionaries. Install BEFORE importing the element. */
function stubFetchI18nAndCss() {
  const okText = (text) => ({
    ok: true,
    status: 200,
    text: async () => text,
    json: async () => {
      try {
        return JSON.parse(text);
      } catch {
        return {};
      }
    },
  });

  const okJson = (obj) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(obj),
    json: async () => obj,
  });

  return sinon.stub(window, 'fetch').callsFake(async (input) => {
    const url = String(input);

    // i18n dictionaries (adjust keys to your loader if needed)
    if (url.endsWith('en.json')) return okJson({nav: {employees: 'Employees'}});
    if (url.endsWith('tr.json'))
      return okJson({nav: {employees: 'Çalışanlar'}});

    // any CSS loaded by adoptCss()
    if (url.endsWith('.css')) return okText('/* test css */');

    // default fallthrough for incidental fetches
    return okText('');
  });
}

suite('<hr-nav>', () => {
  let fetchStub;
  let origPath;
  let loaded = false;

  setup(async () => {
    // deterministic starting language
    document.documentElement.lang = 'en';

    // stub network BEFORE module import (i18n + CSS can load on import/firstUpdated)
    fetchStub = stubFetchI18nAndCss();

    // Import the component using an absolute URL resolved from THIS test file.
    // From test/components/shared/ → up 3 levels → src/components/shared/hr-nav.js
    if (!loaded) {
      loaded = true;
      const modUrl = new URL(
        '../../../src/components/shared/hr-nav.js',
        import.meta.url
      ).href;
      await import(modUrl);
    }

    // capture current path to restore later
    origPath = window.location.pathname;
  });

  teardown(() => {
    sinon.restore();
    window.history.pushState({}, '', origPath);
  });

  async function waitI18nTick() {
    // MutationObserver → callback → event → component listener → update cycle
    await aTimeout(0);
  }

  test('renders brand/link structure and adopts CSS', async () => {
    const el = await fixture(html`<hr-nav></hr-nav>`);
    await el.updateComplete;
    await aTimeout(0); // flush microtasks

    // CSS and/or i18n files were fetched
    expect(fetchStub.called).to.be.true;

    const brand = el.shadowRoot.querySelector('a.brand');
    expect(brand).to.exist;
    expect(brand.getAttribute('href')).to.equal('/employees');
    expect(brand.textContent.trim()).to.equal('Lit HR');

    const employeesLink = el.shadowRoot.querySelector(
      '.links a[href="/employees"]'
    );
    expect(employeesLink).to.exist;
    // English by default
    expect(employeesLink.textContent.trim()).to.equal('Employees');

    const langSelect = el.shadowRoot.querySelector(
      'select[aria-label="Language"]'
    );
    expect(langSelect).to.exist;
    const opts = [...langSelect.querySelectorAll('option')].map((o) => o.value);
    expect(opts).to.include.members(['en', 'tr']);
  });

  test('reacts to global i18n-changed (external change)', async () => {
    const el = await fixture(html`<hr-nav></hr-nav>`);
    await el.updateComplete;

    // external change -> TR
    document.documentElement.setAttribute('lang', 'tr');
    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await el.updateComplete;
    await aTimeout(0);
    expect(el.lang?.toLowerCase().startsWith('tr')).to.be.true;

    // back to EN
    document.documentElement.setAttribute('lang', 'en');
    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await el.updateComplete;
    await aTimeout(0);
    expect(el.lang?.toLowerCase().startsWith('en')).to.be.true;
  });

  test('language select changes documentElement.lang and re-renders translations', async () => {
    const el = await fixture(html`<hr-nav></hr-nav>`);
    await el.updateComplete;

    const select = el.shadowRoot.querySelector('select[aria-label="Language"]');
    expect(select).to.exist;

    // EN → TR
    select.value = 'tr';
    select.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
    await waitI18nTick();
    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await el.updateComplete;

    expect(document.documentElement.lang).to.equal('tr');
    expect(el.lang).to.equal('tr');
    const trLink = el.shadowRoot.querySelector('.links a[href="/employees"]');
    expect(trLink.textContent.trim()).to.equal('Çalışanlar');

    // TR → EN
    select.value = 'en';
    select.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
    await waitI18nTick();
    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await el.updateComplete;

    expect(document.documentElement.lang).to.equal('en');
    expect(el.lang).to.equal('en');
    const enLink = el.shadowRoot.querySelector('.links a[href="/employees"]');
    expect(enLink.textContent.trim()).to.equal('Employees');
  });

  test('ignores empty selection (no lang change)', async () => {
    const el = await fixture(html`<hr-nav></hr-nav>`);
    await el.updateComplete;

    const select = el.shadowRoot.querySelector('select[aria-label="Language"]');
    expect(select).to.exist;

    const before = el.lang;

    // simulate an empty/invalid selection
    select.value = '';
    select.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
    await el.updateComplete;
    await aTimeout(0);

    expect(el.lang).to.equal(before);
  });

  test('adds and removes i18n-changed listener on connect/disconnect', async () => {
    const addSpy = sinon.spy(window, 'addEventListener');
    const removeSpy = sinon.spy(window, 'removeEventListener');

    const el = await fixture(html`<hr-nav></hr-nav>`);
    await el.updateComplete;
    await aTimeout(0);

    expect(addSpy.calledWith('i18n-changed', sinon.match.func)).to.be.true;

    el.remove();
    await aTimeout(0);
    expect(removeSpy.calledWith('i18n-changed', sinon.match.func)).to.be.true;

    addSpy.restore();
    removeSpy.restore();
  });
});
