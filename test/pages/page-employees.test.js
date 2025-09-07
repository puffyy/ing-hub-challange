/**
 * page-employees.test.js
 * Tests for <page-employees>
 */
import {expect, fixture, html} from '@open-wc/testing';
import sinon from 'sinon';

// ---- Stub fetch for i18n + CSS before importing modules ----
const fetchStub = sinon.stub(window, 'fetch').callsFake(async (input) => {
  const url = String(input);
  // Stub for English i18n
  if (url.includes('/i18n/en.json')) {
    return new Response(JSON.stringify({}), {status: 200});
  }
  // Stub for Turkish i18n
  if (url.includes('/i18n/tr.json')) {
    return new Response(JSON.stringify({}), {status: 200});
  }
  // Stub for CSS files
  if (url.endsWith('.css')) {
    return new Response('/* test css */', {status: 200});
  }
  return new Response('', {status: 200});
});

// Import the dependencies which might load CSS internally
await import('../../src/components/employee-list.js');
// Import the page AFTER fetch is stubbed
await import('../../src/pages/page-employees.js');

suite('<page-employees>', () => {
  teardown(() => {
    // Restore all stubs/mocks, then keep fetch stub in place for the next test file
    sinon.restore();
    sinon.stub(window, 'fetch').callsFake(fetchStub.wrappedMethod);
  });

  test('renders <employee-list> in light DOM (no shadow root)', async () => {
    const el = await fixture(html`<page-employees></page-employees>`);
    await (el.updateComplete ?? Promise.resolve());

    // Assert no shadow root exists (light DOM)
    expect(el.shadowRoot).to.equal(null);

    // Assert child component is present in light DOM
    const list = el.querySelector('employee-list');
    expect(list).to.exist;
  });

  test('re-renders without creating shadow root on subsequent updates', async () => {
    const el = await fixture(html`<page-employees></page-employees>`);
    await (el.updateComplete ?? Promise.resolve());

    // Force an update and verify it is still light DOM
    el.requestUpdate();
    await (el.updateComplete ?? Promise.resolve());
    expect(el.shadowRoot).to.equal(null);

    // Assert the list element is still present
    expect(el.querySelector('employee-list')).to.exist;
  });
});
