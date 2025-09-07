/**
 * page-employee-edit.test.js
 * Tests for <page-employee-edit>
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

// Import the page AFTER fetch is stubbed so nested imports (employee-form) use it
await import('../../src/pages/page-employee-edit.js');

suite('<page-employee-edit>', () => {
  teardown(() => {
    // Fully restore and then re-apply the fetch stub so subsequent tests in this file
    // (or other files that run after) still load i18n/CSS without network.
    sinon.restore();
    sinon.stub(window, 'fetch').callsFake(fetchStub.wrappedMethod);
  });

  test('renders "Add Employee" when no id is provided', async () => {
    const el = await fixture(html`<page-employee-edit></page-employee-edit>`);
    await el.updateComplete;

    // Assert shadow DOM exists
    expect(el.shadowRoot).to.exist;

    const h2 = el.shadowRoot.querySelector('h2');
    // Assert heading text
    expect(h2).to.exist;
    expect(h2.textContent.trim()).to.equal('Add Employee');

    // Assert <employee-form> exists and receives empty id
    const form = el.shadowRoot.querySelector('employee-form');
    expect(form).to.exist;
    expect(form.employeeId || '').to.equal('');

    // Assert getters behave correctly
    expect(el.id).to.equal('');
    expect(el.isEdit).to.equal(false);
  });

  test('renders "Edit Employee" and passes id when location.params.id is set', async () => {
    const el = await fixture(html`<page-employee-edit></page-employee-edit>`);

    // Set location (Vaadin Router style) and trigger re-render
    el.location = {params: {id: '42'}};
    await el.updateComplete;

    const h2 = el.shadowRoot.querySelector('h2');
    // Assert heading text
    expect(h2.textContent.trim()).to.equal('Edit Employee');

    const form = el.shadowRoot.querySelector('employee-form');
    // Assert form receives correct id
    expect(form.employeeId).to.equal('42');

    // Assert getters behave correctly
    expect(el.id).to.equal('42');
    expect(el.isEdit).to.equal(true);
  });

  test('reacts when switching from edit -> add (heading and prop update)', async () => {
    const el = await fixture(html`<page-employee-edit></page-employee-edit>`);
    el.location = {params: {id: 'abc'}};
    await el.updateComplete;

    // Now switch to "add" by replacing the location object
    el.location = {params: {id: ''}};
    await el.updateComplete;

    const h2 = el.shadowRoot.querySelector('h2');
    // Assert heading text updates
    expect(h2.textContent.trim()).to.equal('Add Employee');

    const form = el.shadowRoot.querySelector('employee-form');
    // Assert form id is cleared
    expect(form.employeeId || '').to.equal('');

    // Assert getters behave correctly
    expect(el.id).to.equal('');
    expect(el.isEdit).to.equal(false);
  });

  test('id getter is resilient to missing nested properties', async () => {
    const el = await fixture(html`<page-employee-edit></page-employee-edit>`);
    // No location at all
    el.location = undefined;
    await el.updateComplete;
    // Assert id is empty
    expect(el.id).to.equal('');

    // location without params
    el.location = {};
    await el.updateComplete;
    // Assert id is empty
    expect(el.id).to.equal('');

    // location.params without id
    el.location = {params: {}};
    await el.updateComplete;
    // Assert id is empty
    expect(el.id).to.equal('');
  });
});
