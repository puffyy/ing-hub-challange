// test/components/shared/hr-header.test.js
import {aTimeout, expect, fixture, html} from '@open-wc/testing';
import sinon from 'sinon';

/** Minimal fetch stub for CSS/i18n */
function stubFetchCss() {
  return sinon.stub(window, 'fetch').callsFake(async () => ({
    ok: true,
    status: 200,
    // adoptCss() will call .text(); if some util uses .json(), this covers it too
    text: async () => '/* test css */',
    json: async () => ({}),
  }));
}

suite('<hr-header>', () => {
  let fetchStub;
  let originalPath;
  let loaded = false;

  setup(async () => {
    fetchStub = stubFetchCss();
    originalPath = window.location.pathname;

    // Load the component once, using an absolute URL so base paths don't matter
    if (!loaded) {
      loaded = true;
      const modUrl = new URL(
        '../../../src/components/shared/hr-header.js',
        import.meta.url
      ).href;
      await import(modUrl);
    }
  });

  teardown(() => {
    sinon.restore();
    // Reset path to avoid cross-test interference
    window.history.pushState({}, '', originalPath);
  });

  async function setLang(code) {
    document.documentElement.setAttribute('lang', code);
    // give i18n MutationObserver / listeners a tick
    await aTimeout(0);
    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await aTimeout(0);
  }

  test('renders, adopts CSS, and exposes correct links/labels', async () => {
    const el = await fixture(html`<hr-header></hr-header>`);
    await el.updateComplete;
    await aTimeout(0); // allow firstUpdated microtasks to flush

    // adoptCss should have fetched once for the CSS file
    expect(fetchStub.called).to.be.true;

    const brand = el.shadowRoot.querySelector('a.brand');
    expect(brand).to.exist;
    expect(brand.getAttribute('href')).to.equal('/employees');
    expect(brand.getAttribute('aria-label')).to.equal('Home');

    const linkEmployees = el.shadowRoot.querySelector('.links a.link');
    expect(linkEmployees).to.exist;
    expect(linkEmployees.getAttribute('href')).to.equal('/employees');

    const linkAdd = el.shadowRoot.querySelector('.links a.add');
    expect(linkAdd).to.exist;
    expect(linkAdd.getAttribute('href')).to.equal('/employees/new');

    const langBtn = el.shadowRoot.querySelector('button.lang');
    expect(langBtn).to.exist;
    const img = langBtn.querySelector('img');
    expect(img).to.exist;
    expect(['English', 'Türkçe']).to.include(img.getAttribute('alt'));
  });

  test('active link highlights on /employees and nested paths', async () => {
    window.history.pushState({}, '', '/employees');
    const el1 = await fixture(html`<hr-header></hr-header>`);
    await el1.updateComplete;
    await aTimeout(0);

    const link1 = el1.shadowRoot.querySelector(
      '.links a.link[href="/employees"]'
    );
    expect(link1.classList.contains('active')).to.be.true;

    window.history.pushState({}, '', '/employees/123');
    const el2 = await fixture(html`<hr-header></hr-header>`);
    await el2.updateComplete;
    await aTimeout(0);

    const link2 = el2.shadowRoot.querySelector(
      '.links a.link[href="/employees"]'
    );
    expect(link2.classList.contains('active')).to.be.true;
  });

  test('language toggle: switches document lang and updates component lang on i18n-changed', async () => {
    await setLang('en');
    const el = await fixture(html`<hr-header></hr-header>`);
    await el.updateComplete;
    await aTimeout(0);

    const langBtn = el.shadowRoot.querySelector('button.lang');
    langBtn.click();

    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await el.updateComplete;
    await aTimeout(0);

    expect(document.documentElement.lang.toLowerCase().startsWith('tr')).to.be
      .true;
    expect(el.lang.toLowerCase().startsWith('tr')).to.be.true;
    expect(
      el.shadowRoot.querySelector('button.lang img').getAttribute('alt')
    ).to.equal('Türkçe');

    langBtn.click();
    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await el.updateComplete;
    await aTimeout(0);

    expect(document.documentElement.lang.toLowerCase().startsWith('en')).to.be
      .true;
    expect(el.lang.toLowerCase().startsWith('en')).to.be.true;
    expect(
      el.shadowRoot.querySelector('button.lang img').getAttribute('alt')
    ).to.equal('English');
  });

  test('language toggle does not throw if localStorage.setItem is blocked', async () => {
    const setItemStub = sinon
      .stub(window.localStorage, 'setItem')
      .callsFake(() => {
        throw new Error('quota or blocked');
      });

    await setLang('en');
    const el = await fixture(html`<hr-header></hr-header>`);
    await el.updateComplete;
    await aTimeout(0);

    const langBtn = el.shadowRoot.querySelector('button.lang');
    expect(() => langBtn.click()).to.not.throw();

    window.dispatchEvent(new CustomEvent('i18n-changed'));
    await el.updateComplete;
    await aTimeout(0);
    expect(el.lang.toLowerCase().startsWith('tr')).to.be.true;

    setItemStub.restore();
  });

  test('adds and removes i18n-changed listener on connect/disconnect', async () => {
    const addSpy = sinon.spy(window, 'addEventListener');
    const removeSpy = sinon.spy(window, 'removeEventListener');

    const el = await fixture(html`<hr-header></hr-header>`);
    await el.updateComplete;
    await aTimeout(0);

    expect(addSpy.calledWith('i18n-changed', sinon.match.func)).to.be.true;

    el.remove();
    await aTimeout(0);
    expect(removeSpy.calledWith('i18n-changed', sinon.match.func)).to.be.true;

    addSpy.restore();
    removeSpy.restore();
  });

  test('updates lang when external i18n-changed fires (without clicking button)', async () => {
    await setLang('en');
    const el = await fixture(html`<hr-header></hr-header>`);
    await el.updateComplete;
    await aTimeout(0);

    await setLang('tr');
    await el.updateComplete;
    await aTimeout(0);
    expect(el.lang.toLowerCase().startsWith('tr')).to.be.true;

    await setLang('en');
    await el.updateComplete;
    await aTimeout(0);
    expect(el.lang.toLowerCase().startsWith('en')).to.be.true;
  });
});
