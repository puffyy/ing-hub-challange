// Import necessary testing utilities and libraries
import {expect, fixture, html, oneEvent} from '@open-wc/testing';
import sinon from 'sinon';

/** Stub fetch BEFORE importing the component so adoptCss() doesn't hit the network. */
function stubFetchCss() {
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
  return sinon.stub(window, 'fetch').callsFake(async (input) => {
    const url = String(input);
    if (url.endsWith('.css')) return okText('/* search-input css */'); // Stub CSS fetch
    return okText('{}'); // Default stub response
  });
}

// Helper function to query shadow DOM
const $ = (el, sel) => el.shadowRoot.querySelector(sel);

suite('<search-input>', () => {
  // eslint-disable-next-line no-unused-vars
  let fetchStub; // Stub for fetch
  let clock; // Fake clock for controlling time

  setup(async () => {
    fetchStub = stubFetchCss(); // Stub fetch for CSS
    clock = sinon.useFakeTimers(); // Use fake timers
    await import('../../../src/components/shared/search-input.js'); // Import component
  });

  teardown(() => {
    sinon.restore(); // Restore all stubs and spies
  });

  test('renders with defaults (placeholder, label, value)', async () => {
    const el = await fixture(html`<search-input></search-input>`);
    await el.updateComplete;

    const input = $(el, 'input[type="search"]');
    const label = $(el, '.visually-hidden');

    // Assert default values
    expect(input).to.exist;
    expect(label).to.exist;
    expect(input.placeholder).to.equal('Search…'); // note U+2026 ellipsis
    expect(label.textContent.trim()).to.equal('Search');
    expect(input.getAttribute('aria-label')).to.equal('Search');
    expect(input.value).to.equal('');
  });

  test('reflects provided value/placeholder/label props to input', async () => {
    const el = await fixture(
      html`<search-input
        .value=${'foo'}
        .placeholder=${'Find...'}
        .label=${'Find'}
      ></search-input>`
    );
    await el.updateComplete;

    const input = $(el, 'input');
    const label = $(el, '.visually-hidden');
    // Assert provided values are reflected
    expect(input.value).to.equal('foo');
    expect(input.placeholder).to.equal('Find...');
    expect(input.getAttribute('aria-label')).to.equal('Find');
    expect(label.textContent.trim()).to.equal('Find');
  });

  test('programmatic value change updates the rendered input', async () => {
    const el = await fixture(html`<search-input></search-input>`);
    el.value = 'bar'; // Change value programmatically
    await el.updateComplete;
    expect($(el, 'input').value).to.equal('bar'); // Assert updated value
  });

  test('emits "search-change" after debounce with latest value', async () => {
    const el = await fixture(
      html`<search-input .debounce=${250}></search-input>`
    );
    const input = $(el, 'input');

    // Type "a"
    input.value = 'a';
    input.dispatchEvent(
      new InputEvent('input', {bubbles: true, composed: true})
    );
    // Not yet
    let fired = false;
    el.addEventListener('search-change', () => (fired = true));
    await clock.tickAsync(249); // Wait less than debounce time
    expect(fired).to.be.false;

    // 1 more ms → fire
    const evP = oneEvent(el, 'search-change');
    await clock.tickAsync(1); // Advance time to trigger event
    const ev = await evP;
    expect(ev.detail.value).to.equal('a'); // Assert event details
    expect(ev.bubbles).to.be.true;
    expect(ev.composed).to.be.true;
  });

  test('debounce collapses multiple rapid inputs to a single event with the last value', async () => {
    const el = await fixture(
      html`<search-input .debounce=${200}></search-input>`
    );
    const input = $(el, 'input');

    // Burst typing: "a" -> "ab" -> "abc"
    input.value = 'a';
    input.dispatchEvent(
      new InputEvent('input', {bubbles: true, composed: true})
    );
    await clock.tickAsync(100);

    input.value = 'ab';
    input.dispatchEvent(
      new InputEvent('input', {bubbles: true, composed: true})
    );
    await clock.tickAsync(100);

    input.value = 'abc';
    input.dispatchEvent(
      new InputEvent('input', {bubbles: true, composed: true})
    );

    // Only one event should fire after full debounce from the LAST input
    const evP = oneEvent(el, 'search-change');
    await clock.tickAsync(200); // Wait for debounce time
    const ev = await evP;
    expect(ev.detail.value).to.equal('abc'); // Assert last value

    // Ensure no extra events later
    let extra = false;
    el.addEventListener('search-change', () => (extra = true));
    await clock.tickAsync(500); // Wait additional time
    expect(extra).to.be.false;
  });

  test('debounce=0 emits on next tick (setTimeout 0)', async () => {
    const el = await fixture(
      html`<search-input .debounce=${0}></search-input>`
    );
    const input = $(el, 'input');

    const evP = oneEvent(el, 'search-change');
    input.value = 'instant';
    input.dispatchEvent(
      new InputEvent('input', {bubbles: true, composed: true})
    );

    await clock.tickAsync(0); // Advance timers even for 0ms
    const ev = await evP;
    expect(ev.detail.value).to.equal('instant'); // Assert immediate event
  });

  test('changing debounce dynamically affects subsequent inputs', async () => {
    const el = await fixture(
      html`<search-input .debounce=${300}></search-input>`
    );
    const input = $(el, 'input');

    // First with 300ms
    input.value = 'first';
    input.dispatchEvent(
      new InputEvent('input', {bubbles: true, composed: true})
    );
    let evP = oneEvent(el, 'search-change');
    await clock.tickAsync(300); // Wait for initial debounce
    let ev = await evP;
    expect(ev.detail.value).to.equal('first');

    // Update debounce to 50ms
    el.debounce = 50;
    await el.updateComplete;

    input.value = 'second';
    input.dispatchEvent(
      new InputEvent('input', {bubbles: true, composed: true})
    );
    evP = oneEvent(el, 'search-change');
    await clock.tickAsync(50); // Wait for updated debounce
    ev = await evP;
    expect(ev.detail.value).to.equal('second');
  });

  test('event bubbles and is composed', async () => {
    const el = await fixture(
      html`<search-input .debounce=${10}></search-input>`
    );
    const input = $(el, 'input');

    const rootHandler = sinon.spy();
    document.body.addEventListener('search-change', rootHandler);

    const evP = oneEvent(el, 'search-change');
    input.value = 'x';
    input.dispatchEvent(
      new InputEvent('input', {bubbles: true, composed: true})
    );
    await clock.tickAsync(10); // Wait for debounce
    await evP;

    expect(rootHandler.called).to.be.true; // Assert event crossed shadow boundary
  });
});
